import base64
import cgi
import json
import os
import time
import uuid
from datetime import datetime, timezone

import requests


SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}
SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
}
IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
}
REQUEST_TIMEOUT_SECONDS = 30
FILE_PARSE_POLL_ATTEMPTS = 10
FILE_PARSE_POLL_INTERVAL_SECONDS = 3


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def log_event(event_name: str, **details) -> None:
    print(
        json.dumps(
            {
                "event": event_name,
                "timestamp": utc_now_iso(),
                **details,
            },
            separators=(",", ":"),
        )
    )


def json_response(start_response, status: str, payload: dict):
    response_headers = [
        ("Content-Type", "application/json"),
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Headers", "Content-Type,Authorization"),
        ("Access-Control-Allow-Methods", "POST,OPTIONS"),
    ]
    start_response(status, response_headers)
    return [json.dumps(payload).encode("utf-8")]


def get_file_extension(filename: str) -> str:
    normalized = (filename or "").strip().lower()
    if "." not in normalized:
        return ""
    return normalized[normalized.rfind(".") :]


def extract_upload_from_request(environ) -> tuple[bytes, str, str]:
    content_type = environ.get("CONTENT_TYPE", "")
    if "multipart/form-data" not in content_type.lower():
        raise ValueError("Request content type must be multipart/form-data")

    form = cgi.FieldStorage(
        fp=environ["wsgi.input"],
        environ=environ,
        keep_blank_values=True,
    )

    file_field = None
    if "file" in form and getattr(form["file"], "filename", None):
        file_field = form["file"]
    else:
        for key in form.keys():
            candidate = form[key]
            if isinstance(candidate, list):
                for item in candidate:
                    if getattr(item, "filename", None):
                        file_field = item
                        break
            elif getattr(candidate, "filename", None):
                file_field = candidate

            if file_field:
                break

    if not file_field or not getattr(file_field, "filename", None):
        raise ValueError("Missing required file upload field")

    file_name = file_field.filename
    mime_type = (getattr(file_field, "type", "") or "").lower()
    file_bytes = file_field.file.read()

    if not file_bytes:
        raise ValueError("Uploaded file is empty")

    extension = get_file_extension(file_name)
    if extension not in SUPPORTED_EXTENSIONS or mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError("Unsupported file type. Allowed types: PDF, JPG, PNG")

    return file_bytes, file_name, mime_type


def build_invoice_extraction_prompt() -> str:
    return (
        "You are extracting structured data from a logistics and supply-chain financing invoice. "
        "Return only valid JSON with these exact keys: "
        "extractedAmount, currency, merchantName, documentType, confidenceScore, "
        "invoiceNumber, issueDate, dueDate, buyerName, sellerName. "
        "Use a numeric value for extractedAmount and confidenceScore. "
        "Use null for fields that are not visible. "
        "Do not wrap the JSON in markdown fences. "
        "Do not invent values that are not supported by the document."
    )


def parse_json_from_model(raw_content: str) -> dict:
    content = (raw_content or "").strip()
    if content.startswith("```"):
        lines = content.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    data = json.loads(content)
    if not isinstance(data, dict):
        raise ValueError("AI extraction response was not a JSON object")

    required_fields = {
        "extractedAmount",
        "currency",
        "merchantName",
        "documentType",
        "confidenceScore",
    }
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"AI extraction response missing required fields: {', '.join(missing_fields)}")

    data["extractedAmount"] = float(data["extractedAmount"])
    data["confidenceScore"] = float(data["confidenceScore"])

    # Normalize common non-ISO currency codes to ISO 4217
    currency_aliases = {
        "RM": "MYR",
        "RMB": "CNY",
        "USD": "USD",
        "SGD": "SGD",
        "R": "ZAR",
    }
    raw_currency = str(data.get("currency", "")).strip().upper()
    data["currency"] = currency_aliases.get(raw_currency, raw_currency)
    if len(data["currency"]) < 3:
        data["currency"] = "MYR"  # Safe default for Malaysia-region platform

    return data


def build_dashscope_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
    }


def get_vision_api_config() -> tuple[str, str, str]:
    api_key = os.getenv("DASHSCOPE_API_KEY", "")
    base_url = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
    model = os.getenv("DASHSCOPE_OCR_MODEL", "qwen-vl-ocr")
    return api_key, base_url.rstrip("/"), model


def get_document_api_config() -> tuple[str, str, str]:
    api_key = os.getenv("DASHSCOPE_DOC_API_KEY") or os.getenv("DASHSCOPE_API_KEY", "")
    base_url = os.getenv("DASHSCOPE_DOC_BASE_URL", "https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1")
    model = os.getenv("DASHSCOPE_DOC_MODEL", "qwen-plus")
    return api_key, base_url.rstrip("/"), model


def call_qwen_ocr(file_bytes: bytes, mime_type: str) -> dict:
    api_key = os.getenv("DASHSCOPE_API_KEY", "")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured")

    import dashscope
    dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"

    model = os.getenv("DASHSCOPE_OCR_MODEL", "qwen-vl-ocr")
    base64_file = base64.b64encode(file_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{base64_file}"

    response = dashscope.MultiModalConversation.call(
        api_key=api_key,
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"image": image_data_url},
                    {"text": build_invoice_extraction_prompt()},
                ],
            }
        ],
        result_format="message",
        temperature=0,
    )

    if response.status_code != 200:
        raise RuntimeError(f"DashScope OCR call failed: {response.code} - {response.message}")

    content = response.output["choices"][0]["message"]["content"]
    return parse_json_from_model(content)


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text content from a PDF using PyPDF2."""
    import io
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)

    if not text_parts:
        raise ValueError("Could not extract any text from the PDF")

    return "\n\n".join(text_parts)


def call_qwen_doc(file_bytes: bytes, file_name: str) -> dict:
    """Extract invoice data from a PDF by sending its text to qwen-plus via the DashScope SDK.

    The international (dashscope-intl) endpoint does not support qwen-long or
    qwen-doc-turbo with file_id references. Instead, we extract the PDF text
    with PyPDF2 and send it to qwen-plus as a regular text prompt.
    """
    api_key = os.getenv("DASHSCOPE_DOC_API_KEY") or os.getenv("DASHSCOPE_API_KEY", "")
    if not api_key:
        raise RuntimeError("DASHSCOPE_DOC_API_KEY or DASHSCOPE_API_KEY is not configured for PDF extraction")

    import dashscope
    dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"

    model = os.getenv("DASHSCOPE_DOC_MODEL", "qwen-plus")
    pdf_text = extract_pdf_text(file_bytes)

    # Truncate to avoid token limits (qwen-plus supports 128k context)
    max_chars = 100000
    if len(pdf_text) > max_chars:
        pdf_text = pdf_text[:max_chars]

    prompt = (
        build_invoice_extraction_prompt()
        + "\n\n--- DOCUMENT CONTENT ---\n\n"
        + pdf_text
    )

    response = dashscope.Generation.call(
        api_key=api_key,
        model=model,
        messages=[{"role": "user", "content": prompt}],
        result_format="message",
        temperature=0,
    )

    if response.status_code != 200:
        raise RuntimeError(f"DashScope document extraction failed: {response.code} - {response.message}")

    content = response.output["choices"][0]["message"]["content"]
    return parse_json_from_model(content)


def extract_invoice_with_alibaba_ai(file_bytes: bytes, file_name: str, mime_type: str) -> dict:
    if mime_type in IMAGE_MIME_TYPES:
        return call_qwen_ocr(file_bytes, mime_type)

    if mime_type == "application/pdf":
        return call_qwen_doc(file_bytes, file_name)

    raise ValueError("Unsupported file type. Allowed types: PDF, JPG, PNG")


def post_to_aws_webhook(invoice_id: str, extracted_data: dict) -> requests.Response:
    aws_webhook_url = os.getenv("AWS_WEBHOOK_URL")
    if not aws_webhook_url:
        raise RuntimeError("AWS_WEBHOOK_URL is not configured")

    payload = {
        "invoiceId": invoice_id,
        "amount": extracted_data["extractedAmount"],
        "status": "PENDING_SCORING",
        "extractedData": extracted_data,
        "timestamp": utc_now_iso(),
        "source": "alibaba_cloud_model_studio",
    }

    response = requests.post(
        aws_webhook_url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    return response


def handler(environ, start_response):
    request_id = (
        environ.get("fc.request_id")
        or environ.get("HTTP_X_REQUEST_ID")
        or str(uuid.uuid4())
    )

    log_event(
        "invoice_upload_invocation_started",
        requestId=request_id,
        method=environ.get("REQUEST_METHOD", "POST"),
        contentType=environ.get("CONTENT_TYPE", ""),
    )

    if environ.get("REQUEST_METHOD", "").upper() == "OPTIONS":
        return json_response(
            start_response,
            "200 OK",
            {
                "success": True,
                "requestId": request_id,
                "message": "Preflight accepted",
            },
        )

    try:
        file_bytes, file_name, mime_type = extract_upload_from_request(environ)
    except ValueError as exc:
        log_event("invoice_upload_validation_failed", requestId=request_id, reason=str(exc))
        return json_response(
            start_response,
            "400 Bad Request",
            {
                "success": False,
                "requestId": request_id,
                "errorCode": "INVALID_UPLOAD",
                "message": str(exc),
            },
        )
    except Exception as exc:
        log_event("invoice_upload_parse_failed", requestId=request_id, error=str(exc))
        return json_response(
            start_response,
            "500 Internal Server Error",
            {
                "success": False,
                "requestId": request_id,
                "errorCode": "UPLOAD_PARSE_FAILED",
                "message": "Failed to parse multipart upload",
            },
        )

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
    except requests.exceptions.RequestException as exc:
        log_event("alibaba_ai_request_failed", requestId=request_id, fileName=file_name, error=str(exc))
        return json_response(
            start_response,
            "502 Bad Gateway",
            {
                "success": False,
                "requestId": request_id,
                "errorCode": "ALIBABA_AI_UNAVAILABLE",
                "message": "Alibaba Cloud AI extraction request failed",
            },
        )
    except (RuntimeError, ValueError) as exc:
        log_event("alibaba_ai_extraction_failed", requestId=request_id, fileName=file_name, error=str(exc))
        return json_response(
            start_response,
            "500 Internal Server Error",
            {
                "success": False,
                "requestId": request_id,
                "errorCode": "ALIBABA_AI_EXTRACTION_FAILED",
                "message": str(exc),
            },
        )
    except Exception as exc:
        log_event("alibaba_ai_unhandled_error", requestId=request_id, fileName=file_name, error=str(exc))
        return json_response(
            start_response,
            "500 Internal Server Error",
            {
                "success": False,
                "requestId": request_id,
                "errorCode": "INTERNAL_ERROR",
                "message": "Unexpected error while extracting invoice data",
            },
        )

    try:
        webhook_response = post_to_aws_webhook(invoice_id, extracted_data)
        log_event(
            "aws_webhook_response_received",
            requestId=request_id,
            invoiceId=invoice_id,
            statusCode=webhook_response.status_code,
        )
    except requests.exceptions.RequestException as exc:
        log_event("aws_webhook_request_failed", requestId=request_id, invoiceId=invoice_id, error=str(exc))
        return json_response(
            start_response,
            "502 Bad Gateway",
            {
                "success": False,
                "requestId": request_id,
                "invoiceId": invoice_id,
                "errorCode": "AWS_WEBHOOK_UNAVAILABLE",
                "message": "Failed to hand off invoice to AWS webhook",
            },
        )
    except RuntimeError as exc:
        log_event("aws_webhook_configuration_error", requestId=request_id, invoiceId=invoice_id, error=str(exc))
        return json_response(
            start_response,
            "500 Internal Server Error",
            {
                "success": False,
                "requestId": request_id,
                "invoiceId": invoice_id,
                "errorCode": "CONFIGURATION_ERROR",
                "message": str(exc),
            },
        )

    if 200 <= webhook_response.status_code < 300:
        return json_response(
            start_response,
            "200 OK",
            {
                "success": True,
                "requestId": request_id,
                "invoiceId": invoice_id,
                "message": "Invoice uploaded, extracted by Alibaba Cloud AI, and forwarded successfully",
                "data": {
                    "fileName": file_name,
                    "mimeType": mime_type,
                    "extractedData": extracted_data,
                    "awsStatusCode": webhook_response.status_code,
                },
            },
        )

    return json_response(
        start_response,
        "502 Bad Gateway",
        {
            "success": False,
            "requestId": request_id,
            "invoiceId": invoice_id,
            "errorCode": "AWS_WEBHOOK_REJECTED",
            "message": "AWS webhook rejected the invoice payload",
            "details": {
                "awsStatusCode": webhook_response.status_code,
                "awsResponseBody": webhook_response.text[:1000],
            },
        },
    )
