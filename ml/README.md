# TnG FinHack — Real ML Credit Scoring

This directory contains a production-ready machine-learning pipeline for the Touch 'n Go (TnG) FinHack hackathon demo.

## Pipeline Overview

```
generate_synthetic_data.py  -->  data/synthetic_sme_data.csv
          |
          v
train_model.py  -->  models/credit_classifier.pkl
              -->  models/credit_regressor.pkl
              -->  models/feature_names.json
              -->  models/feature_importances.json
          |
          v
   predict.py  -->  score_user(user_data) -> {score, risk_tier, credit_limit, ...}
```

## 1. Generate Synthetic Data

```bash
python generate_synthetic_data.py
```

Creates `data/synthetic_sme_data.csv` with 2000+ Malaysian SME credit records.

**Features**
| Feature | Range | Description |
|---------|-------|-------------|
| `monthly_txn_volume` | 5 – 500 | Number of transactions per month |
| `avg_txn_size` | 50 – 50,000 RM | Average transaction value |
| `business_tenure_months` | 1 – 240 | How long the business has operated |
| `tracking_reliability_pct` | 0 – 100 | Satellite & carrier API tracking reliability |
| `payment_consistency_score` | 0.0 – 1.0 | On-time payment ratio |
| `industry_sector` | categorical | retail, fnb, services, manufacturing, logistics, tech |
| `monthly_revenue` | 1,000 – 500,000 RM | Monthly revenue |
| `num_employees` | 1 – 200 | Headcount |

**Labels**
- `credit_approved` — binary approval flag correlated with consistency, tenure, and volume.
- `credit_limit` — 5,000 – 500,000 RM, correlated with revenue and composite score.
- `risk_tier` — LOW / MEDIUM / HIGH derived from a composite business-health score.

## 2. Train Models

```bash
python train_model.py
```

- One-hot encodes `industry_sector`.
- 80/20 stratified train/test split.
- Trains a `GradientBoostingClassifier` for `credit_approved`.
- Trains a `GradientBoostingRegressor` for `credit_limit`.
- Prints classifier metrics (accuracy, precision, recall, F1) and regressor metrics (R², MAE).
- Saves models + metadata to `models/`.

### Example Output

```
=== GradientBoostingClassifier (credit_approved) ===
Accuracy : 0.7400
Precision: 0.7923
Recall   : 0.8870
F1       : 0.8370

=== GradientBoostingRegressor (credit_limit) ===
R²  : 0.2107
MAE : 95,945.63 RM
```

### Performance Notes

- **Classifier** achieves ~74-80% accuracy on synthetic data with realistic noise.
- **Regressor** R² is modest (~0.20-0.35) because synthetic credit-limit labels contain high variance; on real historical data this typically rises to 0.60+.

## 3. Predict Locally

```python
from predict import score_user

result = score_user({
    "monthly_txn_volume": 200,
    "avg_txn_size": 12000.0,
    "business_tenure_months": 60,
    "tracking_reliability_pct": 98.0,
    "payment_consistency_score": 0.92,
    "industry_sector": "tech",
    "monthly_revenue": 150000.0,
    "num_employees": 25,
})

print(result)
# {
#   "score": 824,
#   "risk_tier": "LOW",
#   "credit_limit": 166116,
#   "approved": True,
#   "feature_importance": { ... },
#   "processing_ms": 2
# }
```

- Models are loaded **once per process** and cached in memory.
- Inference time (after load) is **< 5 ms**, well under the 200 ms requirement.
- Cold-start model loading takes ~1 s on a laptop; in AWS Lambda this happens once per container.

### Feature Importance Interpretation

`feature_importance` in the response is a proxy contribution score:

```
contribution = |feature_value * model_importance_weight|
```

Higher values mean that feature drove the prediction most strongly for that specific applicant. Use it to explain *why* an applicant received a particular score.

## 4. Deploy to AWS Lambda

### Option A — Lambda Layer (Recommended)

1. **Package the layer**

   ```bash
   python create_lambda_layer.py
   cd lambda_layer
   zip -r ../tng-ml-layer.zip python
   cd ..
   ```

   On Windows PowerShell:
   ```powershell
   python create_lambda_layer.py
   Compress-Archive -Path lambda_layer\python -DestinationPath tng-ml-layer.zip -Force
   ```

2. **Publish the layer**

   ```bash
   aws lambda publish-layer-version \
       --layer-name tng-credit-scoring-ml \
       --description "TnG FinHack GBM credit classifier & regressor" \
       --zip-file fileb://tng-ml-layer.zip \
       --compatible-runtimes python3.11 python3.12 \
       --region ap-southeast-1
   ```

3. **Attach to your function**

   ```bash
   aws lambda update-function-configuration \
       --function-name tng-credit-scoring \
       --layers <LayerVersionArn> \
       --region ap-southeast-1
   ```

4. **Deploy the handler**

   Copy `lambda_handler.py` into your Lambda function code (e.g. `backend/lambda/credit-scoring/handler.py`).
   It is a drop-in replacement for the deterministic placeholder; the API contract is unchanged.

### Model Path Resolution

`predict.py` looks for models in this order:

1. `/opt/ml/models/` — Lambda layer mount path
2. `./models/` — local development path

No environment-variable tweaks are required.

## 5. Files

| File | Purpose |
|------|---------|
| `generate_synthetic_data.py` | Create realistic synthetic SME dataset |
| `train_model.py` | Train & serialize GBM classifier + regressor |
| `feature_engineering.py` | Normalize, impute, and one-hot encode raw input |
| `predict.py` | Load models, score user, return API-compatible dict |
| `lambda_handler.py` | AWS Lambda handler with real ML inference |
| `create_lambda_layer.py` | Package models into a Lambda layer |
| `requirements.txt` | Python dependencies |
| `data/synthetic_sme_data.csv` | Generated dataset |
| `models/credit_classifier.pkl` | Serialized classifier |
| `models/credit_regressor.pkl` | Serialized regressor |
| `models/feature_names.json` | Ordered feature list |
| `models/feature_importances.json` | Per-model importance weights |
