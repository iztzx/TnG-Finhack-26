# Out&In Agent — Node Backend

Express backend for invoice storage, shipment tracking, DynamoDB persistence, and Alibaba Qwen RAG chat.

## Node API Setup

```bash
cd backend
npm install
cp .env.example .env
```

Put API keys and table names in `backend/.env`:

```bash
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=ap-southeast-1
CREATE_DYNAMODB_TABLES=true
DYNAMODB_TABLE_SHIPMENTS=Shipments
DYNAMODB_TABLE_INVOICES=Invoices
QWEN_API_KEY=your_qwen_dashscope_api_key
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

Run the server:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

The server starts on `PORT` or `4000`.

## Node API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/shipment/:id` | Get shipment location, status, and financing eligibility |
| POST | `/api/shipment/update` | Update shipment location and auto-calculate status |
| GET | `/api/invoice/:id` | Get invoice amount, risk score, fee, and status |
| POST | `/api/invoice/create` | Create invoice record |
| POST | `/api/chat` | Fetch real invoice and shipment context, build RAG prompt, and call Qwen |

## Request Examples

```bash
curl -X POST http://localhost:4000/api/invoice/create \
  -H "Content-Type: application/json" \
  -d '{"id":"INV-001","userId":"USER-001","amount":15000,"riskScore":"LOW","fee":450,"status":"OFFER_READY"}'
```

```bash
curl -X POST http://localhost:4000/api/shipment/update \
  -H "Content-Type: application/json" \
  -d '{"id":"SHIP-001","userId":"USER-001","lat":6.5,"lng":101.2}'
```

```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER-001","message":"Where is my shipment and is it eligible for financing?"}'
```

Set `CREATE_DYNAMODB_TABLES=false` to disable automatic DynamoDB table creation on startup.

If you copied `.env.example`, replace the placeholder AWS values before running the real API. The sample values are intentionally invalid and DynamoDB will reject them.

# TnG FinHack 26 — AWS Backend

Serverless AWS backend for the Touch 'n Go FinHack 2026 hackathon demo.

## Architecture

- **API Gateway** (`tng-finhack-api`) — REST API with CORS enabled
- **Lambda: Credit Scoring** (`tng-finhack-credit-scoring`) — Python 3.12, 256MB
- **Lambda: Excel Reconciliation** (`tng-finhack-excel-reconciliation`) — Python 3.12, 512MB, openpyxl layer
- **DynamoDB** — `tng-finhack-transactions` (PK=userId, SK=timestamp) + `tng-finhack-risk-scores` (PK=userId)

## API Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/trigger` | Credit Scoring | Trigger credit scoring for a user |
| GET | `/transactions/{userId}` | Credit Scoring | Fetch last 50 transactions for a user |
| GET | `/reconciliation/download` | Excel Reconciliation | Download Excel reconciliation report |
| GET | `/telemetry/latest` | Credit Scoring | Mock IoT telemetry data |
| OPTIONS | `*` | All | CORS preflight |

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- AWS SAM CLI installed
- Python 3.12+
- PowerShell (for `deploy.ps1`)

## Deployment

### Quick Deploy (Windows PowerShell)

```powershell
cd backend
.\scripts\deploy.ps1
```

Or manually:

```powershell
sam build
sam deploy --guided
```

### Deployment Parameters

The `samconfig.toml` is pre-configured for:
- **Region:** `ap-southeast-1` (Singapore)
- **Stack Name:** `tng-finhack-26`
- **Capabilities:** `CAPABILITY_IAM`

During first deploy, SAM will prompt for confirmation. Subsequent deploys use:

```powershell
sam deploy
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TXN_TABLE` | `tng-finhack-transactions` | DynamoDB transactions table |
| `RISK_TABLE` | `tng-finhack-risk-scores` | DynamoDB risk scores table |

These are injected automatically by the SAM template.

## Seeding Demo Data

After deployment, populate DynamoDB with realistic Malaysian transactions:

```powershell
$env:TXN_TABLE = "tng-finhack-transactions"
$env:RISK_TABLE = "tng-finhack-risk-scores"
python scripts\seed-data.py
```

This creates 60 transactions and 40 risk score records.

## Testing

### Trigger Credit Scoring

```powershell
$API_URL = "https://<API-ID>.execute-api.ap-southeast-1.amazonaws.com/dev"
Invoke-RestMethod -Uri "$API_URL/trigger" -Method POST -ContentType "application/json" -Body '{"userId":"ahmad-bin-ismail-123"}'
```

### Get Transactions

```powershell
Invoke-RestMethod -Uri "$API_URL/transactions/ahmad-bin-ismail-123" -Method GET
```

### Download Reconciliation Report

```powershell
Invoke-WebRequest -Uri "$API_URL/reconciliation/download" -OutFile "reconciliation.xlsx"
```

### Get Telemetry

```powershell
Invoke-RestMethod -Uri "$API_URL/telemetry/latest" -Method GET
```

## Project Structure

```
backend/
├── template.yaml              # SAM infrastructure template
├── samconfig.toml             # SAM deployment config
├── README.md                  # This file
├── scripts/
│   ├── deploy.ps1             # PowerShell deploy script
│   └── seed-data.py           # DynamoDB seed script
└── lambda/
    ├── credit-scoring/
    │   ├── handler.py         # Credit scoring Lambda
    │   └── requirements.txt   # boto3
    └── excel-reconciliation/
        ├── handler.py         # Excel report Lambda
        └── requirements.txt   # boto3, openpyxl
```

## Notes

- All Lambda handlers return full CORS headers.
- DynamoDB numeric fields use `decimal.Decimal` for compatibility.
- The Excel reconciliation Lambda uses a Lambda Layer for `openpyxl`.
- The credit scoring function currently uses a deterministic mock scorer; it will be replaced with a real ML model in Task 4.
