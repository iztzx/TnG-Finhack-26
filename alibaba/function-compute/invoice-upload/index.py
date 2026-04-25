import base64
import json
import os
import time
import uuid
from datetime import datetime, timezone

import requests
from werkzeug.formparser import parse_form_data


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


def extract_upload_from_request(environ) -> tuple[bytes, str, str, str]:
    content_type = environ.get("CONTENT_TYPE", "")
    if "multipart/form-data" not in content_type.lower():
        raise ValueError("Request content type must be multipart/form-data")

    stream, form, files = parse_form_data(environ)

    # Extract userId (optional, forwarded to AWS webhook for wallet crediting)
    user_id = (form.get("userId", "") or form.get("user_id", "") or "").strip()
    shipment_number = (form.get("shipmentNumber", "") or form.get("shipment_number", "") or "").strip()
    contact_email = (form.get("contactEmail", "") or form.get("contact_email", "") or "").strip()

    file_storage = files.get("file")
    if not file_storage or not getattr(file_storage, "filename", None):
        # Try to find any file field if "file" is not the key
        for key in files:
            candidate = files.getlist(key)
            for item in candidate:
                if getattr(item, "filename", None):
                    file_storage = item
                    break
            if file_storage and getattr(file_storage, "filename", None):
                break

    if not file_storage or not getattr(file_storage, "filename", None):
        raise ValueError("Missing required file upload field")

    file_name = file_storage.filename
    mime_type = (getattr(file_storage, "content_type", "") or "").lower()
    file_bytes = file_storage.stream.read()

    if not file_bytes:
        raise ValueError("Uploaded file is empty")

    extension = get_file_extension(file_name)
    if extension not in SUPPORTED_EXTENSIONS or mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError("Unsupported file type. Allowed types: PDF, JPG, PNG")

    return file_bytes, file_name, mime_type, user_id, shipment_number, contact_email


def build_invoice_extraction_prompt() -> str:
    return (
        "You are a precise document extraction engine for logistics and supply-chain financing invoices.\n\n"
        "TASK: Extract ONLY the fields that are explicitly visible in the document. "
        "If a field is not present, return null for that field.\n\n"
        "OUTPUT FORMAT: Return a single JSON object with exactly these keys:\n"
        "- extractedAmount (number): The total invoice amount. Must be > 0.\n"
        "- currency (string): 3-letter ISO currency code (e.g., MYR, USD, SGD). Default to MYR if unclear.\n"
        "- merchantName (string): The seller/merchant name. If not visible, use 'UNKNOWN_MERCHANT'.\n"
        "- documentType (string): Type of document (e.g., INVOICE, RECEIPT, PURCHASE_ORDER). If unclear, use 'UNKNOWN'.\n"
        "- confidenceScore (number between 0 and 1): Your confidence that the extracted data is accurate.\n"
        "- invoiceNumber (string or null): The invoice number.\n"
        "- issueDate (string or null): Issue date in YYYY-MM-DD format.\n"
        "- dueDate (string or null): Due date in YYYY-MM-DD format.\n"
        "- buyerName (string or null): The buyer/customer name.\n"
        "- sellerName (string or null): The seller name (may be same as merchantName).\n\n"
        "RULES:\n"
        "1. Do NOT wrap the JSON in markdown code fences.\n"
        "2. Do NOT invent or guess values. Only extract what is visible.\n"
        "3. If the amount is in RM, convert currency to 'MYR'.\n"
        "4. Return ONLY the JSON object, no additional text."
    )


def _normalize_content(raw_content):
    """Normalize model output to a string.

    Vision models may return content as a list of parts (OpenAI-compatible
    format) or as a plain string. Extract the text in either case.
    """
    if raw_content is None:
        return ""
    if isinstance(raw_content, str):
        return raw_content
    if isinstance(raw_content, list):
        parts = []
        for part in raw_content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                parts.append(part.get("text", ""))
        return "".join(parts)
    return str(raw_content)


def parse_json_from_model(raw_content) -> dict:
    content = _normalize_content(raw_content).strip()
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

    # Normalize confidence: AI models sometimes return percentages (0-100)
    # instead of decimals (0-1); clamp to the 0-1 range the AWS webhook expects.
    # Guard zero/negative amount: AWS Pydantic model enforces gt=0
    if data["extractedAmount"] <= 0:
        raise ValueError(
            f"AI extraction returned invalid amount: {data['extractedAmount']}. "
            "The document may not contain a readable invoice total."
        )

    if data["confidenceScore"] > 1.0:
        data["confidenceScore"] = min(data["confidenceScore"] / 100.0, 1.0)

    # Guard required non-nullable fields – the AI prompt says "Use null for
    # fields that are not visible", but the AWS Pydantic schema rejects null
    # for merchantName and documentType.  Provide safe fallback defaults.
    if not data.get("merchantName") or data["merchantName"] is None:
        data["merchantName"] = "UNKNOWN_MERCHANT"
    if not data.get("documentType") or data["documentType"] is None:
        data["documentType"] = "UNKNOWN"

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


# Document types that are acceptable for invoice financing
ACCEPTED_INVOICE_TYPES = {
    "invoice",
    "tax_invoice",
    "commercial_invoice",
    "proforma_invoice",
    "debit_note",
    "credit_note",
}


def validate_document_type(data: dict) -> None:
    """Reject uploads that are clearly not invoices (e.g., payslips, receipts)."""
    doc_type = str(data.get("documentType") or "UNKNOWN").strip().upper().replace(" ", "_")
    if doc_type not in {t.upper() for t in ACCEPTED_INVOICE_TYPES}:
        raise ValueError(
            f"Document type '{doc_type}' is not an accepted invoice. "
            f"Accepted types: {', '.join(ACCEPTED_INVOICE_TYPES)}. "
            "Please upload a valid invoice document."
        )


def build_dashscope_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def get_vision_api_config() -> tuple[str, str, str]:
    api_key = os.getenv("DASHSCOPE_API_KEY", "")
    base_url = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
    model = os.getenv("DASHSCOPE_VISION_MODEL", "qwen-vl-max")
    return api_key, base_url.rstrip("/"), model


def get_document_api_config() -> tuple[str, str, str]:
    api_key = os.getenv("DASHSCOPE_DOC_API_KEY") or os.getenv("DASHSCOPE_API_KEY", "")
    base_url = os.getenv("DASHSCOPE_DOC_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
    model = os.getenv("DASHSCOPE_DOC_MODEL", "qwen-plus")
    return api_key, base_url.rstrip("/"), model


def get_api_strategy() -> str:
    """Return the API strategy: 'openai-compatible' (default) or 'sdk'."""
    return os.getenv("DASHSCOPE_API_STRATEGY", "openai-compatible").lower()


# ============================================================================
# Unified OpenAI-compatible API client (more flexible, standard, portable)
# ============================================================================

def call_chat_completions(
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.0,
    max_retries: int = 2,
) -> str:
    """Call DashScope via the OpenAI-compatible /chat/completions endpoint.

    Uses raw requests so we avoid locking into the DashScope SDK's older
    MultiModalConversation / Generation APIs. This makes model swaps trivial.
    """
    url = f"{base_url}/chat/completions"
    headers = build_dashscope_headers(api_key)
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return content
        except requests.exceptions.RequestException as exc:
            last_error = exc
            log_event("dashscope_openai_api_request_failed", model=model, attempt=attempt + 1, error=str(exc))
            if attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            last_error = exc
            log_event("dashscope_openai_api_parse_failed", model=model, attempt=attempt + 1, error=str(exc))
            if attempt < max_retries:
                time.sleep(1.0)

    raise RuntimeError(f"DashScope OpenAI-compatible API call failed after {max_retries + 1} attempts: {last_error}")


def extract_with_vision_model(file_bytes: bytes, mime_type: str, model: str | None = None) -> dict:
    """Extract invoice data from an image using a vision-capable model via the OpenAI-compatible API."""
    api_key, base_url, default_model = get_vision_api_config()
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured")

    model = model or default_model
    base64_file = base64.b64encode(file_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{base64_file}"

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_data_url}},
                {"type": "text", "text": build_invoice_extraction_prompt()},
            ],
        }
    ]

    raw_content = call_chat_completions(api_key, base_url, model, messages, temperature=0)
    return parse_json_from_model(raw_content)


def extract_with_text_model(text: str, model: str | None = None) -> dict:
    """Extract invoice data from text using a text-only model via the OpenAI-compatible API."""
    api_key, base_url, default_model = get_document_api_config()
    if not api_key:
        raise RuntimeError("DASHSCOPE_DOC_API_KEY or DASHSCOPE_API_KEY is not configured")

    model = model or default_model
    max_chars = 100000
    if len(text) > max_chars:
        text = text[:max_chars]

    prompt = build_invoice_extraction_prompt() + "\n\n--- DOCUMENT CONTENT ---\n\n" + text
    messages = [{"role": "user", "content": prompt}]

    raw_content = call_chat_completions(api_key, base_url, model, messages, temperature=0)
    return parse_json_from_model(raw_content)


def call_qwen_ocr_legacy(file_bytes: bytes, mime_type: str) -> dict:
    """Legacy path using the DashScope SDK MultiModalConversation API.

    Kept for backward compatibility when DASHSCOPE_API_STRATEGY=sdk.
    """
    api_key, base_url, model = get_vision_api_config()
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured")

    import dashscope
    dashscope.base_http_api_url = (
        f"{base_url}/api/v1" if "/compatible-mode" not in base_url else base_url
    )
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


def call_qwen_ocr(file_bytes: bytes, mime_type: str) -> dict:
    """Extract invoice data from an image using the best available vision model.

    Strategy:
      1. Try the OpenAI-compatible API with qwen-vl-max (best accuracy).
      2. If that fails, fall back to qwen-vl-plus.
      3. If that fails, fall back to the legacy SDK path with qwen-vl-ocr.
    """
    strategy = get_api_strategy()

    if strategy == "sdk":
        return call_qwen_ocr_legacy(file_bytes, mime_type)

    # Fallback chain for vision models via the OpenAI-compatible API
    vision_models = ["qwen-vl-max", "qwen-vl-plus", "qwen-vl-ocr"]
    configured_model = os.getenv("DASHSCOPE_VISION_MODEL", "")
    if configured_model and configured_model not in vision_models:
        vision_models.insert(0, configured_model)
    elif configured_model and configured_model in vision_models:
        # Move configured model to the front
        vision_models.remove(configured_model)
        vision_models.insert(0, configured_model)

    last_error = None
    for model in vision_models:
        try:
            log_event("vision_extraction_attempt", model=model, mimeType=mime_type)
            result = extract_with_vision_model(file_bytes, mime_type, model=model)
            log_event("vision_extraction_success", model=model, mimeType=mime_type)
            return result
        except Exception as exc:
            last_error = exc
            log_event("vision_extraction_failed", model=model, mimeType=mime_type, error=str(exc))

    raise RuntimeError(f"All vision extraction attempts failed. Last error: {last_error}")


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


def call_qwen_doc_legacy(file_bytes: bytes, file_name: str) -> dict:
    """Legacy path using the DashScope SDK Generation API.

    Kept for backward compatibility when DASHSCOPE_API_STRATEGY=sdk.
    """
    api_key, base_url, model = get_document_api_config()
    if not api_key:
        raise RuntimeError("DASHSCOPE_DOC_API_KEY or DASHSCOPE_API_KEY is not configured for PDF extraction")

    import dashscope
    dashscope.base_http_api_url = (
        f"{base_url}/api/v1" if "/compatible-mode" not in base_url else base_url
    )
    pdf_text = extract_pdf_text(file_bytes)

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


def call_qwen_doc(file_bytes: bytes, file_name: str) -> dict:
    """Extract invoice data from a PDF by sending its text to a text model.

    Uses the OpenAI-compatible API by default for consistency with the image path.
    Falls back to the legacy DashScope SDK when DASHSCOPE_API_STRATEGY=sdk.
    """
    strategy = get_api_strategy()
    pdf_text = extract_pdf_text(file_bytes)

    if strategy == "sdk":
        return call_qwen_doc_legacy(file_bytes, file_name)

    # Try the preferred doc model, then fall back to qwen-plus
    doc_models = ["qwen-plus", "qwen-max"]
    configured_model = os.getenv("DASHSCOPE_DOC_MODEL", "")
    if configured_model and configured_model not in doc_models:
        doc_models.insert(0, configured_model)
    elif configured_model and configured_model in doc_models:
        doc_models.remove(configured_model)
        doc_models.insert(0, configured_model)

    last_error = None
    for model in doc_models:
        try:
            log_event("doc_extraction_attempt", model=model, fileName=file_name)
            result = extract_with_text_model(pdf_text, model=model)
            log_event("doc_extraction_success", model=model, fileName=file_name)
            return result
        except Exception as exc:
            last_error = exc
            log_event("doc_extraction_failed", model=model, fileName=file_name, error=str(exc))

    raise RuntimeError(f"All document extraction attempts failed. Last error: {last_error}")


def extract_invoice_with_alibaba_ai(file_bytes: bytes, file_name: str, mime_type: str) -> dict:
    if mime_type in IMAGE_MIME_TYPES:
        data = call_qwen_ocr(file_bytes, mime_type)
        validate_document_type(data)
        return data

    if mime_type == "application/pdf":
        data = call_qwen_doc(file_bytes, file_name)
        validate_document_type(data)
        return data

    raise ValueError("Unsupported file type. Allowed types: PDF, JPG, PNG")


def post_to_aws_webhook(invoice_id: str, extracted_data: dict, user_id: str = "", shipment_number: str = "", contact_email: str = ""):
    aws_webhook_url = os.getenv("AWS_WEBHOOK_URL")
    if not aws_webhook_url:
        raise RuntimeError("AWS_WEBHOOK_URL is not configured")

    payload = {
        "invoiceId": invoice_id,
        "userId": user_id,
        "amount": extracted_data["extractedAmount"],
        "status": "PENDING_SCORING",
        "extractedData": extracted_data,
        "timestamp": utc_now_iso(),
        "source": "alibaba_cloud_model_studio",
    }
    if shipment_number:
        payload["shipmentNumber"] = shipment_number
    if contact_email:
        payload["contactEmail"] = contact_email

    response = requests.post(
        aws_webhook_url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    if response.status_code >= 400:
        log_event(
            "aws_webhook_non_2xx",
            invoiceId=invoice_id,
            awsStatusCode=response.status_code,
            awsResponseBody=response.text[:2000],
            sentPayload=payload,
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
        file_bytes, file_name, mime_type, user_id, shipment_number, contact_email = extract_upload_from_request(environ)
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
    except ValueError as exc:
        # Validation errors (wrong document type, unsupported file type) are client errors
        log_event("invoice_upload_validation_failed", requestId=request_id, fileName=file_name, reason=str(exc))
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
    except RuntimeError as exc:
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
        webhook_response = post_to_aws_webhook(invoice_id, extracted_data, user_id, shipment_number, contact_email)
        log_event(
            "aws_webhook_response_received",
            requestId=request_id,
            invoiceId=invoice_id,
            userId=user_id,
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
        # Parse the webhook response body to extract the offer data
        # The AWS webhook Lambda creates the offer synchronously, so the
        # offer is already available in the response – no need to poll.
        try:
            webhook_data = webhook_response.json()
        except Exception:
            webhook_data = {}

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
                    "offer": webhook_data.get("offer"),
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
