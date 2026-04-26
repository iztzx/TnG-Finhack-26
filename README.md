# OUT&IN — AI-Powered Invoice Financing Platform

**Invoice Financing at the Speed of AI** — Multi-cloud supply chain capital for Malaysian SMEs

Group: Indecisive | TnG FinHack 26

---

## Overview

OUT&IN is a multi-cloud fintech platform that advances up to **95% of invoice value in seconds**, not months. It combines **Alibaba Cloud Document AI** (Qwen VL models) for instant invoice extraction, **AWS Lambda** for ML credit scoring and idempotent disbursement, and **real-time shipment tracking** (satellite imagery, carrier APIs, customs events) to underwrite shipments — not business owners.

**Key Features:**
- **Multi-Cloud Architecture** — Alibaba Cloud (Document AI + AI Chat) + AWS (Scoring + Disbursement + Email)
- **Instant Invoice Extraction** — Upload a PDF/image, Qwen VL extracts amount, merchant, dates in seconds
- **Route-Based Underwriting** — Credit scoring based on shipment routes and cargo data, not HITA
- **Idempotent Disbursement** — Atomic wallet balance updates via DynamoDB ADD with rollback on failure
- **AI Finance Assistant** — Qwen-powered chatbot for trade finance questions + executive summaries
- **Real-Time Shipment Tracking** — GPS, satellite imagery, customs events, carrier APIs across SE Asia
- **Notice of Assignment** — Automated buyer notification emails via AWS SES with PDF attachment
- **Admin Command Center** — Full admin panel for treasury, approvals, risk operations, and audit
- **JWT Authentication** — Registration, login, profile management, password reset/change
- **Excel Reconciliation** — Download formatted transaction reports for accounting

---

## Architecture

```
                              OUT&IN Platform
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
     Alibaba Cloud             AWS Cloud               Frontend
            │                       │                       │
  ┌─────────┴─────────┐  ┌───────┴────────┐       ┌───────┴───────┐
  │ Function Compute   │  │ Lambda Functions│       │ React + Vite  │
  │ ─ invoice-upload   │  │ ─ auth          │       │ ─ Landing     │
  │ ─ Qwen VL (OCR)   │  │ ─ invoice-webhook│      │ ─ Dashboard   │
  │ ─ Qwen (Chat)     │  │ ─ credit-scoring│       │ ─ Financing   │
  │ ─ Qwen (Summary)  │  │ ─ disburse      │       │ ─ Shipments   │
  │                    │  │ ─ send-email    │       │ ─ Admin Panel │
  │ DashScope API      │  │ ─ reconciliation│       │ ─ AI Assistant│
  │ ─ qwen-vl-max      │  │                 │       │ ─ Profile     │
  │ ─ qwen-plus        │  │ DynamoDB        │       └───────────────┘
  │ ─ qwen-vl-ocr      │  │ ─ users         │              │
  │                    │  │ ─ invoices      │       Vercel (CDN)
  │ S3 (invoices)      │  │ ─ offers        │
  └────────────────────┘  │ ─ transactions  │
            │              │                 │
            └───── POST ──▶│ SES (email)     │
              webhook       └─────────────────┘
```

### Multi-Cloud Financing Flow (3 Phases)

```
Phase 1 — INGESTION (Alibaba Cloud)            Phase 2 — SCORING (AWS)              Phase 3 — DISBURSEMENT (AWS)
──────────────────────────────────             ─────────────────────              ────────────────────────────
SME uploads invoice (PDF/JPG/PNG)              Webhook Lambda receives              SME accepts offer
        │                                      extracted data                              │
        ▼                                              ▼                                  ▼
Qwen VL extracts:                              Persists to DynamoDB                 Idempotency check
  • Amount, Currency                           (InvoicesTable)                      (no double-disburse)
  • Merchant, Buyer                            Runs ML scoring                            │
  • Invoice#, Dates                           Persists Offer (OffersTable)               ▼
        │                                              │                        Atomic status transition
        ▼                                              ▼                        (PENDING → ACCEPTED)
POST to AWS webhook                            Returns offer to frontend                    │
(invoiceId + extractedData)                                                              ▼
        │                                     SME sees offer on                   DuitNow mock payment
        ▼                                     Financing page                            │
Frontend displays                               │                                  ▼
extraction result                               ▼                          Write transaction ledger
                                        Accept / Reject                          (TransactionsTable)
                                                                                 │
                                                                                 ▼
                                                                      Atomic wallet balance update
                                                                      (DynamoDB ADD expression)
                                                                                 │
                                                                                 ▼
                                                                      Send Notice of Assignment
                                                                      (SES email to buyer)
```

### Component Breakdown

| Component | Cloud | Tech Stack | Purpose |
|-----------|-------|-----------|---------|
| **Frontend** | Vercel | React 19 + Vite + Tailwind CSS 4 | SME dashboard, financing, admin panel |
| **Invoice Upload** | Alibaba Cloud | Function Compute + Qwen VL | Document AI extraction from invoices |
| **AI Chat** | Alibaba Cloud | Function Compute + Qwen | Finance assistant & executive summaries |
| **Auth** | AWS | Lambda + DynamoDB + JWT | Registration, login, password management |
| **Invoice Webhook** | AWS | Lambda + DynamoDB + Pydantic | Receive extracted data, persist, run ML scoring |
| **Credit Scoring** | AWS | Lambda + scikit-learn | Route-based risk scoring & analytics |
| **Disbursement** | AWS | Lambda + DynamoDB | Idempotent fund disbursement + wallet update |
| **Email** | AWS | Lambda + SES | Notice of Assignment to buyers |
| **Reconciliation** | AWS | Lambda + openpyxl | Excel transaction reports |
| **ML Pipeline** | Local | scikit-learn + pandas | Model training on synthetic SME data |

---

## Project Structure

```
TnG-Finhack-26/
├── frontend/                        # React 19 + Vite + Tailwind CSS 4
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx              # Marketing hero page
│   │   │   ├── Login.jsx                # JWT login
│   │   │   ├── Register.jsx             # SME registration
│   │   │   ├── Dashboard.jsx            # Financial overview + cash flow
│   │   │   ├── Financing.jsx            # Invoice upload → AI extraction → offer → accept
│   │   │   ├── Shipments.jsx            # GPS tracking, customs, waypoints
│   │   │   ├── Transactions.jsx         # Disbursement history
│   │   │   ├── ComplianceHub.jsx        # Regulatory & customs status
│   │   │   ├── Analytics.jsx            # Route analytics, risk charts
│   │   │   ├── ArchitectureDiagram.jsx  # Multi-cloud architecture visualization
│   │   │   ├── AIAssistant.jsx          # Qwen-powered finance chatbot
│   │   │   ├── Profile.jsx              # User profile & settings
│   │   │   └── admin/                   # Admin Command Center
│   │   │       ├── CommandCenter.jsx     # Treasury & approval overview
│   │   │       ├── ReviewQueue.jsx       # Pending invoice reviews
│   │   │       ├── SMEList.jsx           # SME directory
│   │   │       ├── MasterLedger.jsx      # Transaction ledger
│   │   │       ├── SystemHealth.jsx      # Infrastructure monitoring
│   │   │       └── AuditLog.jsx          # Immutable audit trail
│   │   ├── components/
│   │   │   ├── Sidebar.jsx              # SME navigation sidebar
│   │   │   ├── RiskGauge.jsx            # Risk score visualization
│   │   │   ├── TransactionTable.jsx     # Financing history table
│   │   │   ├── ComplianceBadge.jsx      # Customs/verification badges
│   │   │   ├── CreditAnimation.jsx       # Disbursement animations
│   │   │   ├── ToastContainer.jsx        # Global error/success toasts
│   │   │   ├── KPICard.jsx              # Dashboard KPI cards
│   │   │   ├── ErrorBoundary.jsx        # React error boundary
│   │   │   ├── TriggerButton.jsx        # Demo trigger
│   │   │   ├── auth/                    # ProtectedRoute, AdminRoute, AuthLayout
│   │   │   └── admin/                   # AdminSidebar
│   │   ├── context/
│   │   │   └── AuthContext.jsx           # JWT auth state + session management
│   │   ├── hooks/
│   │   │   └── useWebSocket.js          # Real-time shipment updates
│   │   ├── lib/
│   │   │   ├── api.js                   # All API calls (Alibaba + AWS)
│   │   │   └── constants.js             # API URLs, polling config
│   │   ├── scripts/
│   │   │   └── demo.js                  # Demo seed data
│   │   ├── App.jsx                      # Routes (SME + Admin)
│   │   └── main.jsx
│   ├── vercel.json                      # SPA rewrites for Vercel
│   └── package.json
│
├── alibaba/                            # Alibaba Cloud Function Compute
│   ├── function-compute/invoice-upload/
│   │   ├── index.py                     # Main WSGI handler (upload + chat + summary)
│   │   ├── app.py                       # Flask app (local dev)
│   │   ├── PyPDF2/                      # PDF text extraction
│   │   ├── dashscope/                   # DashScope SDK
│   │   └── requirements.txt
│   ├── s.yaml                           # Serverless Devs config (FC3)
│   ├── .env                             # DASHSCOPE_API_KEY, AWS_WEBHOOK_URL
│   └── deploy.sh                        # One-command deploy
│
├── backend/                            # AWS Lambda + SAM
│   ├── lambda/
│   │   ├── auth/                        # JWT auth (register, login, me, password mgmt)
│   │   ├── invoice-webhook/             # Receives Alibaba AI data, persists, scores, creates offer
│   │   ├── credit-scoring/              # Legacy scoring, shipment tracking, analytics
│   │   ├── disburse/                    # Idempotent disbursement + atomic wallet update
│   │   ├── send-email/                  # Notice of Assignment via SES
│   │   └── excel-reconciliation/        # Excel report generation
│   ├── template.yaml                    # SAM CloudFormation (6 Lambdas + 7 DynamoDB tables + S3)
│   ├── samconfig.toml
│   └── scripts/
│       ├── deploy.ps1                   # PowerShell deployment
│       ├── seed-data.py                 # Load test data
│       └── update-demo-passwords.py
│
├── ml/                                 # Machine Learning pipeline
│   ├── train_model.py                  # Train credit classifier + regressor
│   ├── feature_engineering.py          # SME feature extraction
│   ├── predict.py                      # Score new applications
│   ├── lambda_handler.py               # Lambda integration
│   ├── lambda_layer/python/ml/          # ML dependencies for Lambda
│   ├── models/                         # Trained model artifacts
│   │   ├── credit_classifier.pkl
│   │   ├── credit_regressor.pkl
│   │   ├── feature_importances.json
│   │   └── feature_names.json
│   ├── data/
│   │   └── synthetic_sme_data.csv       # 10k+ synthetic SME records
│   ├── generate_synthetic_data.py
│   └── requirements.txt
│
└── docs/
    ├── demo-script.md                  # Demo walkthrough
    ├── qa-prep.md                      # Testing guide
    ├── cloudshell-deployment.md        # AWS CloudShell deploy
    └── multi-cloud-setup.md            # Multi-cloud configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (frontend)
- **Python** 3.9+ (backend & ML)
- **AWS CLI** configured with credentials
- **AWS SAM CLI** (Lambda deployment)
- **Alibaba Cloud CLI** + Serverless Devs (`s`) (FC deployment)
- **Git** for version control

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:5173`

### 2. Backend Setup (AWS Lambda)

```bash
cd backend

# Deploy with SAM
sam build
sam deploy --guided

# Or use PowerShell script
.\scripts\deploy.ps1
```

### 3. Alibaba Cloud Function Compute

```bash
cd alibaba

# Set environment variables
cp .env.example .env
# Edit .env with your DASHSCOPE_API_KEY and AWS_WEBHOOK_URL

# Deploy with Serverless Devs
s deploy
```

### 4. ML Model Setup (Optional — pre-trained models included)

```bash
cd ml
pip install -r requirements.txt
python train_model.py
python create_lambda_layer.py
```

### Environment Variables

**Frontend (`.env`):**
```env
VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/dev
VITE_ALIBABA_FC_URL=https://YOUR-FC-ID.ap-southeast-3.fcapp.run
VITE_WS_URL=wss://your-ws-endpoint
VITE_REQUEST_TIMEOUT=30000
```

**Alibaba Cloud (`.env`):**
```env
DASHSCOPE_API_KEY=sk-your-key
DASHSCOPE_VISION_MODEL=qwen-vl-max
DASHSCOPE_DOC_MODEL=qwen-plus
AWS_WEBHOOK_URL=https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/dev/api/webhook/invoice-parsed
```

**AWS Lambda** (set via SAM `--parameter-overrides` or `samconfig.toml`):
```env
JwtSecret=your-jwt-secret-min-16-chars
AllowedOrigin=https://your-frontend.vercel.app
```

---

## Pages & Features

### SME Portal

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` | Marketing hero — "Invoice Financing at the Speed of AI" |
| **Login** | `/login` | JWT authentication |
| **Register** | `/register` | SME onboarding with company details |
| **Dashboard** | `/dashboard` | Financial overview, cash flow, KPIs |
| **Financing** | `/financing` | Upload invoice → AI extraction → offer → accept flow |
| **Shipments** | `/shipments` | Real-time GPS tracking, customs status, waypoints |
| **Transactions** | `/transactions` | Disbursement history & ledger |
| **Compliance** | `/compliance` | Regulatory status, customs, documentation |
| **Analytics** | `/analytics` | Route performance, risk charts, carrier stats |
| **Architecture** | `/architecture` | Multi-cloud architecture visualization |
| **AI Assistant** | `/assistant` | Qwen-powered finance chatbot |
| **Profile** | `/profile` | User settings, password management |

### Admin Command Center

| Page | Route | Description |
|------|-------|-------------|
| **Command Center** | `/admin/dashboard` | Treasury overview, action queue, operator snapshot |
| **Review Queue** | `/admin/review` | Pending invoice reviews with AI recommendations |
| **SME List** | `/admin/users` | SME directory with KYC status |
| **Master Ledger** | `/admin/ledger` | Full transaction ledger & batch disbursement |
| **System Health** | `/admin/system` | Infrastructure monitoring & service status |
| **Audit Log** | `/admin/audit` | Immutable audit trail with severity filters |

---

## API Reference

### Multi-Cloud API Flow

| Phase | Endpoint | Cloud | Description |
|-------|----------|-------|-------------|
| 1 — Ingestion | `POST /` (FC) | Alibaba | Upload invoice, AI extraction, forward to AWS |
| 1 — AI Chat | `POST /chat` (FC) | Alibaba | Qwen finance assistant |
| 1 — Summary | `POST /summary` (FC) | Alibaba | Executive summary generation |
| 2 — Scoring | `POST /api/webhook/invoice-parsed` | AWS | Receive AI data, persist, score, create offer |
| 2 — Offer | `POST /api/invoice/offer` | AWS | Retrieve financing offer |
| 3 — Disburse | `POST /api/disburse` | AWS | Idempotent disbursement + wallet update |
| 3 — Ledger | `GET /api/transactions/{smeId}` | AWS | Transaction history |
| Email | `POST /api/email/send-assignment-notice` | AWS | Notice of Assignment to buyer |
| Auth | `POST /api/auth/register` | AWS | SME registration |
| Auth | `POST /api/auth/login` | AWS | JWT login |
| Auth | `GET /api/auth/me` | AWS | Get profile |
| Auth | `POST /api/auth/forgot-password` | AWS | Password reset flow |
| Auth | `POST /api/auth/change-password` | AWS | Change password |
| Auth | `PUT /api/auth/profile` | AWS | Update profile |
| Report | `GET /reconciliation/download` | AWS | Excel reconciliation report |
| Scoring | `POST /credit-score` | AWS | Legacy credit scoring |
| Tracking | `POST /shipment/track` | AWS | Shipment location tracking |
| Tracking | `POST /shipment/verify` | AWS | Shipment verification |

---

## Machine Learning Pipeline

### Workflow

1. **Data Generation** — `generate_synthetic_data.py` creates 10k+ SME records
2. **Feature Engineering** — `feature_engineering.py` extracts: txn volume, avg size, tenure, tracking reliability, payment consistency, revenue, industry sector
3. **Model Training** — `train_model.py` trains scikit-learn ensemble (classifier + regressor)
4. **Prediction** — `predict.py` scores new applications in real-time
5. **Lambda Integration** — `lambda_handler.py` serves predictions via AWS API

### Risk Scoring Features

| Feature | Description |
|---------|-------------|
| `monthly_txn_volume` | Monthly transaction count |
| `avg_txn_size` | Average transaction amount |
| `business_tenure_months` | Months since business registration |
| `tracking_reliability_pct` | Shipment tracking uptime % |
| `payment_consistency_score` | Payment regularity score |
| `monthly_revenue` | Monthly revenue |
| `num_employees` | Employee count |
| `industry_sector_*` | One-hot encoded industry (F&B, logistics, manufacturing, retail, services, tech) |

---

## Enterprise-Grade Disbursement

The disbursement Lambda implements a **production-grade** financial transaction flow:

1. **Pydantic Validation** — Strict request payload validation (`offerId` required)
2. **Idempotency Check** — Rejects double-disbursement with `409 Conflict`
3. **Atomic Status Transition** — `PENDING_ACCEPTANCE → ACCEPTED` with DynamoDB `ConditionExpression`
4. **DuitNow Mock Payment** — Simulates external payment gateway latency
5. **Transaction Ledger** — Writes immutable ledger record to `TransactionsTable`
6. **Atomic Wallet Update** — Uses DynamoDB `ADD` expression for concurrent-safe balance increment
7. **Rollback on Failure** — Automatic offer reversal + ledger reversal on any write failure
8. **JWT Authentication** — Caller identity verified via JWT for authorization

---

## Security & Compliance

- **JWT Authentication** — Bearer tokens with expiry management, auto-redirect on 401
- **bcrypt Password Hashing** — Passwords never stored in plaintext
- **DynamoDB Encryption** — SSE enabled on all tables + point-in-time recovery
- **CORS Protection** — Configurable `AllowedOrigin` per environment
- **API Throttling** — Gateway rate limiting (50 burst / 25 steady)
- **PDPA Compliance** — Malaysian personal data protection standards
- **BNM Guidelines** — Bank Negara Malaysia financing license requirements
- **SES Verified Sender** — Email via AWS SES with verified sender identity

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Vercel auto-deploys from Git, or:
vercel --prod
```

### Backend → AWS (SAM)

```bash
cd backend
sam build
sam deploy --guided
# Creates: 6 Lambda functions, 7 DynamoDB tables, 1 S3 bucket, API Gateway
```

### AI Layer → Alibaba Cloud (Serverless Devs)

```bash
cd alibaba
s deploy
# Creates: Function Compute service with HTTP trigger
```

---

## Documentation

- [Demo Script](docs/demo-script.md) — Presentation walkthrough
- [QA Prep](docs/qa-prep.md) — Testing scenarios
- [CloudShell Deployment](docs/cloudshell-deployment.md) — AWS CloudShell setup
- [Multi-Cloud Setup](docs/multi-cloud-setup.md) — Alibaba + AWS configuration
- [Backend README](backend/README.md) — Lambda functions & APIs
- [ML README](ml/README.md) — Model training guide

---

## Team

**Group: Indecisive** — TnG FinHack 26

---

## License

This project is part of the TnG FinHack 26 competition.

---

**Last Updated:** April 26, 2026
**Status:** Production Ready for Demo
**Mission:** Financing shipping routes, not business owners

