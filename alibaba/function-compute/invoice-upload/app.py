import os
import uuid

from flask import Flask, request, jsonify
from index import (
    extract_invoice_with_alibaba_ai,
    post_to_aws_webhook,
    log_event,
    utc_now_iso,
    SUPPORTED_MIME_TYPES,
    SUPPORTED_EXTENSIONS,
    get_file_extension,
)

app = Flask(__name__)


def get_file_extension(filename: str) -> str:
    normalized = (filename or "").strip().lower()
    if "." not in normalized:
        return ""
    return normalized[normalized.rfind(".") :]


@app.route("/", methods=["POST", "OPTIONS"])
def handle_invoice_upload():
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    # CORS preflight
    if request.method == "OPTIONS":
        resp = jsonify({"success": True, "requestId": request_id, "message": "Preflight accepted"})
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
        return resp

    log_event(
        "invoice_upload_invocation_started",
        requestId=request_id,
        method=request.method,
        contentType=request.content_type or "",
    )

    # Validate file upload
    if "file" not in request.files:
        log_event("invoice_upload_validation_failed", requestId=request_id, reason="Missing required file upload field")
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_UPLOAD", "message": "Missing required file upload field"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        log_event("invoice_upload_validation_failed", requestId=request_id, reason="Missing required file upload field")
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_UPLOAD", "message": "Missing required file upload field"}), 400

    file_name = file.filename
    mime_type = (file.content_type or "").lower()
    file_bytes = file.read()

    if not file_bytes:
        log_event("invoice_upload_validation_failed", requestId=request_id, reason="Uploaded file is empty")
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_UPLOAD", "message": "Uploaded file is empty"}), 400

    extension = get_file_extension(file_name)
    if extension not in SUPPORTED_EXTENSIONS or mime_type not in SUPPORTED_MIME_TYPES:
        log_event("invoice_upload_validation_failed", requestId=request_id, reason="Unsupported file type")
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_UPLOAD", "message": "Unsupported file type. Allowed types: PDF, JPG, PNG"}), 400

    # Extract invoice data with Alibaba Cloud AI
    try:
        extracted_data = extract_invoice_with_alibaba_ai(file_bytes, file_name, mime_type)
        invoice_id = str(uuid.uuid4())
        log_event(
            "invoice_extraction_completed",
            requestId=request_id,
            invoiceId=invoice_id,
            fileName=file_name,
            mimeType=mime_type,
            extractedAmount=extracted_data["extractedAmount"],
        )
    except Exception as exc:
        import requests as req_lib
        if isinstance(exc, req_lib.exceptions.RequestException):
            log_event("alibaba_ai_request_failed", requestId=request_id, fileName=file_name, error=str(exc))
            return jsonify({"success": False, "requestId": request_id, "errorCode": "ALIBABA_AI_UNAVAILABLE", "message": "Alibaba Cloud AI extraction request failed"}), 502
        log_event("alibaba_ai_extraction_failed", requestId=request_id, fileName=file_name, error=str(exc))
        return jsonify({"success": False, "requestId": request_id, "errorCode": "ALIBABA_AI_EXTRACTION_FAILED", "message": str(exc)}), 500

    # Post to AWS webhook
    try:
        webhook_response = post_to_aws_webhook(invoice_id, extracted_data)
        log_event("aws_webhook_response_received", requestId=request_id, invoiceId=invoice_id, statusCode=webhook_response.status_code)
    except Exception as exc:
        import requests as req_lib
        if isinstance(exc, req_lib.exceptions.RequestException):
            log_event("aws_webhook_request_failed", requestId=request_id, invoiceId=invoice_id, error=str(exc))
            return jsonify({"success": False, "requestId": request_id, "invoiceId": invoice_id, "errorCode": "AWS_WEBHOOK_UNAVAILABLE", "message": "Failed to hand off invoice to AWS webhook"}), 502
        log_event("aws_webhook_configuration_error", requestId=request_id, invoiceId=invoice_id, error=str(exc))
        return jsonify({"success": False, "requestId": request_id, "invoiceId": invoice_id, "errorCode": "CONFIGURATION_ERROR", "message": str(exc)}), 500

    if 200 <= webhook_response.status_code < 300:
        # Parse the webhook response body to extract the offer data
        # The AWS webhook Lambda creates the offer synchronously, so the
        # offer is already available in the response – no need to poll.
        try:
            webhook_data = webhook_response.json()
        except Exception:
            webhook_data = {}

        return jsonify({
            "success": True,
            "requestId": request_id,
            "invoiceId": invoice_id,
            "message": "Invoice uploaded, extracted by Alibaba Cloud AI, and forwarded successfully",
            "data": {
                "fileName": file_name,
                "mimeType": mime_type,
                "extractedData": extracted_data,
                "awsStatusCode": webhook_response.status_code,
                "offer": webhook_data.get("offer"),
            },
        })

    return jsonify({
        "success": False,
        "requestId": request_id,
        "invoiceId": invoice_id,
        "errorCode": "AWS_WEBHOOK_REJECTED",
        "message": "AWS webhook rejected the invoice payload",
        "details": {
            "awsStatusCode": webhook_response.status_code,
            "awsResponseBody": webhook_response.text[:1000],
        },
    }), 502


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9000))
    app.run(host="0.0.0.0", port=port)
