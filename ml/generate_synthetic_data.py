import os
import numpy as np
import pandas as pd

np.random.seed(42)

N = 2000

# Base features with realistic distributions
monthly_txn_volume = np.random.randint(5, 501, size=N)
avg_txn_size = np.random.uniform(50, 50000, size=N)
business_tenure_months = np.random.randint(1, 241, size=N)
iot_device_uptime_pct = np.clip(np.random.normal(92, 8, size=N), 0, 100)
payment_consistency_score = np.clip(np.random.beta(3, 2, size=N), 0, 1)
industry_sector = np.random.choice(
    ['retail', 'fnb', 'services', 'manufacturing', 'logistics', 'tech'],
    size=N,
    p=[0.22, 0.20, 0.18, 0.15, 0.15, 0.10]
)
monthly_revenue = np.random.uniform(1000, 500000, size=N)
num_employees = np.random.randint(1, 201, size=N)

# Make revenue somewhat correlated with txn volume and avg txn size
monthly_revenue = np.clip(
    monthly_revenue * 0.5 + monthly_txn_volume * avg_txn_size * 0.3 + np.random.normal(0, 20000, size=N),
    1000, 500000
)

# Composite score for labels (realistic correlations)
# Normalize features to 0-1 for composite
txn_vol_norm = (monthly_txn_volume - 5) / 495
tenure_norm = business_tenure_months / 240
uptime_norm = iot_device_uptime_pct / 100
consistency_norm = payment_consistency_score
revenue_norm = (monthly_revenue - 1000) / 499000
employees_norm = (num_employees - 1) / 199

# Sector weights (tech and manufacturing slightly favored for stability)
sector_weights = {
    'retail': 0.0,
    'fnb': -0.05,
    'services': 0.0,
    'manufacturing': 0.05,
    'logistics': 0.0,
    'tech': 0.08
}
sector_score = np.array([sector_weights[s] for s in industry_sector])

composite = (
    0.25 * consistency_norm +
    0.20 * tenure_norm +
    0.15 * txn_vol_norm +
    0.15 * revenue_norm +
    0.10 * uptime_norm +
    0.05 * employees_norm +
    0.10 * sector_score
)

# Add noise
composite += np.random.normal(0, 0.05, size=N)
composite = np.clip(composite, 0, 1)

# credit_approved: threshold with noise
approval_prob = 1 / (1 + np.exp(-10 * (composite - 0.45)))  # sigmoid
credit_approved = (np.random.random(size=N) < approval_prob).astype(int)

# credit_limit: correlated with revenue and composite
credit_limit = np.clip(
    5000 + (monthly_revenue * 0.5 + composite * 200000 + np.random.normal(0, 15000, size=N)),
    5000, 500000
).astype(int)

# risk_tier
risk_tier = np.where(composite >= 0.60, 'LOW',
            np.where(composite >= 0.40, 'MEDIUM', 'HIGH'))

# Adjust: if not approved, cap credit limit and raise risk
for i in range(N):
    if credit_approved[i] == 0:
        credit_limit[i] = min(credit_limit[i], 50000)
        risk_tier[i] = 'HIGH'

# Ensure some high-composite cases are approved, low are rejected
# This is already handled by the sigmoid, but let's double-check boundaries
# by manually forcing a few edge cases for realism
idx_low = np.argsort(composite)[:10]
idx_high = np.argsort(composite)[-10:]
credit_approved[idx_low] = 0
credit_approved[idx_high] = 1

# Recompute risk_tier based on final composite
def assign_tier(c):
    if c >= 0.60:
        return 'LOW'
    elif c >= 0.40:
        return 'MEDIUM'
    else:
        return 'HIGH'

risk_tier = np.array([assign_tier(c) for c in composite])
for i in range(N):
    if credit_approved[i] == 0:
        risk_tier[i] = 'HIGH'

df = pd.DataFrame({
    'monthly_txn_volume': monthly_txn_volume,
    'avg_txn_size': np.round(avg_txn_size, 2),
    'business_tenure_months': business_tenure_months,
    'iot_device_uptime_pct': np.round(iot_device_uptime_pct, 2),
    'payment_consistency_score': np.round(payment_consistency_score, 4),
    'industry_sector': industry_sector,
    'monthly_revenue': np.round(monthly_revenue, 2),
    'num_employees': num_employees,
    'credit_approved': credit_approved,
    'credit_limit': credit_limit,
    'risk_tier': risk_tier
})

os.makedirs('data', exist_ok=True)
df.to_csv('data/synthetic_sme_data.csv', index=False)
print(f"Generated {len(df)} synthetic SME records and saved to data/synthetic_sme_data.csv")
print(df.head())
print(f"\nApproval rate: {df['credit_approved'].mean():.2%}")
print(f"Risk tier distribution:\n{df['risk_tier'].value_counts()}")
