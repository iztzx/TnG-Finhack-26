import json
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
    call_chat_completions,
    get_document_api_config,
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

    # Extract userId (optional, forwarded to AWS webhook)
    user_id = (request.form.get("userId") or request.form.get("user_id") or "").strip()
    shipment_number = (request.form.get("shipmentNumber") or request.form.get("shipment_number") or "").strip()
    contact_email = (request.form.get("contactEmail") or request.form.get("contact_email") or "").strip()

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
    except ValueError as exc:
        # Validation errors (unsupported file type, non-invoice document) are client errors
        log_event("invoice_upload_validation_failed", requestId=request_id, fileName=file_name, reason=str(exc))
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_UPLOAD", "message": str(exc)}), 400
    except Exception as exc:
        import requests as req_lib
        if isinstance(exc, req_lib.exceptions.RequestException):
            log_event("alibaba_ai_request_failed", requestId=request_id, fileName=file_name, error=str(exc))
            return jsonify({"success": False, "requestId": request_id, "errorCode": "ALIBABA_AI_UNAVAILABLE", "message": "Alibaba Cloud AI extraction request failed"}), 502
        log_event("alibaba_ai_extraction_failed", requestId=request_id, fileName=file_name, error=str(exc))
        return jsonify({"success": False, "requestId": request_id, "errorCode": "ALIBABA_AI_EXTRACTION_FAILED", "message": str(exc)}), 500

    # Post to AWS webhook
    try:
        webhook_response = post_to_aws_webhook(invoice_id, extracted_data, user_id, shipment_number, contact_email)
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


# ============================================================================
# AI Chat & Summary endpoints (Qwen via DashScope)
# ============================================================================

SYSTEM_PROMPT_CHAT = (
    "You are OUT&IN Financing Assistant, an expert AI advisor for the OUT&IN Supply Chain Capital platform. "
    "You help SME exporters in Malaysia and Southeast Asia with trade finance questions. "
    "Be concise, professional, and helpful. Use RM for Malaysian Ringgit. "
    "If the user asks about their specific data, reference the provided context accurately. "
    "If you do not know something, say so rather than guessing."
)

SYSTEM_PROMPT_SUMMARY = (
    "You are an executive financial analyst for OUT&IN Supply Chain Capital. "
    "Generate a concise, insightful executive summary of the user's business status on the platform. "
    "Cover: overall financial health, active financing, shipment status, risks, and actionable recommendations. "
    "Use bullet points and bold key numbers. Keep it under 250 words. Be encouraging but realistic."
)


def _call_qwen_chat(messages, temperature=0.7):
    api_key, base_url, model = get_document_api_config()
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured")
    return call_chat_completions(api_key, base_url, model, messages, temperature=temperature)


@app.route("/chat", methods=["POST", "OPTIONS"])
def handle_chat():
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    if request.method == "OPTIONS":
        resp = jsonify({"success": True, "requestId": request_id, "message": "Preflight accepted"})
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
        return resp

    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {}

    user_message = str(data.get("message", "")).strip()
    history = data.get("history", []) or []
    context = data.get("context", {}) or {}

    if not user_message:
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_REQUEST", "message": "Missing message field"}), 400

    log_event("ai_chat_started", requestId=request_id, messageLength=len(user_message), hasContext=bool(context))

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT_CHAT}]

        if context:
            ctx_text = "USER CONTEXT:\n" + json.dumps(context, ensure_ascii=False, indent=2)
            messages.append({"role": "system", "content": ctx_text})

        for h in history[-10:]:
            role = h.get("role", "user")
            content = str(h.get("content", ""))
            if content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        reply = _call_qwen_chat(messages, temperature=0.7)
        log_event("ai_chat_completed", requestId=request_id, replyLength=len(reply))
        return jsonify({"success": True, "requestId": request_id, "reply": reply})

    except Exception as exc:
        log_event("ai_chat_failed", requestId=request_id, error=str(exc))
        return jsonify({"success": False, "requestId": request_id, "errorCode": "AI_CHAT_FAILED", "message": str(exc)}), 502


@app.route("/summary", methods=["POST", "OPTIONS"])
def handle_summary():
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    if request.method == "OPTIONS":
        resp = jsonify({"success": True, "requestId": request_id, "message": "Preflight accepted"})
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
        return resp

    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {}

    context = data.get("context", {}) or {}
    if not context:
        return jsonify({"success": False, "requestId": request_id, "errorCode": "INVALID_REQUEST", "message": "Missing context field"}), 400

    log_event("ai_summary_started", requestId=request_id, hasProfile=bool(context.get("profile")))

    try:
        ctx_text = "USER DATA:\n" + json.dumps(context, ensure_ascii=False, indent=2)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_SUMMARY},
            {"role": "user", "content": ctx_text},
        ]
        reply = _call_qwen_chat(messages, temperature=0.7)
        log_event("ai_summary_completed", requestId=request_id, replyLength=len(reply))
        return jsonify({"success": True, "requestId": request_id, "summary": reply})

    except Exception as exc:
        log_event("ai_summary_failed", requestId=request_id, error=str(exc))
        return jsonify({"success": False, "requestId": request_id, "errorCode": "AI_SUMMARY_FAILED", "message": str(exc)}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9000))
    app.run(host="0.0.0.0", port=port)
