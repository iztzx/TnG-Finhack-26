"""
Prediction module for TnG FinHack credit scoring.

Loads trained scikit-learn models once per process and exposes
`score_user(user_data: dict) -> dict`.
"""

import json
import os
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from feature_engineering import extract_features

# --- Cached model loading ---
_clf = None
_reg = None
_feature_names = None
_feature_importances = None


def _model_dir() -> str:
    """Return the directory containing model artifacts."""
    # Lambda layer mounts to /opt/ml/models
    lambda_layer = "/opt/ml/models"
    if os.path.isdir(lambda_layer) and os.path.isfile(os.path.join(lambda_layer, "credit_classifier.pkl")):
        return lambda_layer
    # Fallback to local relative path
    local = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    return local


def _load_models():
    global _clf, _reg, _feature_names, _feature_importances
    if _clf is not None:
        return

    mdir = _model_dir()
    _clf = joblib.load(os.path.join(mdir, "credit_classifier.pkl"))
    _reg = joblib.load(os.path.join(mdir, "credit_regressor.pkl"))

    with open(os.path.join(mdir, "feature_names.json"), "r") as f:
        _feature_names = json.load(f)

    with open(os.path.join(mdir, "feature_importances.json"), "r") as f:
        _feature_importances = json.load(f)


def _probability_to_score(prob: float) -> int:
    """Map approval probability (0.0-1.0) to a credit score (300-850)."""
    return int(np.clip(300 + prob * 550, 300, 850))


def _top_n_importances(feature_vector: np.ndarray, n: int = 5) -> dict:
    """Return the top-N feature importances for this specific prediction."""
    # Use classifier importances as the primary source
    importances = np.array([_feature_importances["classifier"].get(name, 0.0) for name in _feature_names])
    # Element-wise contribution proxy: feature_value * importance
    contributions = np.abs(feature_vector.flatten() * importances)
    idx = np.argsort(contributions)[::-1][:n]
    return {str(_feature_names[i]): float(contributions[i]) for i in idx}


def score_user(user_data: dict) -> dict:
    """
    Score a single user and return a result dict matching the Lambda API contract.

    Returns:
        {
            "score": int,               # 300-850 credit score
            "risk_tier": str,           # LOW / MEDIUM / HIGH
            "credit_limit": int,        # RM
            "approved": bool,
            "feature_importance": dict, # top 5 features
            "processing_ms": int,
        }
    """
    start = time.perf_counter()

    _load_models()

    features = extract_features(user_data)
    row_df = pd.DataFrame([{name: features[name] for name in _feature_names}])

    # Classifier probability
    prob = float(_clf.predict_proba(row_df)[0][1])
    score = _probability_to_score(prob)
    approved = prob >= 0.5

    # Regressor for credit limit
    credit_limit_raw = float(_reg.predict(row_df)[0])
    credit_limit = int(np.clip(credit_limit_raw, 5000, 500000))

    if not approved:
        credit_limit = min(credit_limit, 50000)

    # Risk tier from score
    if score >= 700:
        risk_tier = "LOW"
    elif score >= 500:
        risk_tier = "MEDIUM"
    else:
        risk_tier = "HIGH"

    # Feature importance
    feature_importance = _top_n_importances(row_df.values, n=5)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return {
        "score": score,
        "risk_tier": risk_tier,
        "credit_limit": credit_limit,
        "approved": approved,
        "feature_importance": feature_importance,
        "processing_ms": processing_ms,
    }


if __name__ == "__main__":
    # Quick sanity check
    sample = {
        "monthly_txn_volume": 200,
        "avg_txn_size": 12000.0,
        "business_tenure_months": 60,
        "tracking_reliability_pct": 98.0,
        "payment_consistency_score": 0.92,
        "industry_sector": "tech",
        "monthly_revenue": 150000.0,
        "num_employees": 25,
    }
    result = score_user(sample)
    print("Sample result:", json.dumps(result, indent=2))
