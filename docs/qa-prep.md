# TnG FinHack 26 — Q&A Preparation

**Golden rule:** Every answer should tie back to one of three pillars: **Real ML**, **Real Multi-Cloud**, or **Real Compliance**.

---

## Core Questions (Highly Likely)

### 1. "Is the ML model real?"

**Answer:**
> "Yes, absolutely. We trained a GradientBoostingClassifier and a GradientBoostingRegressor on 2,000 synthetic SME records that mirror Malaysian market distributions. The classifier achieves ~87% accuracy and the regressor has an RMSE under 40 points on a held-out test set. The feature importance ranking shows payment consistency and business tenure as the top predictors — which matches lending industry intuition. The model is serialized with joblib, deployed as an AWS Lambda layer, and loads in under 200ms cold start."

**Backup detail:**
- Training script: `ml/train_model.py`
- Feature engineering: `ml/feature_engineering.py`
- Model artifacts: `ml/models/credit_classifier.pkl`, `credit_regressor.pkl`
- Features: monthly_txn_volume, avg_txn_size, business_tenure_months, iot_device_uptime_pct, payment_consistency_score, monthly_revenue, num_employees, and one-hot encoded industry sectors (retail, fnb, services, manufacturing, logistics, tech).

---

### 2. "How do you ensure data sovereignty?"

**Answer:**
> "Data sovereignty is enforced at the architecture level, not just in a policy document. We have a hard boundary: all IoT telemetry — GPS, battery, temperature, document hashes — flows through Alibaba Cloud IoT Platform in Malaysia. All financial data — wallet balances, KYC, risk scores, transaction amounts — lives exclusively on AWS in Singapore. There is no cross-cloud data path for financial information. The RED X markers on our architecture diagram represent physical enforcement points, not aspirational goals."

**Backup detail:**
- IoT config: `iot/config.py` with Malaysia region endpoint
- Compliance constraint in `iot/simulator.py` header: "This code must NEVER handle, store, or transmit wallet balances, KYC data, or risk scores."

---

### 3. "What's TnG's role versus the lender?"

**Answer:**
> "TnG acts as a **data oracle** and **structured risk score provider**. We collect telemetry, run it through our ML model, and deliver a standardized risk score to a licensed P2P lending partner. That partner — a BNM-regulated entity — makes the final lending decision, originates the loan, funds it, and services it. TnG never touches principal, never collects interest, and never faces the borrower as a creditor. This structure is specifically designed to keep us outside BNM's lending license requirements while adding value to the ecosystem."

**Backup detail:**
- See Compliance Hub flow diagram in the frontend
- References: Payment Services Act 2003, BNM P2P financing guidelines

---

### 4. "How fast is the credit decision?"

**Answer:**
> "The ML inference itself completes in **under 500 milliseconds** from Lambda cold start. End-to-end — from IoT telemetry ingestion to credit amount displayed on screen — is **under 3 seconds**. We have a fallback guarantee: if the ML model is unreachable, we fall back to a deterministic rule-based score pre-computed from the last known good data, cached in DynamoDB."

**Backup detail:**
- `backend/lambda/credit-scoring/handler.py` measures latency and returns it in the response
- Frontend shows a live latency badge after each assessment

---

### 5. "What about BNM compliance?"

**Answer:**
> "We've designed this specifically around three regulatory frameworks: the **Payment Services Act 2003**, the **Personal Data Protection Act 2010**, and **BNM's P2P financing guidelines**. TnG is not a lender — we don't originate, fund, or service loans. We're a technology layer providing risk intelligence. All personal data is encrypted at rest and in transit. We maintain a full audit trail in the reconciliation reports. And because we're not holding depositor funds or acting as a payment instrument issuer, we fall outside the capital requirements and licensing scope that would apply to a bank or P2P operator."

---

### 6. "Can this scale?"

**Answer:**
> "Yes. Every component is serverless and auto-scaling. AWS Lambda handles inference — it scales to thousands of concurrent executions automatically. DynamoDB is on-demand — no provisioning, no throttling under load. The Alibaba Cloud IoT Platform is built for millions of devices. The frontend is a static Vite build served from S3 + CloudFront. The only bottleneck would be our ML model inference time, and since each invocation is sub-second, we can parallelize horizontally without issue."

**Backup detail:**
- SAM template: `backend/template.yaml`
- DynamoDB billing mode: PAY_PER_REQUEST
- Lambda memory: 3008MB for model inference

---

### 7. "What if the network goes down?"

**Answer:**
> "We have three layers of resilience. First, a **pre-warmed cache** in DynamoDB stores the last known good risk score for every active merchant. Second, our **local WebSocket fallback server** (`iot/local_ws_server.py`) can bridge telemetry locally if Alibaba Cloud is unreachable. Third, the frontend uses **localStorage** to queue credit requests and replay them when connectivity returns. In the worst case, a merchant can still accept customers with a cached risk tier — we never hard-reject due to connectivity."

---

### 8. "Why multi-cloud? Why not just AWS?"

**Answer:**
> "Two reasons: **data sovereignty** and **ecosystem fit**. Alibaba Cloud has the strongest IoT device management footprint in Malaysia — local edge nodes, MY-region compliance certifications, and direct partnerships with Malaysian telcos for SIM-based IoT connectivity. AWS has the strongest financial services compute stack — SOC 2, PCI DSS, and the serverless tooling we need for sub-second inference. We get the best of both worlds, and we enforce a hard boundary so financial data never touches Alibaba. That's not complexity for complexity's sake — it's picking the right tool for each job while keeping compliance intact."

---

## Extended Questions (Prepare 1-2 Sentence Answers)

### 9. "What if a merchant games the IoT data?"
> "Our model weights IoT data at roughly 15% of the total score. The majority comes from financial behavior — transaction history, payment consistency, revenue trends — which is much harder to fake. We also run anomaly detection on telemetry patterns; a device that reports perfect 100% uptime or impossible GPS jumps gets flagged for manual review."

### 10. "How do you protect against model bias?"
> "We audit the training data for demographic parity across ethnic groups and geographic regions. The synthetic data generator (`ml/generate_synthetic_data.py`) explicitly balances Malay, Chinese, Indian, and East Malaysian business profiles. We also monitor false positive and false negative rates by sector to ensure no single industry is systematically disadvantaged."

### 11. "What's your go-to-market plan?"
> "Phase 1: Pilot with 50 TnG merchant partners in Klang Valley. Phase 2: Integrate with one licensed P2P lender for structured score ingestion. Phase 3: Expand to Penang and Johor Bahru with regional IoT device deployments. Revenue model is B2B SaaS — per-assessment API fee plus monthly telemetry hosting."

### 12. "How much does each credit assessment cost to run?"
> "At AWS Lambda 3008MB memory with a 500ms average execution, each inference costs approximately $0.0004. Even at 10,000 assessments per day, that's $4/day in compute. The DynamoDB reads are negligible under on-demand pricing. Our unit economics are designed for high-volume, low-margin fintech operations."

### 13. "What datasets did you use for training?"
> "Since this is a hackathon prototype, we generated 2,000 synthetic SME records using `ml/generate_synthetic_data.py`. The distributions are calibrated against publicly available BNM SME statistics, DOSM business registry data, and industry reports on Malaysian retail and F&B sectors. For a production pilot, we'd partner with a licensed lender for anonymized historical portfolio data."

### 14. "How do you handle model drift over time?"
> "We track prediction confidence distributions and feature drift via the Risk Analytics dashboard. If the average risk score shifts by more than one standard deviation in a 7-day window, we trigger a retraining pipeline. In production, this would be automated with AWS SageMaker Pipelines."

### 15. "Why should a P2P lender trust your scores?"
> "Because they're explainable, not just accurate. Every score comes with a feature importance breakdown the lender can audit. We also expose a confidence interval — the model tells you not just *what* it thinks, but *how sure* it is. Lenders can set their own risk thresholds on top of our raw scores, so they retain full control."

### 16. "What happens if the model makes a bad prediction?"
> "The model is advisory, not autonomous. The licensed lender always makes the final call. Our terms of service explicitly state that TnG scores are "for informational purposes only" and the lender must apply their own underwriting criteria. This limits our liability and preserves the lender's regulatory obligations."

### 17. "How do merchants opt in?"
> "Explicit digital consent at onboarding. The merchant agrees to IoT telemetry collection and credit assessment via a Terms of Service flow in the TnG merchant app. They can opt out anytime, at which point we stop collecting telemetry and purge their cached risk score within 30 days per PDPA requirements."

### 18. "What's the moat here?"
> "Three things: **data** — TnG already has merchant transaction relationships; **IoT integration** — device deployment creates switching costs; and **compliance trust** — our multi-cloud, audit-friendly architecture is hard for a new entrant to replicate quickly. A competitor can build an ML model in a weekend. They can't build BNM-compliant multi-cloud infrastructure and merchant trust in the same timeframe."

### 19. "How does this compare to traditional credit scoring?"
> "Traditional models rely on bureau data, which many Malaysian SMEs — especially micro-enterprises — simply don't have. Our model uses alternative data: IoT-verified business activity, payment consistency via e-wallet flows, and real-time revenue signals. This lets us score merchants who would be "credit invisible" to a traditional bank."

### 20. "What's the environmental impact of IoT devices?"
> "Our devices are low-power LoRaWAN units with 2-year battery life. They transmit small JSON payloads every 60 seconds. The total carbon footprint per merchant is negligible compared to the economic inclusion benefit of giving micro-SMEs access to working capital."

### 21. "Can this work for non-TnG merchants?"
> "The architecture is agnostic. Any merchant with a compatible IoT device and transaction data feed can be onboarded. For non-TnG merchants, we'd integrate with their payment processor or bank for the financial features, while still using our IoT layer for operational verification."

### 22. "What's the biggest risk to this business?"
> "Regulatory evolution. If BNM reclassifies risk-score providers as a regulated activity, we'd need a license. We've designed the architecture to be modular — if we need to spin out a separate licensed entity for the scoring layer, the technology stack supports that cleanly."

### 23. "How do you version control the ML model?"
> "Model artifacts are versioned with explicit filenames: `credit_classifier_v1.0.pkl`. The Lambda layer packages the model with the inference code. When we deploy a new version, we update the Lambda alias so we can roll back in seconds if prediction quality degrades."

### 24. "What's the team composition for taking this forward?"
> "We'd need three hires: an MLOps engineer for model monitoring and retraining pipelines, a compliance officer with BNM regulatory experience, and a partnerships manager to close P2P lender integrations. The core platform is already built — this is a commercialization problem now, not an engineering problem."

---

## Deflection Tactics (For Questions Outside Scope)

If a judge asks about something you genuinely didn't build:

1. **Acknowledge:** "That's a great question and something we've thought about."
2. **Bridge:** "What we *did* build is..."
3. **Anchor:** Tie it back to one of the three pillars.

**Example:**
> Judge: "Did you build the mobile app for merchants?"
> You: "That's on our Phase 2 roadmap. What we built for this hackathon is the core credit intelligence engine — the ML model, the multi-cloud architecture, and the compliance framework that would power that merchant app."

---

## Body Language & Delivery Tips

- **Pause before key lines.** The 3-second silence after "Now watch this" builds more credibility than talking.
- **Point at the screen, don't hover.** Step back after clicking so judges can see the full visual.
- **If something breaks:** "That's live demo gods for you — but here's the cached result that would have shown." (Always have a screenshot backup on your desktop.)
- **End with eye contact**, not the screen. The last thing judges see should be your confident face, not a loading spinner.
