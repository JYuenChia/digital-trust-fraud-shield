from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np

app = FastAPI(title="Digital Fraud Shield API")

# Conservative thresholds for a safer demo policy.
APPROVE_PROB_THRESHOLD = 0.15
FLAG_PROB_THRESHOLD = 0.45
FLAG_AMOUNT_THRESHOLD = 10000
BLOCK_AMOUNT_THRESHOLD = 50000

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load the model and column list
model = joblib.load('fraud_model.pkl')
model_columns = joblib.load('model_columns.pkl')

# 2. Define what a 'Transaction' looks like
class Transaction(BaseModel):
    type: str # 'TRANSFER' or 'CASH_OUT'
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float
    nameDest: str

@app.post("/predict")
async def predict_fraud(txn: Transaction):
    # Prepare the data exactly like the training step
    data = {
        'amount': [txn.amount],
        'oldbalanceOrg': [txn.oldbalanceOrg],
        'newbalanceOrig': [txn.newbalanceOrig],
        'oldbalanceDest': [txn.oldbalanceDest],
        'newbalanceDest': [txn.newbalanceDest],
        'isFlaggedFraud': [0], # Placeholder
        'errorBalanceOrig': [txn.newbalanceOrig + txn.amount - txn.oldbalanceOrg],
        'errorBalanceDest': [txn.oldbalanceDest + txn.amount - txn.newbalanceDest],
        'isMerchantDest': [1 if txn.nameDest.startswith('M') else 0],
        'isEmptyingAccount': [1 if txn.newbalanceOrig == 0 else 0],
        'type_TRANSFER': [1 if txn.type == 'TRANSFER' else 0]
    }
    
    input_df = pd.DataFrame(data)
    
    # Ensure columns match training exactly
    input_df = input_df[model_columns]

    # Get probability
    prob = model.predict_proba(input_df)[0][1]

    # Additional business guardrails to avoid unsafe approvals.
    # These rules sit on top of ML and can escalate the decision.
    insufficient_funds = txn.oldbalanceOrg > 0 and txn.amount > txn.oldbalanceOrg
    high_amount = txn.amount >= FLAG_AMOUNT_THRESHOLD
    extreme_amount = txn.amount >= BLOCK_AMOUNT_THRESHOLD
    high_balance_ratio = txn.oldbalanceOrg > 0 and (txn.amount / txn.oldbalanceOrg) >= 0.8
    empties_account = data['isEmptyingAccount'][0] == 1
    math_anomaly = (
        abs(data['errorBalanceOrig'][0]) > 1e-6 or
        abs(data['errorBalanceDest'][0]) > 1e-6
    )
    
    # 3. Multi-Tier Logic (Rubric: Real-Time Anomaly Scoring)
    if prob < APPROVE_PROB_THRESHOLD:
        status = "APPROVED"
        color = "green"
        recommendation = "Safe transaction."
    elif prob < FLAG_PROB_THRESHOLD:
        status = "FLAGGED"
        color = "orange"
        recommendation = "Requires Step-up Authentication (OTP)."
    else:
        status = "BLOCKED"
        color = "red"
        recommendation = "High risk detected. Transaction declined."

    # Rule-based escalation. Never allow clear red flags to remain APPROVED.
    if insufficient_funds:
        status = "BLOCKED"
        color = "red"
        recommendation = "Amount exceeds available balance. Transaction declined."
    elif extreme_amount:
        status = "BLOCKED"
        color = "red"
        recommendation = "High-value transfer requires manual review and was blocked."
    elif high_amount and status == "APPROVED":
        status = "FLAGGED"
        color = "orange"
        recommendation = "High-value transfer requires OTP verification."
    elif (high_balance_ratio or empties_account or math_anomaly) and status == "APPROVED":
        status = "FLAGGED"
        color = "orange"
        recommendation = "Transaction requires step-up authentication (OTP)."

    # 4. Explainable AI (Rubric: Innovation)
    reason = "Normal patterns"
    if insufficient_funds:
        reason = "Amount exceeds source balance."
    elif extreme_amount:
        reason = "High-value transfer above safety threshold."
    elif high_amount and status != "APPROVED":
        reason = "High-value amount triggered extra verification."
    elif high_balance_ratio and status != "APPROVED":
        reason = "Amount consumes most of the available balance."
    elif empties_account and status != "APPROVED":
        reason = "Atypical behavior: Attempt to empty wallet balance."
    elif math_anomaly and status != "APPROVED":
        reason = "Mathematical anomaly in transaction flow."

    return {
        "risk_score": round(float(prob), 4),
        "status": status,
        "color": color,
        "recommendation": recommendation,
        "reason_code": reason
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)