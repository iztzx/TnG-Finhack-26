# Multi-Cloud Setup Guide

## AWS + Alibaba Cloud Integration

This guide covers the current invoice-ingestion path:

```text
Frontend (React)
  -> Alibaba Cloud Function Compute
  -> Alibaba Cloud Model Studio OCR / document extraction
  -> AWS API Gateway webhook
  -> AWS Lambda
  -> DynamoDB
```

## Phase 1: Deploy AWS

```bash
cd backend
sam build
sam deploy --guided
```

After deployment, copy the `InvoiceWebhookUrl` output.

## Phase 2: Deploy Alibaba Cloud

### 1. Configure Alibaba CLI
```bash
aliyun configure
```

### 2. Install Funcraft
```bash
npm install -g @alicloud/fun
```

### 3. Prepare deployment parameters
Have these values ready for `fun deploy`:

```text
AwsWebhookUrl=https://YOUR-AWS-WEBHOOK-URL
DashScopeApiKey=YOUR_MODEL_STUDIO_API_KEY
DashScopeBaseUrl=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
DashScopeOcrModel=qwen-vl-ocr
DashScopeDocApiKey=OPTIONAL_PDF_KEY
DashScopeDocBaseUrl=https://dashscope.aliyuncs.com/compatible-mode/v1
DashScopeDocModel=qwen-doc-turbo
```

Notes:
- Images use `Qwen-OCR`
- PDFs use the file API plus `Qwen-Doc-Turbo`
- `qwen-doc-turbo` currently targets the China endpoint, so PDF extraction may need a China-region key

### 4. Deploy Alibaba Function Compute
```bash
cd alibaba
chmod +x deploy.sh
./deploy.sh
```

Capture the `InvoiceUploadUrl` output after deployment.

## Phase 3: Configure Frontend

Update the frontend API constants or environment configuration with:
- Alibaba invoice upload URL
- AWS API base URL

## Testing

### End-to-end upload
```bash
curl -X POST \
  https://YOUR-ALIBABA-FC-URL \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-invoice.pdf"
```

Expected response shape:
```json
{
  "success": true,
  "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Invoice uploaded, extracted by Alibaba Cloud AI, and forwarded successfully"
}
```

### Verify AWS persistence
```bash
aws dynamodb get-item \
  --table-name tng-finhack-invoices \
  --key '{"id": {"S": "YOUR-INVOICE-ID"}}'
```

## Monitoring

### AWS
```bash
aws logs tail /aws/lambda/tng-finhack-invoice-webhook --follow
```

### Alibaba Cloud
1. Open Function Compute
2. Select `InvoiceProcessingService`
3. Open `InvoiceUploadFunction`
4. Review invocation logs

## Cost Notes

1. DynamoDB is already on-demand
2. Keep Function Compute memory right-sized
3. Use the international OCR endpoint for images when possible
4. Reserve China-region document parsing only for PDFs if required

## Security Checklist

- Rotate AWS and Alibaba Cloud keys regularly
- Enable CloudTrail and ActionTrail
- Keep IAM and RAM roles minimal
- Use HTTPS-only endpoints
- Add API rate limiting where appropriate
