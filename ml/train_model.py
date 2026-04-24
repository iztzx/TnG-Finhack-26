import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

def main():
    # Load data
    df = pd.read_csv("data/synthetic_sme_data.csv")
    print(f"Loaded {len(df)} records")

    # One-hot encode industry_sector
    df = pd.get_dummies(df, columns=["industry_sector"], prefix="industry_sector")

    # Feature columns (exclude labels)
    label_cols = ["credit_approved", "credit_limit", "risk_tier"]
    feature_cols = [c for c in df.columns if c not in label_cols]

    X = df[feature_cols]
    y_classifier = df["credit_approved"]
    y_regressor = df["credit_limit"]

    # Train/test split
    X_train, X_test, y_clf_train, y_clf_test, y_reg_train, y_reg_test = train_test_split(
        X, y_classifier, y_regressor, test_size=0.2, random_state=42, stratify=y_classifier
    )

    # --- Classifier ---
    clf = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=4,
        random_state=42,
    )
    clf.fit(X_train, y_clf_train)
    y_clf_pred = clf.predict(X_test)

    acc = accuracy_score(y_clf_test, y_clf_pred)
    prec = precision_score(y_clf_test, y_clf_pred, zero_division=0)
    rec = recall_score(y_clf_test, y_clf_pred, zero_division=0)
    f1 = f1_score(y_clf_test, y_clf_pred, zero_division=0)

    print("\n=== GradientBoostingClassifier (credit_approved) ===")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1       : {f1:.4f}")

    # --- Regressor ---
    reg = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=4,
        random_state=42,
    )
    reg.fit(X_train, y_reg_train)
    y_reg_pred = reg.predict(X_test)

    r2 = r2_score(y_reg_test, y_reg_pred)
    mae = mean_absolute_error(y_reg_test, y_reg_pred)

    print("\n=== GradientBoostingRegressor (credit_limit) ===")
    print(f"R²  : {r2:.4f}")
    print(f"MAE : {mae:,.2f} RM")

    # --- Feature importances ---
    clf_importances = dict(zip(feature_cols, clf.feature_importances_.tolist()))
    reg_importances = dict(zip(feature_cols, reg.feature_importances_.tolist()))

    # Save models
    os.makedirs("models", exist_ok=True)
    joblib.dump(clf, "models/credit_classifier.pkl")
    joblib.dump(reg, "models/credit_regressor.pkl")

    # Save feature names
    with open("models/feature_names.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    # Save feature importances
    with open("models/feature_importances.json", "w") as f:
        json.dump(
            {
                "classifier": clf_importances,
                "regressor": reg_importances,
            },
            f,
            indent=2,
        )

    print("\nSaved models and metadata to ml/models/")


if __name__ == "__main__":
    main()
