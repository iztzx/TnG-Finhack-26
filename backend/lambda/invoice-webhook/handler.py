"""
AWS Lambda webhook receiver for Alibaba Cloud invoice data.

Architecture Flow (Phase 2 – Scoring):
  Alibaba Cloud POSTs a validated, AI-extracted invoice payload here.
  This function validates the payload via Pydantic, persists the invoice
  to DynamoDB with status SCORING_IN_PROGRESS, runs ML credit scoring,
  generates a financing Offer, and persists the Offer to the Offers table.

Enterprise standards:
  - aws-lambda-powertools for structured JSON logging
  - pydantic for strict request payload validation
  - Idempotent DynamoDB writes (PutItem with deterministic keys)
  - Explicit error boundaries with HTTP-appropriate status codes
"""

import json
import os
import uuid
import hashlib
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths
from pydantic import BaseModel, Field, ValidationError, field_validator

# ---------------------------------------------------------------------------
# Structured logger (aws-lambda-powertools)
# ---------------------------------------------------------------------------
logger = Logger(
    service="invoice-webhook",
    level=os.getenv("LOG_LEVEL", "INFO"),
)

# ---------------------------------------------------------------------------
# DynamoDB resource – table names injected via SAM environment variables
# ---------------------------------------------------------------------------
dynamodb = boto3.resource("dynamodb")
INVOICES_TABLE = os.environ["INVOICES_TABLE"]
OFFERS_TABLE = os.environ["OFFERS_TABLE"]
invoices_table = dynamodb.Table(INVOICES_TABLE)
offers_table = dynamodb.Table(OFFERS_TABLE)

# ---------------------------------------------------------------------------
# CORS headers shared across all responses
# ---------------------------------------------------------------------------
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


# ===================================================================
# DynamoDB type helper – boto3 requires Decimal instead of float
# ===================================================================

def _to_dynamo(item: dict) -> dict:
    """Recursively convert all float values in a dict to Decimal for DynamoDB."""
    converted = {}
    for key, value in item.items():
        if isinstance(value, float):
            converted[key] = Decimal(str(value))
        elif isinstance(value, dict):
            converted[key] = _to_dynamo(value)
        elif isinstance(value, list):
            converted[key] = [
                _to_dynamo(v) if isinstance(v, dict)
                else Decimal(str(v)) if isinstance(v, float)
                else v
                for v in value
            ]
        else:
            converted[key] = value
    return converted


# ===================================================================
# Pydantic models – strict payload validation
# ===================================================================

class ExtractedData(BaseModel):
    """AI-extracted invoice fields sent by Alibaba Cloud."""
    extractedAmount: float = Field(..., gt=0, description="Invoice total extracted by Document AI")
    currency: str = Field(..., min_length=3, max_length=3, description="ISO 4217 currency code")
    merchantName: str = Field("UNKNOWN_MERCHANT", min_length=1, description="Merchant / seller name")
    documentType: str = Field("UNKNOWN", min_length=1, description="Document type detected by AI")
    confidenceScore: float = Field(..., ge=0.0, le=1.0, description="AI extraction confidence 0-1")
    invoiceNumber: Optional[str] = None
    issueDate: Optional[str] = None
    dueDate: Optional[str] = None
    buyerName: Optional[str] = None
    sellerName: Optional[str] = None

    @field_validator("confidenceScore")
    @classmethod
    def normalize_confidence(cls, v: float) -> float:
        """AI models may return confidence as a percentage (0-100) instead of 0-1."""
        if v > 1.0:
            v = min(v / 100.0, 1.0)
        return v

    @field_validator("merchantName", mode="before")
    @classmethod
    def coerce_merchant_name(cls, v):
        """AI may return null for merchantName; replace with a safe default."""
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return "UNKNOWN_MERCHANT"
        return v

    @field_validator("documentType", mode="before")
    @classmethod
    def coerce_document_type(cls, v):
        """AI may return null for documentType; replace with a safe default."""
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return "UNKNOWN"
        return v

    @field_validator("currency")
    @classmethod
    def currency_upper(cls, v: str) -> str:
        return v.upper()


class AlibabaWebhookPayload(BaseModel):
    """
    Top-level payload contract from Alibaba Cloud Function Compute.
    Must match the JSON built in `post_to_aws_webhook()`.
    """
    invoiceId: str = Field(..., min_length=1, description="UUID assigned by Alibaba Cloud")
    userId: Optional[str] = Field(None, description="Authenticated SME user ID (email) for wallet crediting")
    amount: float = Field(..., gt=0, description="Invoice amount forwarded from extractedData")
    status: str = Field("PENDING_SCORING", description="Status flag from Alibaba Cloud")
    extractedData: ExtractedData
    timestamp: str = Field(..., min_length=1, description="ISO-8601 timestamp from Alibaba")
    source: str = Field("alibaba_cloud_model_studio", description="Origin identifier")
    shipmentNumber: Optional[str] = Field(None, description="Shipment tracking number for location verification")
    contactEmail: Optional[str] = Field(None, description="Contact email for receivables assignment notifications")

    @field_validator("status")
    @classmethod
    def status_must_be_pending(cls, v: str) -> str:
        expected = "PENDING_SCORING"
        if v != expected:
            raise ValueError(f"Expected status '{expected}', got '{v}'")
        return v


# ===================================================================
# ML scoring – attempt real model, fall back to heuristic
# ===================================================================

def _run_ml_scoring(payload: AlibabaWebhookPayload) -> dict:
    """
    Try to load and execute the trained credit_classifier.pkl and
    credit_regressor.pkl.  If loading fails (e.g. Lambda layer not
    attached, pickle missing), fall back to a deterministic heuristic
    so the end-to-end flow always works.
    """
    try:
        import joblib
        import numpy as np

        model_dir = os.environ.get("ML_MODEL_DIR", "/opt/python/ml/models")
        classifier_path = os.path.join(model_dir, "credit_classifier.pkl")
        regressor_path = os.path.join(model_dir, "credit_regressor.pkl")

        if not os.path.isfile(classifier_path) or not os.path.isfile(regressor_path):
            logger.warning("ML model artifacts not found, falling back to heuristic scorer")
            return _heuristic_score(payload)

        clf = joblib.load(classifier_path)
        reg = joblib.load(regressor_path)

        # Build feature vector from extracted data (best-effort mapping)
        ed = payload.extractedData
        feature_values = {
            "monthly_txn_volume": 50,
            "avg_txn_size": ed.extractedAmount,
            "business_tenure_months": 36,
            "tracking_reliability_pct": 95.0,
            "payment_consistency_score": ed.confidenceScore,
            "monthly_revenue": ed.extractedAmount * 2,
            "num_employees": 10,
            "industry_sector_fnb": 0.0,
            "industry_sector_logistics": 1.0,
            "industry_sector_manufacturing": 0.0,
            "industry_sector_retail": 0.0,
            "industry_sector_services": 0.0,
            "industry_sector_tech": 0.0,
        }

        # Load feature order from artifact
        feature_names_path = os.path.join(model_dir, "feature_names.json")
        if os.path.isfile(feature_names_path):
            with open(feature_names_path, "r") as f:
                feature_names = json.load(f)
        else:
            feature_names = list(feature_values.keys())

        row = np.array([[feature_values.get(n, 0.0) for n in feature_names]])

        # Classifier → approval probability → risk score
        prob = float(clf.predict_proba(row)[0][1])
        risk_score = int(np.clip(300 + prob * 550, 300, 850))

        # Regressor → credit limit
        credit_limit_raw = float(reg.predict(row)[0])
        approved_amount = int(np.clip(credit_limit_raw, 5000, 500000))

        risk_tier = "LOW" if risk_score >= 700 else ("MEDIUM" if risk_score >= 500 else "HIGH")

        logger.info("ML model scoring succeeded", extra={
            "riskScore": risk_score,
            "approvedAmount": approved_amount,
            "riskTier": risk_tier,
        })

        return {
            "riskScore": risk_score,
            "approvedAmount": approved_amount,
            "riskTier": risk_tier,
            "scoringMethod": "ml_model",
        }

    except Exception as exc:
        logger.warning("ML model execution failed, falling back to heuristic", extra={
            "error": str(exc),
        })
        return _heuristic_score(payload)


def _heuristic_score(payload: AlibabaWebhookPayload) -> dict:
    """
    Deterministic heuristic scorer that mimics ML model behaviour.
    Uses invoice data and a hash-seed for reproducible variance.
    """
    ed = payload.extractedData
    amount = payload.amount
    confidence = ed.confidenceScore

    # Deterministic seed from invoiceId
    seed = int(hashlib.md5(payload.invoiceId.encode()).hexdigest(), 16)
    rng = seed % 1000

    # Base score from business health indicators
    base = 300 + min(36 * 1.5, 200)           # tenure proxy
    base += confidence * 250                     # AI confidence as consistency proxy
    base += min(amount / 1000, 150)             # revenue proxy
    base += min(50, 50)                          # txn volume proxy
    base += (rng % 100) - 50                     # deterministic variance

    risk_score = int(max(300, min(850, base)))
    risk_tier = "LOW" if risk_score >= 700 else ("MEDIUM" if risk_score >= 500 else "HIGH")

    # Approved amount: 95% of invoice amount capped by credit limit proxy
    approved_amount = min(int(amount * 0.95), risk_score * 250)

    return {
        "riskScore": risk_score,
        "approvedAmount": approved_amount,
        "riskTier": risk_tier,
        "scoringMethod": "heuristic",
    }


# ===================================================================
# Offer generation
# ===================================================================

def _generate_offer(payload: AlibabaWebhookPayload, scoring: dict, sme_id: str) -> dict:
    """Build the financing offer record from scoring results."""
    offer_id = f"OFF-{uuid.uuid4().hex[:10].upper()}"
    amount = payload.amount
    risk_score = scoring["riskScore"]

    # Risk-based pricing
    base_rate = 0.02
    risk_premium = {"LOW": 0.01, "MEDIUM": 0.02, "HIGH": 0.03}[scoring["riskTier"]]
    total_fee_rate = base_rate + risk_premium

    advance_rate = 0.95
    offer_amount = round(amount * advance_rate, 2)
    factoring_fee = round(amount * total_fee_rate, 2)
    net_disbursement = round(offer_amount - factoring_fee, 2)

    ed = payload.extractedData
    estimated_repayment_date = ed.dueDate or "2026-05-15"

    return {
        "id": offer_id,
        "invoiceId": payload.invoiceId,
        "smeId": sme_id,
        "invoiceAmount": amount,
        "advanceRate": advance_rate,
        "offerAmount": offer_amount,
        "baseRate": base_rate,
        "riskPremium": risk_premium,
        "totalFeeRate": total_fee_rate,
        "factoringFee": factoring_fee,
        "netDisbursement": net_disbursement,
        "riskScore": risk_score,
        "riskTier": scoring["riskTier"],
        "approvedAmount": scoring["approvedAmount"],
        "scoringMethod": scoring["scoringMethod"],
        "estimatedRepaymentDate": estimated_repayment_date,
        "offerStatus": "PENDING_ACCEPTANCE",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


# ===================================================================
# Response helpers
# ===================================================================

def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def _bad_request(detail: str, errors: Optional[list] = None) -> dict:
    resp = {"error": "Bad Request", "detail": detail}
    if errors:
        resp["validationErrors"] = errors
    return _response(400, resp)


def _internal_error(detail: str) -> dict:
    return _response(500, {"error": "Internal Server Error", "detail": detail})


# ===================================================================
# Lambda handler
# ===================================================================

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
def handler(event, context):
    """
    AWS Lambda webhook receiver for Alibaba Cloud invoice data.

    Expected API Gateway event: POST /api/webhook/invoice-parsed
    """
    # Handle CORS preflight
    if event.get("httpMethod", "") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    request_id = context.aws_request_id if context else str(uuid.uuid4())
    logger.append_keys(request_id=request_id)

    # ------------------------------------------------------------------
    # 1. Parse & validate payload via Pydantic
    # ------------------------------------------------------------------
    try:
        raw_body = event.get("body", "{}") or "{}"
        body = json.loads(raw_body)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("Failed to parse request body", extra={"error": str(exc)})
        return _bad_request("Invalid JSON in request body")

    try:
        payload = AlibabaWebhookPayload(**body)
    except ValidationError as exc:
        error_details = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        logger.error("Payload validation failed", extra={"validationErrors": error_details})
        return _bad_request("Payload validation failed", errors=error_details)

    logger.info("Payload validated", extra={
        "invoiceId": payload.invoiceId,
        "amount": payload.amount,
        "source": payload.source,
    })

    # ------------------------------------------------------------------
    # 2. Save invoice to DynamoDB (status: SCORING_IN_PROGRESS)
    # ------------------------------------------------------------------
    now_utc = datetime.now(timezone.utc).isoformat()

    sme_id = payload.userId or payload.extractedData.merchantName

    invoice_item = {
        "id": payload.invoiceId,
        "smeId": sme_id,
        "amount": payload.amount,
        "currency": payload.extractedData.currency,
        "status": "SCORING_IN_PROGRESS",
        "extractedData": payload.extractedData.model_dump(mode="json"),
        "source": payload.source,
        "alibabaTimestamp": payload.timestamp,
        "createdAt": now_utc,
        "updatedAt": now_utc,
    }
    if payload.shipmentNumber:
        invoice_item["shipmentNumber"] = payload.shipmentNumber
    if payload.contactEmail:
        invoice_item["contactEmail"] = payload.contactEmail

    try:
        invoices_table.put_item(
            Item=_to_dynamo(invoice_item),
            ConditionExpression="attribute_not_exists(id)",
        )
    except Exception as exc:
        logger.error("Failed to save invoice to DynamoDB", extra={
            "invoiceId": payload.invoiceId,
            "error": str(exc),
        })
        return _internal_error("Failed to persist invoice")

    logger.info("Invoice saved", extra={
        "invoiceId": payload.invoiceId,
        "status": "SCORING_IN_PROGRESS",
    })

    # ------------------------------------------------------------------
    # 3. Run ML scoring
    # ------------------------------------------------------------------
    scoring = _run_ml_scoring(payload)

    # ------------------------------------------------------------------
    # 4. Generate & persist financing offer
    # ------------------------------------------------------------------
    offer = _generate_offer(payload, scoring, sme_id)

    try:
        offers_table.put_item(Item=_to_dynamo(offer))
    except Exception as exc:
        logger.error("Failed to save offer to DynamoDB", extra={
            "offerId": offer["id"],
            "invoiceId": payload.invoiceId,
            "error": str(exc),
        })
        return _internal_error("Failed to persist offer")

    logger.info("Offer generated", extra={
        "offerId": offer["id"],
        "invoiceId": payload.invoiceId,
        "riskScore": scoring["riskScore"],
        "approvedAmount": scoring["approvedAmount"],
        "riskTier": scoring["riskTier"],
    })

    # ------------------------------------------------------------------
    # 5. Update invoice status to reflect completed scoring
    # ------------------------------------------------------------------
    try:
        invoices_table.update_item(
            Key={"id": payload.invoiceId},
            UpdateExpression="SET #st = :st, riskScore = :rs, riskTier = :rt, offerId = :oid, updatedAt = :ua",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={
                ":st": "OFFER_GENERATED",
                ":rs": scoring["riskScore"],
                ":rt": scoring["riskTier"],
                ":oid": offer["id"],
                ":ua": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as exc:
        # Non-fatal: the offer was already saved; log and continue
        logger.warning("Failed to update invoice status after scoring", extra={
            "invoiceId": payload.invoiceId,
            "error": str(exc),
        })

    # ------------------------------------------------------------------
    # 6. Return success response
    # ------------------------------------------------------------------
    return _response(200, {
        "invoiceId": payload.invoiceId,
        "amount": payload.amount,
        "status": "OFFER_GENERATED",
        "offer": {
            "offerId": offer["id"],
            "riskScore": scoring["riskScore"],
            "riskTier": scoring["riskTier"],
            "approvedAmount": scoring["approvedAmount"],
            "offerAmount": offer["offerAmount"],
            "netDisbursement": offer["netDisbursement"],
            "factoringFee": offer["factoringFee"],
            "totalFeeRate": offer["totalFeeRate"],
            "estimatedRepaymentDate": offer["estimatedRepaymentDate"],
            "offerStatus": offer["offerStatus"],
            "scoringMethod": scoring["scoringMethod"],
        },
    })
