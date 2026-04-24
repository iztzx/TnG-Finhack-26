"""
Drop-in replacement for backend/lambda/credit-scoring/handler.py

Uses the real ML models for credit scoring while keeping the same
API contract and DynamoDB persistence logic.

Model path resolution:
  1. /opt/ml/models/   — Lambda layer mount
  2. ./models/         — local development
"""

import json
import os
import time

# Add the package directory to path so imports work in Lambda layer
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Try to import predict module from local ml/ first, then from layer path
try:
    from predict import score_user
    from feature_engineering import extract_features
except ImportError:
    import sys

    sys.path.insert(0, _BASE_DIR)
    from predict import score_user
    from feature_engineering import extract_features

# Optional DynamoDB integration — gracefully degrade if AWS env is missing
try:
    import boto3
    import decimal

    dynamodb = boto3.resource("dynamodb")
    txn_table = dynamodb.Table(
        os.environ.get("TXN_TABLE", "tng-finhack-transactions")
    )
    risk_table = dynamodb.Table(
        os.environ.get("RISK_TABLE", "tng-finhack-risk-scores")
    )
    _DYNAMO_AVAILABLE = True
except Exception:
    _DYNAMO_AVAILABLE = False
    txn_table = None
    risk_table = None

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization",
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Content-Type": "application/json",
}


def _decimalize(obj):
    """Recursively convert floats to Decimal for DynamoDB."""
    if isinstance(obj, float):
        return decimal.Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _decimalize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decimalize(v) for v in obj]
    return obj


def handle_trigger(event):
    start = time.time()
    body = json.loads(event.get("body", "{}"))
    user_id = body.get("userId", "demo-user-001")

    # ML prediction
    ml_result = score_user(body)

    # Persist to DynamoDB if available
    if _DYNAMO_AVAILABLE and txn_table:
        try:
            txn_table.put_item(
                Item={
                    "userId": user_id,
                    "timestamp": str(int(time.time() * 1000)),
                    "creditAmount": decimal.Decimal(str(ml_result["credit_limit"])),
                    "riskScore": decimal.Decimal(str(ml_result["score"])),
                    "status": "APPROVED" if ml_result["approved"] else "DECLINED",
                    "latencyMs": decimal.Decimal(
                        str(int((time.time() - start) * 1000))
                    ),
                }
            )
        except Exception as e:
            print(f"DynamoDB write error: {e}")

    processing_ms = int((time.time() - start) * 1000)

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(
            {
                "approved": ml_result["approved"],
                "creditAmount": ml_result["credit_limit"],
                "riskScore": ml_result["score"],
                "riskLevel": ml_result["risk_tier"],
                "featureImportance": ml_result["feature_importance"],
                "processingMs": processing_ms,
            }
        ),
    }


def handle_transactions(event):
    if _DYNAMO_AVAILABLE and txn_table:
        user_id = event.get("pathParameters", {}).get("userId", "demo-user-001")
        try:
            response = txn_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(
                    user_id
                ),
                ScanIndexForward=False,
                Limit=50,
            )
            items = [
                {
                    k: float(v) if isinstance(v, decimal.Decimal) else v
                    for k, v in item.items()
                }
                for item in response.get("Items", [])
            ]
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"transactions": items}),
            }
        except Exception as e:
            print(f"DynamoDB read error: {e}")

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"transactions": []}),
    }


def handle_telemetry(event):
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(
            {
                "deviceId": "demo-device-001",
                "gps": {"lat": 3.1390, "lng": 101.6869},
                "battery": 87,
                "signal": -65,
                "temperature": 32.5,
                "timestamp": int(time.time() * 1000),
            }
        ),
    }


def handler(event, context):
    method = event.get("httpMethod", "")
    path = event.get("path", "")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}
    if method == "POST" and "/trigger" in path:
        return handle_trigger(event)
    if method == "GET" and "/transactions" in path:
        return handle_transactions(event)
    if method == "GET" and "/telemetry" in path:
        return handle_telemetry(event)

    return {
        "statusCode": 404,
        "headers": CORS_HEADERS,
        "body": json.dumps({"error": "Not found"}),
    }
