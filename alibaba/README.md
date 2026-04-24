# Alibaba Cloud Invoice Processing Setup

## Architecture
This component handles invoice document ingestion with Alibaba Cloud Function Compute and Model Studio.

Flow:
1. Frontend uploads a PDF or image invoice to the Alibaba HTTP endpoint.
2. Function Compute validates the upload and routes images to `Qwen-OCR` or PDFs to `Qwen-Doc-Turbo`.
3. Structured invoice JSON is posted to the AWS webhook.
4. AWS persists the invoice and continues scoring and offer generation.

## Prerequisites

1. Alibaba Cloud account with Function Compute and Model Studio enabled
2. Alibaba Cloud CLI installed and configured
3. Funcraft installed
4. One or two Model Studio API keys

## Setup Instructions

### 1. Configure Alibaba Cloud CLI
```bash
pip install aliyun-cli
aliyun configure
```

### 2. Install Funcraft
```bash
npm install -g @alicloud/fun
```

### 3. Prepare deployment parameters
`fun deploy` will prompt for template parameters. Have these values ready:

- `AwsWebhookUrl`: AWS invoice webhook URL from the SAM stack outputs
- `DashScopeApiKey`: Model Studio API key for image OCR
- `DashScopeBaseUrl`: usually `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- `DashScopeOcrModel`: usually `qwen-vl-ocr`
- `DashScopeDocApiKey`: optional dedicated PDF extraction key
- `DashScopeDocBaseUrl`: usually `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `DashScopeDocModel`: usually `qwen-doc-turbo`

Important:
- `qwen-doc-turbo` currently uses the China (Beijing) endpoint.
- If you want PDF extraction, you may need a China-region Model Studio key even if image OCR stays on the international endpoint.

### 4. Deploy to Alibaba Cloud
```bash
cd alibaba
chmod +x deploy.sh
./deploy.sh
```

### 5. Capture the function URL
After deployment, Funcraft prints the HTTP trigger URL:
```text
InvoiceUploadUrl: https://ACCOUNT-ID.ap-southeast-1.fc.aliyuncs.com/...
```

Use that URL in the frontend invoice upload flow.

## Testing

### Test invoice upload
```bash
curl -X POST \
  https://YOUR-FC-URL/invoice-upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample-invoice.pdf"
```

Expected response shape:
```json
{
  "success": true,
  "requestId": "uuid",
  "invoiceId": "uuid",
  "message": "Invoice uploaded, extracted by Alibaba Cloud AI, and forwarded successfully",
  "data": {
    "mimeType": "application/pdf",
    "extractedData": {
      "extractedAmount": 8500.0,
      "currency": "MYR",
      "merchantName": "Global Supply Co"
    }
  }
}
```

## Extraction Modes

- `JPG` and `PNG` uploads use Model Studio `Qwen-OCR`
- `PDF` uploads use the OpenAI-compatible file interface plus `Qwen-Doc-Turbo`
- All paths emit structured JSON logs and use timeout-bounded AWS webhook delivery

## Monitoring

View logs in Alibaba Cloud Console:
1. Open Function Compute
2. Select `InvoiceProcessingService`
3. Open `InvoiceUploadFunction`
4. Review invocation logs

## Cost Notes

- Function Compute cost is low at hackathon scale
- Model Studio cost depends on token usage, document size, and selected region/model
- PDF extraction typically costs more than image OCR because of document parsing overhead
