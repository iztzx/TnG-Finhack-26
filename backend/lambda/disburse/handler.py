"""
AWS Lambda handler for the Disbursement API (Phase 3 – Disbursement).

Enterprise-grade disbursement flow:
  1. Validate input via Pydantic (offerId required).
  2. Retrieve offer from DynamoDB.
  3. Idempotency check – reject double-disbursement with 409 Conflict.
  4. Atomic status transition from PENDING_ACCEPTANCE → ACCEPTED.
  5. Simulate external DuitNow/TNG payment gateway latency.
  6. Write transaction ledger record.
  7. Atomically update the SME's walletBalance via DynamoDB ADD expression.

Standards:
  - aws-lambda-powertools for structured JSON logging
  - pydantic for strict request payload validation
  - Idempotent writes with conditional status checks
  - Atomic wallet balance increments
"""

import json
import os
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional

from botocore.exceptions import ClientError

import boto3
from boto3.dynamodb.conditions import Attr
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths
from pydantic import BaseModel, Field, ValidationError

# ---------------------------------------------------------------------------
# Structured logger
# ---------------------------------------------------------------------------
logger = Logger(
    service="disburse",
    level=os.getenv("LOG_LEVEL", "INFO"),
)

# ---------------------------------------------------------------------------
# DynamoDB – table names injected via SAM environment variables
# ---------------------------------------------------------------------------
dynamodb = boto3.resource("dynamodb")
OFFERS_TABLE = os.environ["OFFERS_TABLE"]
USERS_TABLE = os.environ["USERS_TABLE"]
INVOICES_TABLE = os.environ["INVOICES_TABLE"]
TRANSACTIONS_TABLE = os.environ["TRANSACTIONS_TABLE"]

offers_table = dynamodb.Table(OFFERS_TABLE)
users_table = dynamodb.Table(USERS_TABLE)
invoices_table = dynamodb.Table(INVOICES_TABLE)
transactions_table = dynamodb.Table(TRANSACTIONS_TABLE)

# ---------------------------------------------------------------------------
# CORS headers
# ---------------------------------------------------------------------------
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}

# ---------------------------------------------------------------------------
# Simulated DuitNow / TNG payment gateway latency (seconds)
# ---------------------------------------------------------------------------
MOCK_PAYMENT_GATEWAY_DELAY = float(os.getenv("MOCK_PAYMENT_GATEWAY_DELAY", "1.5"))


# ===================================================================
# Pydantic model – strict input validation
# ===================================================================

class DisburseRequest(BaseModel):
    """Request body for the disbursement endpoint."""
    offerId: str = Field(..., min_length=1, description="The Offer ID to accept and disburse")
    userId: Optional[str] = Field(None, description="Optional SME user ID for wallet lookup")


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


def _conflict(detail: str) -> dict:
    return _response(409, {"error": "Conflict", "detail": detail})


def _reverse_ledger(transaction_id: str) -> None:
    """Reverse a ledger entry by marking it as REVERSED."""
    try:
        transactions_table.update_item(
            Key={"id": transaction_id},
            UpdateExpression="SET #st = :st, updatedAt = :ua",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={
                ":st": "REVERSED",
                ":ua": datetime.now(timezone.utc).isoformat(),
            },
        )
        logger.info("Ledger entry reversed", extra={"transactionId": transaction_id})
    except Exception as exc:
        logger.critical("Failed to reverse ledger entry – manual reconciliation required", extra={
            "transactionId": transaction_id,
            "error": str(exc),
        })


def _rollback_offer(offer_id: str, reason: str, transaction_id: Optional[str] = None) -> None:
    """Roll back offer status to DISBURSEMENT_FAILED so the request can be retried."""
    if transaction_id:
        _reverse_ledger(transaction_id)
    try:
        offers_table.update_item(
            Key={"id": offer_id},
            UpdateExpression="SET #st = :st, updatedAt = :ua REMOVE acceptedAt",
            ConditionExpression=Attr("offerStatus").eq("ACCEPTED"),
            ExpressionAttributeNames={"#st": "offerStatus"},
            ExpressionAttributeValues={
                ":st": "DISBURSEMENT_FAILED",
                ":ua": datetime.now(timezone.utc).isoformat(),
            },
        )
        logger.warning("Offer rolled back after disbursement failure", extra={
            "offerId": offer_id,
            "reason": reason,
        })
    except ClientError as rollback_exc:
        if rollback_exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.error("Rollback failed – offer no longer in ACCEPTED state", extra={
                "offerId": offer_id,
                "reason": reason,
                "currentState": "unknown (concurrent modification)",
            })
        else:
            logger.critical("Rollback failed – manual reconciliation required", extra={
                "offerId": offer_id,
                "reason": reason,
                "rollbackError": str(rollback_exc),
            })
    except Exception as rollback_exc:
        logger.critical("Rollback failed – manual reconciliation required", extra={
            "offerId": offer_id,
            "reason": reason,
            "rollbackError": str(rollback_exc),
        })


def _not_found(resource: str, resource_id: str) -> dict:
    return _response(404, {"error": "Not Found", "detail": f"{resource} '{resource_id}' not found"})


def _internal_error(detail: str) -> dict:
    return _response(500, {"error": "Internal Server Error", "detail": detail})


# ===================================================================
# Lambda handler
# ===================================================================

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
def handler(event, context):
    """
    POST /api/disburse

    Accepts an offer, performs idempotency check, simulates external
    payment gateway, writes ledger, and updates wallet balance.
    """
    # Handle CORS preflight
    if event.get("httpMethod", "") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    request_id = context.aws_request_id if context else str(uuid.uuid4())
    logger.append_keys(request_id=request_id)

    # ------------------------------------------------------------------
    # 1. Parse & validate request body via Pydantic
    # ------------------------------------------------------------------
    try:
        raw_body = event.get("body", "{}") or "{}"
        body = json.loads(raw_body)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("Failed to parse request body", extra={"error": str(exc)})
        return _bad_request("Invalid JSON in request body")

    try:
        request = DisburseRequest(**body)
    except ValidationError as exc:
        error_details = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        logger.error("Payload validation failed", extra={"validationErrors": error_details})
        return _bad_request("Payload validation failed", errors=error_details)

    logger.info("Payload validated", extra={"offerId": request.offerId})

    # ------------------------------------------------------------------
    # 2. Retrieve offer from DynamoDB
    # ------------------------------------------------------------------
    try:
        offer_response = offers_table.get_item(Key={"id": request.offerId})
    except Exception as exc:
        logger.error("Failed to retrieve offer from DynamoDB", extra={
            "offerId": request.offerId,
            "error": str(exc),
        })
        return _internal_error("Failed to retrieve offer")

    offer = offer_response.get("Item")
    if not offer:
        logger.warning("Offer not found", extra={"offerId": request.offerId})
        return _not_found("Offer", request.offerId)

    offer_status = offer.get("offerStatus", "UNKNOWN")
    sme_id = offer.get("smeId") or request.userId
    invoice_id = offer.get("invoiceId")  # None if absent – validated below

    # Validate sme_id before any mutation
    if not sme_id:
        logger.error("Cannot disburse: no smeId on offer and no userId in request", extra={
            "offerId": request.offerId,
        })
        return _bad_request("Cannot disburse: offer has no associated SME ID")

    # Verify the SME user actually exists in the Users table
    try:
        user_check = users_table.get_item(Key={"id": sme_id})
        if "Item" not in user_check:
            logger.error("Cannot disburse: SME user not found in Users table", extra={
                "offerId": request.offerId,
                "smeId": sme_id,
            })
            return _not_found("User", sme_id)
    except Exception as exc:
        logger.error("Failed to verify SME user existence", extra={
            "offerId": request.offerId,
            "smeId": sme_id,
            "error": str(exc),
        })
        return _internal_error("Failed to verify SME user")

    # Validate netDisbursement exists and is positive (use Decimal for precision)
    raw_disbursement = offer.get("netDisbursement")
    if raw_disbursement is None:
        logger.error("Offer has no netDisbursement field", extra={"offerId": request.offerId})
        return _bad_request("Offer has no disbursement amount")
    try:
        net_disbursement = Decimal(str(raw_disbursement))
    except (InvalidOperation, ValueError):
        logger.error("Offer netDisbursement is not a valid number", extra={
            "offerId": request.offerId,
            "rawDisbursement": str(raw_disbursement),
        })
        return _bad_request("Offer has an invalid disbursement amount")
    if net_disbursement <= 0:
        logger.error("Offer netDisbursement is zero or negative", extra={
            "offerId": request.offerId,
            "netDisbursement": str(net_disbursement),
        })
        return _bad_request("Offer disbursement amount must be positive")

    logger.info("Offer retrieved", extra={
        "offerId": request.offerId,
        "offerStatus": offer_status,
        "smeId": sme_id,
        "netDisbursement": str(net_disbursement),
    })

    # ------------------------------------------------------------------
    # 3. Idempotency check – reject double-disbursement
    # ------------------------------------------------------------------
    if offer_status == "ACCEPTED":
        logger.warning("Duplicate disbursement attempt", extra={
            "offerId": request.offerId,
            "offerStatus": offer_status,
        })
        return _conflict(
            f"Offer '{request.offerId}' has already been accepted and disbursed. "
            "Duplicate disbursement is not permitted."
        )

    if offer_status != "PENDING_ACCEPTANCE":
        logger.warning("Offer not in disburseable state", extra={
            "offerId": request.offerId,
            "offerStatus": offer_status,
        })
        return _conflict(
            f"Offer '{request.offerId}' is in status '{offer_status}' and cannot be disbursed. "
            "Only offers with status 'PENDING_ACCEPTANCE' can be accepted."
        )

    # ------------------------------------------------------------------
    # 4. Atomic status transition: PENDING_ACCEPTANCE → ACCEPTED
    #    Uses ConditionExpression to prevent race conditions.
    # ------------------------------------------------------------------
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        offers_table.update_item(
            Key={"id": request.offerId},
            UpdateExpression="SET #st = :st, acceptedAt = :aa, updatedAt = :ua",
            ConditionExpression=Attr("offerStatus").eq("PENDING_ACCEPTANCE"),
            ExpressionAttributeNames={"#st": "offerStatus"},
            ExpressionAttributeValues={
                ":st": "ACCEPTED",
                ":aa": now_utc,
                ":ua": now_utc,
            },
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning("Concurrent disbursement race condition detected", extra={
                "offerId": request.offerId,
            })
            return _conflict(
                f"Offer '{request.offerId}' was concurrently modified. "
                "Please retry the request."
            )
        logger.error("Failed to update offer status", extra={
            "offerId": request.offerId,
            "error": str(exc),
        })
        return _internal_error("Failed to update offer status")
    except Exception as exc:
        logger.error("Failed to update offer status", extra={
            "offerId": request.offerId,
            "error": str(exc),
        })
        return _internal_error("Failed to update offer status")

    logger.info("Offer status updated", extra={
        "offerId": request.offerId,
        "offerStatus": "ACCEPTED",
    })

    # ------------------------------------------------------------------
    # 5. Simulate external DuitNow / TNG payment gateway
    # ------------------------------------------------------------------
    logger.info("Initiating mock payment gateway", extra={
        "offerId": request.offerId,
        "smeId": sme_id,
        "amount": str(net_disbursement),
        "delaySeconds": MOCK_PAYMENT_GATEWAY_DELAY,
    })

    time.sleep(MOCK_PAYMENT_GATEWAY_DELAY)

    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    logger.info("Payment gateway completed", extra={
        "offerId": request.offerId,
        "transactionId": transaction_id,
    })

    # ------------------------------------------------------------------
    # 6. Write transaction ledger record (fatal on failure)
    # ------------------------------------------------------------------
    ledger_item = {
        "id": transaction_id,
        "type": "INVOICE_DISBURSEMENT",
        "offerId": request.offerId,
        "invoiceId": invoice_id or "UNKNOWN",
        "smeId": sme_id,
        "amount": net_disbursement,
        "currency": offer.get("currency", "RM"),
        "status": "COMPLETED",
        "paymentMethod": "DUITNOW_MOCK",
        "createdAt": now_utc,
    }

    try:
        transactions_table.put_item(Item=ledger_item)
    except Exception as exc:
        logger.error("Failed to write transaction ledger – rolling back", extra={
            "transactionId": transaction_id,
            "offerId": request.offerId,
            "error": str(exc),
        })
        _rollback_offer(request.offerId, "Ledger write failed")
        return _internal_error("Ledger write failed – disbursement rolled back")

    logger.info("Transaction ledger written", extra={
        "transactionId": transaction_id,
        "offerId": request.offerId,
        "amount": net_disbursement,
    })

    # ------------------------------------------------------------------
    # 7. Atomic wallet balance update (ADD expression)
    #    Fatal on failure – rolls back offer so the disbursement can be retried.
    # ------------------------------------------------------------------
    new_balance = None
    try:
        wallet_response = users_table.update_item(
            Key={"id": sme_id},
            UpdateExpression="ADD walletBalance :amt SET updatedAt = :ua, lastDisbursementAt = :lda",
            ExpressionAttributeValues={
                ":amt": net_disbursement,
                ":ua": now_utc,
                ":lda": now_utc,
            },
            ReturnValues="UPDATED_NEW",
        )
        raw_balance = wallet_response["Attributes"].get("walletBalance", Decimal("0"))
        new_balance = float(raw_balance) if isinstance(raw_balance, Decimal) else float(raw_balance)
    except Exception as exc:
        logger.error("Failed to update wallet balance – rolling back", extra={
            "smeId": sme_id,
            "offerId": request.offerId,
            "error": str(exc),
        })
        _rollback_offer(request.offerId, "Wallet update failed", transaction_id)
        return _internal_error("Failed to update wallet balance – disbursement rolled back")

    logger.info("Wallet balance updated", extra={
        "smeId": sme_id,
        "offerId": request.offerId,
        "creditedAmount": str(net_disbursement),
        "newBalance": new_balance,
    })

    # ------------------------------------------------------------------
    # 8. Update invoice status to FUNDED (non-fatal, guarded by invoice_id)
    # ------------------------------------------------------------------
    if invoice_id:
        try:
            invoices_table.update_item(
                Key={"id": invoice_id},
                UpdateExpression="SET #st = :st, transactionId = :tid, disbursedAt = :da, updatedAt = :ua",
                ConditionExpression=Attr("status").ne("FUNDED"),
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={
                    ":st": "FUNDED",
                    ":tid": transaction_id,
                    ":da": now_utc,
                    ":ua": now_utc,
                },
            )
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.info("Invoice already marked FUNDED", extra={
                    "invoiceId": invoice_id,
                })
            else:
                logger.warning("Failed to update invoice status to FUNDED", extra={
                    "invoiceId": invoice_id,
                    "error": str(exc),
                })
        except Exception as exc:
            logger.warning("Failed to update invoice status to FUNDED", extra={
                "invoiceId": invoice_id,
                "error": str(exc),
            })
    else:
        logger.info("No invoiceId on offer; skipping invoice status update", extra={
            "offerId": request.offerId,
        })

    # ------------------------------------------------------------------
    # 9. Return 200 OK with disbursement confirmation
    # ------------------------------------------------------------------
    return _response(200, {
        "offerId": request.offerId,
        "transactionId": transaction_id,
        "status": "DISBURSED",
        "disbursedAmount": float(net_disbursement),
        "currency": offer.get("currency", "RM"),
        "paymentMethod": "DUITNOW_MOCK",
        "walletBalance": new_balance,
        "smeId": sme_id,
        "disbursedAt": now_utc,
    })
