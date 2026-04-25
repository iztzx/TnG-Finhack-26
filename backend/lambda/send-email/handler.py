"""
AWS Lambda handler for the Auto-Emailer – Notice of Assignment.

When the SME clicks "Accept" on the platform, this Lambda is invoked to:
  1. Look up the invoice details from DynamoDB (Invoices table).
  2. Look up the buyer email from DynamoDB (Users table) using the buyerName.
  3. Compose a professional Notice of Assignment email per the Receivables
     Assignment Agreement between Out & In Sdn Bhd and the Assignor.
  4. Send the email via AWS SES with the agreement PDF attached.
  5. Record the email event in the Invoices table for audit.

Standards:
  - aws-lambda-powertools for structured JSON logging
  - pydantic for strict request payload validation
  - boto3 SES for email delivery
"""

import json
import os
import uuid
import base64
from datetime import datetime, timezone
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

import boto3
from boto3.dynamodb.conditions import Attr
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths
from pydantic import BaseModel, Field, ValidationError

# ---------------------------------------------------------------------------
# Structured logger
# ---------------------------------------------------------------------------
logger = Logger(
    service="send-email",
    level=os.getenv("LOG_LEVEL", "INFO"),
)

# ---------------------------------------------------------------------------
# DynamoDB – table names injected via SAM environment variables
# ---------------------------------------------------------------------------
dynamodb = boto3.resource("dynamodb")
USERS_TABLE = os.environ["USERS_TABLE"]
INVOICES_TABLE = os.environ["INVOICES_TABLE"]
OFFERS_TABLE = os.environ["OFFERS_TABLE"]

users_table = dynamodb.Table(USERS_TABLE)
invoices_table = dynamodb.Table(INVOICES_TABLE)
offers_table = dynamodb.Table(OFFERS_TABLE)

# ---------------------------------------------------------------------------
# AWS SES client
# ---------------------------------------------------------------------------
ses_client = boto3.client("ses", region_name=os.environ.get("SES_REGION", "ap-southeast-1"))
S3_BUCKET = os.environ.get("S3_BUCKET", "")
s3_client = boto3.client("s3")

# ---------------------------------------------------------------------------
# Sender email – must be verified in SES
# ---------------------------------------------------------------------------
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "outandin@gmail.com")
SENDER_NAME = "Out&In Sdn Bhd"

# ---------------------------------------------------------------------------
# CORS headers
# ---------------------------------------------------------------------------
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


# ===================================================================
# Pydantic model – strict input validation
# ===================================================================

class SendEmailRequest(BaseModel):
    """Request body for the send-email endpoint."""
    invoiceId: str = Field(..., min_length=1, description="The Invoice ID")
    offerId: str = Field(..., min_length=1, description="The Offer ID that was accepted")
    buyerEmail: Optional[str] = Field(None, description="Override buyer email (optional)")
    buyerCompanyName: Optional[str] = Field(None, description="Override buyer company name")
    smeCompanyName: Optional[str] = Field(None, description="SME company name (Assignor)")
    invoiceNumber: Optional[str] = Field(None, description="Invoice number")
    invoiceDate: Optional[str] = Field(None, description="Invoice date")
    invoiceAmount: Optional[float] = Field(None, description="Invoice amount")
    currency: Optional[str] = Field("RM", description="Currency code")


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


# ===================================================================
# Email HTML template
# ===================================================================

def build_email_html(
    buyer_company_name: str,
    invoice_number: str,
    invoice_date: str,
    sme_company_name: str,
    invoice_amount: float,
    currency: str,
) -> str:
    """Build the professional Notice of Assignment email in HTML."""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notice of Assignment – Out&In Sdn Bhd</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f6f9;color:#1a1a2e;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#003d82 0%,#005abb 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                OUT&IN SDN BHD
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">
                Notice of Assignment of Receivables
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
                Dear <strong>{buyer_company_name}</strong>,
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
                We hereby inform you that the receivable arising from Invoice No. <strong>{invoice_number}</strong>,
                dated <strong>{invoice_date}</strong>, issued by <strong>{sme_company_name}</strong>,
                in the amount of <strong>{currency} {invoice_amount:,.2f}</strong>,
                has been legally assigned to <strong>Out&In Sdn Bhd</strong>.
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
                Effective immediately, all payments relating to this invoice must be made directly to
                the account of Out&In Sdn Bhd as detailed below:
              </p>

              <!-- Bank Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;border-radius:8px;padding:20px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="4" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;font-weight:600;color:#003d82;width:160px;">Bank Name:</td>
                        <td style="font-size:14px;color:#1a1a2e;">Public Bank</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;font-weight:600;color:#003d82;">Account Name:</td>
                        <td style="font-size:14px;color:#1a1a2e;">Out&In Sdn Bhd</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;font-weight:600;color:#003d82;">Account Number:</td>
                        <td style="font-size:14px;color:#1a1a2e;font-weight:600;">509410012763778</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;font-weight:600;color:#003d82;">SWIFT Code:</td>
                        <td style="font-size:14px;color:#1a1a2e;">PBBEMYKLXXX</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#d32f2f;font-weight:600;">
                Please note that payment to any other party will not discharge your payment obligation
                for this invoice.
              </p>

              <!-- Agreement Excerpt -->
              <div style="background-color:#fafafa;border-left:4px solid #005abb;border-radius:0 8px 8px 0;padding:18px 20px;margin:0 0 24px;">
                <p style="font-size:13px;font-weight:700;color:#003d82;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">
                  Key Terms of Assignment (Excerpt)
                </p>
                <ul style="font-size:13px;line-height:1.8;color:#333;margin:0;padding-left:18px;">
                  <li>The receivable has been irrevocably and unconditionally assigned to Out&In Sdn Bhd with full title guarantee (Clause 3.1).</li>
                  <li>All payments must be made directly and exclusively to Out&In Sdn Bhd or to such account as Out&In directs (Clause 5.3(a)).</li>
                  <li>Any payment made to the Assignor after receipt of this notice shall not constitute a valid discharge of your payment obligation (Clause 5.3(b)).</li>
                  <li>The Buyer shall not set off any amount payable to Out&In against any amount owed by the Assignor (Clause 13.2).</li>
                  <li>This assignment constitutes a true sale and absolute transfer of the receivable, not a security arrangement (Clause 3.3).</li>
                  <li>Out&In Sdn Bhd holds full rights to collect, receive, and enforce payment including through legal proceedings (Clause 3.2).</li>
                  <li>This Agreement is governed by the laws of Malaysia, including the Contracts Act 1950 and the Civil Law Act 1956 (Clause 17).</li>
                </ul>
              </div>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
                Kindly confirm receipt of this notice and acknowledge the assignment by replying to this email.
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#d32f2f;font-weight:500;">
                Failure to comply with the payment terms may result in further legal action and
                potential reporting to relevant credit agencies.
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
                Kindly read through the document as attached for further information.
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 8px;">
                If you have any questions, please contact us at
                <a href="mailto:outandin@gmail.com" style="color:#005abb;text-decoration:none;font-weight:600;">outandin@gmail.com</a>.
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 8px;">
                Thank you for your cooperation.
              </p>

              <p style="font-size:15px;line-height:1.7;margin:24px 0 0;">
                Sincerely,<br>
                <strong style="color:#003d82;">Out&In Sdn Bhd</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fb;padding:20px 40px;border-top:1px solid #e8eaef;">
              <p style="font-size:11px;color:#999;margin:0;text-align:center;line-height:1.6;">
                This is an automated notification from Out&In Sdn Bhd's invoice financing platform.<br>
                &copy; {datetime.now().year} Out&In Sdn Bhd. All rights reserved.<br>
                <a href="https://outin.com.my" style="color:#005abb;text-decoration:none;">outin.com.my</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


def build_email_plain(
    buyer_company_name: str,
    invoice_number: str,
    invoice_date: str,
    sme_company_name: str,
    invoice_amount: float,
    currency: str,
) -> str:
    """Build the plain-text version of the Notice of Assignment email."""

    return f"""Dear {buyer_company_name},

We hereby inform you that the receivable arising from Invoice No. {invoice_number}, dated {invoice_date}, issued by {sme_company_name}, in the amount of {currency} {invoice_amount:,.2f}, has been legally assigned to Out&In Sdn Bhd.

Effective immediately, all payments relating to this invoice must be made directly to the account of Out&In Sdn Bhd as detailed below:

  Bank Name:       Public Bank
  Account Name:    Out&In Sdn Bhd
  Account Number:  509410012763778
  SWIFT Code:      PBBEMYKLXXX

Please note that payment to any other party will not discharge your payment obligation for this invoice.

KEY TERMS OF ASSIGNMENT (EXCERPT):
  • The receivable has been irrevocably and unconditionally assigned to Out&In Sdn Bhd with full title guarantee (Clause 3.1).
  • All payments must be made directly and exclusively to Out&In Sdn Bhd or to such account as Out&In directs (Clause 5.3(a)).
  • Any payment made to the Assignor after receipt of this notice shall not constitute a valid discharge of your payment obligation (Clause 5.3(b)).
  • The Buyer shall not set off any amount payable to Out&In against any amount owed by the Assignor (Clause 13.2).
  • This assignment constitutes a true sale and absolute transfer of the receivable, not a security arrangement (Clause 3.3).
  • Out&In Sdn Bhd holds full rights to collect, receive, and enforce payment including through legal proceedings (Clause 3.2).
  • This Agreement is governed by the laws of Malaysia, including the Contracts Act 1950 and the Civil Law Act 1956 (Clause 17).

Kindly confirm receipt of this notice and acknowledge the assignment by replying to this email.

Failure to comply with the payment terms may result in further legal action and potential reporting to relevant credit agencies.

Kindly read through the document as attached for further information.

If you have any questions, please contact us at outandin@gmail.com.

Thank you for your cooperation.

Sincerely,
Out&In Sdn Bhd
"""


# ===================================================================
# Lambda handler
# ===================================================================

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
def handler(event, context):
    """
    POST /api/email/send-assignment-notice

    Sends a Notice of Assignment email to the buyer when the SME
    accepts the financing offer.
    """
    # Handle CORS preflight
    if event.get("httpMethod", "") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    request_id = context.aws_request_id if context else str(uuid.uuid4())
    logger.append_keys(request_id=request_id)

    # ------------------------------------------------------------------
    # 1. Parse & validate request body
    # ------------------------------------------------------------------
    try:
        raw_body = event.get("body", "{}") or "{}"
        body = json.loads(raw_body)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("Failed to parse request body", extra={"error": str(exc)})
        return _bad_request("Invalid JSON in request body")

    try:
        request = SendEmailRequest(**body)
    except ValidationError as exc:
        error_details = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        logger.error("Payload validation failed", extra={"validationErrors": error_details})
        return _bad_request("Payload validation failed", errors=error_details)

    logger.info("Email request validated", extra={
        "invoiceId": request.invoiceId,
        "offerId": request.offerId,
    })

    # ------------------------------------------------------------------
    # 2. Resolve invoice details from DynamoDB or request body
    # ------------------------------------------------------------------
    buyer_company_name = request.buyerCompanyName or "Valued Customer"
    buyer_email = request.buyerEmail
    sme_company_name = request.smeCompanyName or "Assignor"
    invoice_number = request.invoiceNumber or request.invoiceId
    invoice_date = request.invoiceDate or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    invoice_amount = request.invoiceAmount or 0.0
    currency = request.currency or "RM"

    # Try to fetch additional details from DynamoDB if not provided in request
    if not buyer_email or buyer_company_name == "Valued Customer":
        try:
            # Try to look up the invoice in the Invoices table
            # The invoices table uses (id) as PK
            inv_response = invoices_table.get_item(Key={"id": request.invoiceId})
            invoice_item = inv_response.get("Item")

            if invoice_item:
                if not buyer_email:
                    # Look up buyer email by buyerName in Users table
                    buyer_name = invoice_item.get("buyerName", "")
                    if buyer_name:
                        buyer_company_name = buyer_name
                        # Scan users table for a matching companyName
                        scan_response = users_table.scan(
                            FilterExpression=Attr("companyName").eq(buyer_name),
                            Limit=1,
                        )
                        if scan_response.get("Items"):
                            buyer_user = scan_response["Items"][0]
                            buyer_email = buyer_user.get("email", "")
                            logger.info("Buyer email resolved from DynamoDB", extra={
                                "buyerEmail": buyer_email,
                                "buyerCompanyName": buyer_company_name,
                            })

                if not invoice_number or invoice_number == request.invoiceId:
                    invoice_number = invoice_item.get("invoiceNumber", invoice_number)
                if not invoice_date or invoice_date == datetime.now(timezone.utc).strftime("%Y-%m-%d"):
                    invoice_date = invoice_item.get("invoiceDate", invoice_date)
                if not invoice_amount:
                    raw_amount = invoice_item.get("amount", 0)
                    invoice_amount = float(raw_amount)
                if not sme_company_name or sme_company_name == "Assignor":
                    sme_company_name = invoice_item.get("vendorName", sme_company_name)
                if not currency or currency == "RM":
                    currency = invoice_item.get("currency", currency)

        except Exception as exc:
            logger.warning("Failed to look up invoice/buyer in DynamoDB – using request data", extra={
                "error": str(exc),
                "invoiceId": request.invoiceId,
            })

    # If we still don't have a buyer email, return error
    if not buyer_email:
        logger.error("No buyer email available", extra={"invoiceId": request.invoiceId})
        return _response(422, {
            "error": "Unprocessable Entity",
            "detail": "Buyer email address is required but could not be resolved. "
                       "Please provide buyerEmail in the request body.",
        })

    logger.info("Email details resolved", extra={
        "buyerEmail": buyer_email,
        "buyerCompanyName": buyer_company_name,
        "invoiceNumber": invoice_number,
        "smeCompanyName": sme_company_name,
        "invoiceAmount": invoice_amount,
    })

    # ------------------------------------------------------------------
    # 3. Build email
    # ------------------------------------------------------------------
    subject = f"NOTICE OF ASSIGNMENT – Invoice {invoice_number} – Out&In Sdn Bhd"

    html_body = build_email_html(
        buyer_company_name=buyer_company_name,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        sme_company_name=sme_company_name,
        invoice_amount=invoice_amount,
        currency=currency,
    )

    plain_body = build_email_plain(
        buyer_company_name=buyer_company_name,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        sme_company_name=sme_company_name,
        invoice_amount=invoice_amount,
        currency=currency,
    )

    # ------------------------------------------------------------------
    # 4. Send email via SES (with optional PDF attachment)
    # ------------------------------------------------------------------
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        # Build MIME message for attachment support
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg["To"] = buyer_email

        # Email body (alternative: HTML + plain text)
        msg_body = MIMEMultipart("alternative")
        msg_body.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg_body.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(msg_body)

        # Try to attach the agreement PDF from S3 if bucket is configured
        pdf_attached = False
        if S3_BUCKET:
            try:
                pdf_key = "agreements/Out_In_TNC_Agreement_Professional.pdf"
                pdf_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=pdf_key)
                pdf_data = pdf_obj["Body"].read()

                attachment = MIMEApplication(pdf_data)
                attachment.add_header(
                    "Content-Disposition", "attachment",
                    filename="Out_In_Receivables_Assignment_Agreement.pdf",
                )
                msg.attach(attachment)
                pdf_attached = True
                logger.info("Agreement PDF attached from S3", extra={"bucket": S3_BUCKET, "key": pdf_key})
            except Exception as s3_exc:
                logger.warning("Could not attach PDF from S3 – sending without attachment", extra={
                    "error": str(s3_exc),
                })

        # Send via SES raw email (supports attachments)
        ses_response = ses_client.send_raw_email(
            Source=f"{SENDER_NAME} <{SENDER_EMAIL}>",
            Destinations=[buyer_email],
            RawMessage={"Data": msg.as_string()},
        )

        message_id = ses_response.get("MessageId", "")
        logger.info("Email sent successfully via SES", extra={
            "messageId": message_id,
            "buyerEmail": buyer_email,
            "pdfAttached": pdf_attached,
        })

    except Exception as ses_exc:
        logger.error("Failed to send email via SES", extra={
            "error": str(ses_exc),
            "buyerEmail": buyer_email,
        })

        # Fallback: log the email content for manual sending
        logger.info("EMAIL CONTENT FOR MANUAL SENDING", extra={
            "to": buyer_email,
            "subject": subject,
            "body_preview": plain_body[:500],
        })

        return _response(200, {
            "status": "QUEUED",
            "detail": "Email could not be sent via SES (sandbox/config issue). "
                       "The email has been logged for manual delivery.",
            "recipient": buyer_email,
            "subject": subject,
            "invoiceId": request.invoiceId,
            "offerId": request.offerId,
            "emailContent": {
                "to": buyer_email,
                "from": SENDER_EMAIL,
                "subject": subject,
                "bodyPreview": plain_body[:200] + "...",
            },
            "sentAt": now_utc,
        })

    # ------------------------------------------------------------------
    # 5. Record email event in Invoices table (audit trail)
    # ------------------------------------------------------------------
    try:
        invoices_table.update_item(
            Key={"id": request.invoiceId},
            UpdateExpression="SET emailSentTo = :to, emailSentAt = :at, emailMessageId = :mid, updatedAt = :ua",
            ExpressionAttributeValues={
                ":to": buyer_email,
                ":at": now_utc,
                ":mid": message_id,
                ":ua": now_utc,
            },
        )
    except Exception as exc:
        # Non-fatal – email was already sent
        logger.warning("Failed to record email audit trail", extra={
            "error": str(exc),
            "invoiceId": request.invoiceId,
        })

    # ------------------------------------------------------------------
    # 6. Return success response
    # ------------------------------------------------------------------
    return _response(200, {
        "status": "SENT",
        "messageId": message_id,
        "recipient": buyer_email,
        "buyerCompanyName": buyer_company_name,
        "subject": subject,
        "invoiceId": request.invoiceId,
        "offerId": request.offerId,
        "pdfAttached": pdf_attached,
        "sentAt": now_utc,
    })
