"""
Feature engineering module for TnG FinHack credit scoring.

Provides a single function `extract_features(user_data: dict) -> dict`
that prepares raw user data for model inference.
"""

import numpy as np

# Feature defaults based on Malaysian SME medians / safe assumptions
DEFAULTS = {
    "monthly_txn_volume": 50,
    "avg_txn_size": 2500.0,
    "business_tenure_months": 36,
    "iot_device_uptime_pct": 95.0,
    "payment_consistency_score": 0.75,
    "monthly_revenue": 25000.0,
    "num_employees": 10,
}

VALID_SECTORS = {"retail", "fnb", "services", "manufacturing", "logistics", "tech"}


def extract_features(user_data: dict) -> dict:
    """
    Convert raw user data dict into a flat feature dict ready for model input.

    Steps:
      1. Fill missing numeric features with sensible defaults.
      2. Clip values to realistic bounds.
      3. One-hot encode `industry_sector`.
      4. Return a flat dict with the exact keys the models were trained on.
    """
    if not isinstance(user_data, dict):
        user_data = {}

    # --- 1. Numeric features ---
    features = {}

    features["monthly_txn_volume"] = _to_int(
        user_data.get("monthly_txn_volume"), DEFAULTS["monthly_txn_volume"], 5, 500
    )
    features["avg_txn_size"] = _to_float(
        user_data.get("avg_txn_size"), DEFAULTS["avg_txn_size"], 50.0, 50000.0
    )
    features["business_tenure_months"] = _to_int(
        user_data.get("business_tenure_months"), DEFAULTS["business_tenure_months"], 1, 240
    )
    features["iot_device_uptime_pct"] = _to_float(
        user_data.get("iot_device_uptime_pct"), DEFAULTS["iot_device_uptime_pct"], 0.0, 100.0
    )
    features["payment_consistency_score"] = _to_float(
        user_data.get("payment_consistency_score"), DEFAULTS["payment_consistency_score"], 0.0, 1.0
    )
    features["monthly_revenue"] = _to_float(
        user_data.get("monthly_revenue"), DEFAULTS["monthly_revenue"], 1000.0, 500000.0
    )
    features["num_employees"] = _to_int(
        user_data.get("num_employees"), DEFAULTS["num_employees"], 1, 200
    )

    # --- 2. One-hot encode industry_sector ---
    sector = str(user_data.get("industry_sector", "")).lower().strip()
    if sector not in VALID_SECTORS:
        sector = "retail"  # safest default

    for s in VALID_SECTORS:
        features[f"industry_sector_{s}"] = 1.0 if s == sector else 0.0

    return features


def _to_int(value, default, lo, hi):
    try:
        v = int(float(value))
    except (TypeError, ValueError):
        v = default
    return int(np.clip(v, lo, hi))


def _to_float(value, default, lo, hi):
    try:
        v = float(value)
    except (TypeError, ValueError):
        v = default
    return float(np.clip(v, lo, hi))
