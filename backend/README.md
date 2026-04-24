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
