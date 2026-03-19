from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import ipaddress
from urllib.parse import urlparse

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

# Mock profiles used to enrich transaction context during demo/testing.
SENDER_PROFILES = {
    "ALEX8899": {
        "name": "Alex Tan",
        "balance": 12450.0,
        "known_recipients": {"C10001", "M77889"},
    }
}

RECIPIENT_PROFILES = {
    "C10001": {"oldbalanceDest": 3200.0},
    "M77889": {"oldbalanceDest": 51000.0},
}

DEVICE_TRUST_SCORES = {
    "demo-web": 0.9,
    "demo-new-device": 0.35,
}

MERCHANT_PROFILES = {
    "M77889": {
        "account_name": "Demo Merchant",
        "provider": "Touch n Go eWallet",
        "created_at": "2026-01-01T12:00:00Z",
        "is_verified_merchant": True,
        "error_balance_ratio": 0.04,
    },
    "M99001": {
        "account_name": "FreshMart Pop-up",
        "provider": "Boost",
        "created_at": "2026-03-19T08:00:00Z",
        "is_verified_merchant": False,
        "error_balance_ratio": 0.31,
    },
}

# 2. Define what a 'Transaction' looks like
class Transaction(BaseModel):
    type: str # 'TRANSFER' or 'CASH_OUT'
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float
    nameDest: str
    # --- Contextual Data Integration (Rubric: Behavioral Profiling) ---
    hour_of_day: int = 12           # 0-23; real browser time captures time-based risk
    is_new_recipient: bool = True   # first-ever transfer to this destination
    device_trust_score: float = 1.0 # 0.0 = unknown device, 1.0 = fully trusted
    ip_risk_score: float = 0.0      # 0.0 = clean IP, 1.0 = blacklisted/VPN


class ContextRequest(BaseModel):
    sender_account: str
    recipient_account: str
    amount: float
    device_id: str = "demo-web"
    ip_profile: str = "auto"


class QRPayload(BaseModel):
    merchant_id: str | None = None
    account_name: str | None = None
    provider: str | None = None
    amount: float
    currency: str = "MYR"
    created_at: str | None = None
    signature: str | None = None
    account_created_at: str | None = None
    high_error_balance_ratio: float | None = None
    is_verified_merchant: bool | None = None


class QRTransferRequest(BaseModel):
    sender_account: str
    device_id: str = "demo-web"
    ip_profile: str = "auto"
    qr: QRPayload


class QRThreatScanRequest(BaseModel):
    raw_qr: str
    device_id: str = "demo-web"
    ip_profile: str = "auto"


def normalize_name_dest(recipient_account: str) -> str:
    raw = (recipient_account or "").strip().upper()
    if raw.startswith("M"):
        return raw
    if raw.startswith("C"):
        return raw
    if not raw:
        return "C000000"
    return f"C{raw}"


def estimate_ip_risk_score(client_ip: str | None) -> float:
    if not client_ip:
        return 0.4
    try:
        ip_obj = ipaddress.ip_address(client_ip)
        if ip_obj.is_private or ip_obj.is_loopback:
            return 0.05
        return 0.35
    except ValueError:
        return 0.4


def get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    return forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else None)


def build_context_data(
    sender_account: str,
    recipient_account: str,
    amount: float,
    device_id: str,
    ip_profile: str,
    request: Request,
):
    sender_key = sender_account.strip().upper()
    sender = SENDER_PROFILES.get(sender_key, {
        "name": "Unknown Sender",
        "balance": 5000.0,
        "known_recipients": set(),
    })

    name_dest = normalize_name_dest(recipient_account)
    oldbalance_org = float(sender["balance"])
    safe_amount = max(float(amount), 0.0)
    newbalance_orig = max(0.0, oldbalance_org - safe_amount)

    recipient_profile = RECIPIENT_PROFILES.get(name_dest, {"oldbalanceDest": 0.0})
    oldbalance_dest = float(recipient_profile["oldbalanceDest"])
    newbalance_dest = oldbalance_dest + safe_amount

    known_recipients = sender.get("known_recipients", set())
    is_new_recipient = name_dest not in known_recipients

    client_ip = get_client_ip(request)

    device_trust_score = DEVICE_TRUST_SCORES.get(device_id, 0.55)
    resolved_ip_profile = ip_profile.strip().lower()
    if resolved_ip_profile == "risky":
        ip_risk_score = 0.9
    elif resolved_ip_profile == "clean":
        ip_risk_score = 0.05
    else:
        ip_risk_score = estimate_ip_risk_score(client_ip)

    return {
        "context": {
            "type": "TRANSFER",
            "nameDest": name_dest,
            "amount": safe_amount,
            "oldbalanceOrg": oldbalance_org,
            "newbalanceOrig": newbalance_orig,
            "oldbalanceDest": oldbalance_dest,
            "newbalanceDest": newbalance_dest,
            "hour_of_day": datetime.now().hour,
            "is_new_recipient": is_new_recipient,
            "device_trust_score": device_trust_score,
            "ip_risk_score": ip_risk_score,
        },
        "sender_name": sender.get("name", "Unknown Sender"),
    }


def parse_iso_datetime(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def evaluate_qr_integrity(payload: QRPayload):
    merchant_id = normalize_name_dest(payload.merchant_id or payload.account_name or "")
    merchant_profile = MERCHANT_PROFILES.get(merchant_id, {})

    is_verified_merchant = (
        payload.is_verified_merchant
        if payload.is_verified_merchant is not None
        else bool(merchant_profile.get("is_verified_merchant", False))
    )

    account_created_at = payload.account_created_at or merchant_profile.get("created_at")
    created_at_dt = parse_iso_datetime(account_created_at)
    merchant_age_hours = 9999.0
    if created_at_dt is not None:
        now = datetime.now(created_at_dt.tzinfo)
        merchant_age_hours = max((now - created_at_dt).total_seconds() / 3600, 0.0)

    error_balance_ratio = (
        payload.high_error_balance_ratio
        if payload.high_error_balance_ratio is not None
        else float(merchant_profile.get("error_balance_ratio", 0.0))
    )

    normalized_signature = (payload.signature or "").strip().upper()
    signature_valid = normalized_signature in {"VALID", "SIGNED", "OK"}

    warnings = []
    if not is_verified_merchant:
        warnings.append("Merchant is not verified yet.")
    if merchant_age_hours < 24:
        warnings.append("This merchant account is very new.")
    if error_balance_ratio >= 0.2:
        warnings.append("This merchant has unusual payment history.")
    if not signature_valid:
        warnings.append("This QR code could not be verified.")

    return {
        "merchant_id": merchant_id,
        "account_name": payload.account_name or merchant_profile.get("account_name", "Unknown Merchant"),
        "provider": payload.provider or merchant_profile.get("provider", "Unknown Provider"),
        "is_verified_merchant": is_verified_merchant,
        "merchant_age_hours": round(merchant_age_hours, 2),
        "high_error_balance_ratio": round(float(error_balance_ratio), 4),
        "signature_valid": signature_valid,
        "warnings": warnings,
    }


def evaluate_generic_qr_threat(raw_qr: str, device_id: str, ip_profile: str):
    text = (raw_qr or "").strip()
    compact = "".join(text.split())

    risk = 0.02
    adjustments = []
    warnings = []
    qr_type = "unknown"

    def add(delta: float, factor: str, warning: str | None = None):
        nonlocal risk
        risk += delta
        adjustments.append({"factor": factor, "delta": round(delta, 4)})
        if warning:
            warnings.append(warning)

    if compact.startswith("0002"):
        qr_type = "emv_payment"
    elif text.startswith("{") and text.endswith("}"):
        qr_type = "json"
    elif text.lower().startswith("http://") or text.lower().startswith("https://"):
        qr_type = "url"

    if qr_type == "url":
        parsed = urlparse(text)
        domain = (parsed.netloc or "").lower()
        path_query = f"{parsed.path}?{parsed.query}".lower()

        trusted_domains = {
            "duitnow.my",
            "paynet.my",
            "tngdigital.com.my",
            "touchngo.com.my",
            "grab.com",
            "shopee.com.my",
            "boost.com.my",
            "maybank2u.com.my",
            "cimbclicks.com.my",
            "rhbgroup.com",
            "publicbank.com.my",
        }

        suspicious_tlds = (".online", ".top", ".xyz", ".click", ".shop", ".loan", ".win")
        suspicious_words = (
            "bantuan",
            "claim",
            "grant",
            "verify",
            "login",
            "secure",
            "update",
            "wallet",
            "inst",
            "apk",
            "otp",
            "bonus",
            "redeem",
        )
        shorteners = ("bit.ly", "tinyurl.com", "t.co", "rb.gy", "is.gd", "rebrand.ly")

        if parsed.scheme.lower() != "https":
            add(0.2, "non_https_link", "This QR opens an unsafe website link.")

        if not domain:
            add(0.5, "missing_domain", "This QR link looks broken or fake.")
        else:
            if domain.startswith("xn--"):
                add(0.25, "punycode_domain", "This link may be pretending to be another website.")

            if any(domain.endswith(tld) for tld in suspicious_tlds):
                add(0.35, "suspicious_tld", "This QR uses a risky website address.")

            if any(short in domain for short in shorteners):
                add(0.3, "url_shortener", "This QR hides the real website address.")

            if domain not in trusted_domains:
                add(0.2, "untrusted_domain", "This website is not in trusted payment services.")

        if any(keyword in f"{domain}{path_query}" for keyword in suspicious_words):
            add(0.25, "phishing_keyword", "This link looks like a common scam message.")

    elif qr_type == "emv_payment":
        add(0.04, "emv_payment_qr", "EMV payment QR detected.")
    elif qr_type == "json":
        add(0.06, "json_qr", "Custom structured QR detected.")
    else:
        add(0.15, "unknown_qr_type", "Unknown QR format; verify before proceeding.")

    device_trust_score = DEVICE_TRUST_SCORES.get(device_id, 0.55)
    if device_trust_score < 0.5:
        add(0.1, "untrusted_device", "Please be extra careful on this device.")

    if ip_profile.strip().lower() == "risky":
        add(0.15, "high_risk_ip", "Network looks risky right now.")

    risk = min(max(risk, 0.0), 0.999)

    if risk >= 0.75:
        status = "BLOCKED"
        color = "red"
        reason_code = "Danger: this QR is likely a scam."
        recommendation = "Stop now. Do not open this link or send money."
    elif risk >= 0.4:
        status = "FLAGGED"
        color = "orange"
        reason_code = "Warning: this QR looks suspicious."
        recommendation = "Double-check with the sender before you continue."
    else:
        status = "APPROVED"
        color = "green"
        reason_code = "This QR looks safe from known scam signs."
        recommendation = "You can continue, but still confirm recipient details."

    if warnings:
        reason_code = warnings[0]

    return {
        "risk_score": round(risk, 4),
        "model_score": 0.0,
        "status": status,
        "color": color,
        "recommendation": recommendation,
        "reason_code": reason_code,
        "isVerifiedMerchant": False,
        "qr_integrity": {
            "merchant_id": "",
            "account_name": "",
            "provider": "",
            "is_verified_merchant": False,
            "merchant_age_hours": 0.0,
            "high_error_balance_ratio": 0.0,
            "signature_valid": False,
            "warnings": warnings,
            "qr_type": qr_type,
            "raw_preview": text[:120],
        },
        "score_breakdown": {
            "raw_model_score": 0.0,
            "adjustments": adjustments,
            "pre_floor_score": round(risk, 4),
            "hard_floor": 0.0,
            "hard_floor_reason": None,
            "status_floor": 0.0,
            "final_score": round(risk, 4),
        },
    }


@app.post("/context")
async def build_transaction_context(payload: ContextRequest, request: Request):
    context_data = build_context_data(
        sender_account=payload.sender_account,
        recipient_account=payload.recipient_account,
        amount=payload.amount,
        device_id=payload.device_id,
        ip_profile=payload.ip_profile,
        request=request,
    )
    return {
        **context_data["context"],
        "sender_name": context_data["sender_name"],
        "data_source": "mock-profile-service",
    }


@app.post("/predict-qr")
async def predict_qr_fraud(payload: QRTransferRequest, request: Request):
    qr_integrity = evaluate_qr_integrity(payload.qr)
    context_data = build_context_data(
        sender_account=payload.sender_account,
        recipient_account=qr_integrity["merchant_id"],
        amount=payload.qr.amount,
        device_id=payload.device_id,
        ip_profile=payload.ip_profile,
        request=request,
    )

    base_result = await predict_fraud(Transaction(**context_data["context"]))

    status = base_result["status"]
    risk_score = float(base_result["risk_score"])
    reason_code = base_result["reason_code"]
    recommendation = base_result["recommendation"]

    adjustments = base_result.get("score_breakdown", {}).get("adjustments", [])

    if not qr_integrity["is_verified_merchant"]:
        adjustments.append({"factor": "qr_unverified_merchant", "delta": 0.1})
        risk_score += 0.1
        if status == "APPROVED":
            status = "FLAGGED"
            reason_code = "Unverified merchant QR requires additional verification."
            recommendation = "Verify merchant details before completing payment."

    if qr_integrity["merchant_age_hours"] < 24:
        adjustments.append({"factor": "qr_new_merchant", "delta": 0.12})
        risk_score += 0.12
        if status == "APPROVED":
            status = "FLAGGED"
            reason_code = "Merchant account is newly created (<24h)."
            recommendation = "Perform step-up authentication before payment."

    if qr_integrity["high_error_balance_ratio"] >= 0.2:
        adjustments.append({"factor": "qr_high_error_balance_history", "delta": 0.15})
        risk_score += 0.15
        if status == "APPROVED":
            status = "FLAGGED"
            reason_code = "Merchant has suspicious historical balance anomalies."
            recommendation = "Verify merchant identity and payment request."

    if not qr_integrity["signature_valid"]:
        adjustments.append({"factor": "qr_signature_invalid", "delta": 0.35})
        risk_score = max(risk_score + 0.35, 0.85)
        status = "BLOCKED"
        reason_code = "QR signature validation failed."
        recommendation = "Do not proceed. Request a fresh verified QR from merchant."

    if len(qr_integrity["warnings"]) >= 3 and status != "BLOCKED":
        status = "BLOCKED"
        risk_score = max(risk_score, 0.8)
        reason_code = "Multiple QR integrity violations detected."
        recommendation = "Transaction blocked to prevent potential quishing attack."

    if status == "FLAGGED":
        risk_score = max(risk_score, 0.45)
        color = "orange"
    elif status == "BLOCKED":
        risk_score = max(risk_score, 0.75)
        color = "red"
    else:
        color = "green"

    risk_score = min(max(risk_score, 0.0), 0.999)

    score_breakdown = base_result.get("score_breakdown", {})
    score_breakdown["adjustments"] = adjustments
    score_breakdown["final_score"] = round(risk_score, 4)

    base_result.update({
        "status": status,
        "color": color,
        "risk_score": round(risk_score, 4),
        "reason_code": reason_code,
        "recommendation": recommendation,
        "isVerifiedMerchant": qr_integrity["is_verified_merchant"],
        "qr_integrity": qr_integrity,
        "score_breakdown": score_breakdown,
    })

    return base_result


@app.post("/scan-qr-threat")
async def scan_qr_threat(payload: QRThreatScanRequest):
    return evaluate_generic_qr_threat(
        raw_qr=payload.raw_qr,
        device_id=payload.device_id,
        ip_profile=payload.ip_profile,
    )

@app.post("/predict")
async def predict_fraud(txn: Transaction):
    # Prepare the data exactly like the training step
    amount_to_old_balance_ratio = (txn.amount / txn.oldbalanceOrg) if txn.oldbalanceOrg > 0 else 0.0

    data = {
        'type': [txn.type],
        'amount': [txn.amount],
        'oldbalanceOrg': [txn.oldbalanceOrg],
        'newbalanceOrig': [txn.newbalanceOrig],
        'oldbalanceDest': [txn.oldbalanceDest],
        'newbalanceDest': [txn.newbalanceDest],
        'isFlaggedFraud': [0],  # Placeholder
        'errorBalanceOrig': [txn.newbalanceOrig + txn.amount - txn.oldbalanceOrg],
        'errorBalanceDest': [txn.oldbalanceDest + txn.amount - txn.newbalanceDest],
        'isMerchantDest': [1 if txn.nameDest.startswith('M') else 0],
        'isEmptyingAccount': [1 if txn.newbalanceOrig == 0 else 0],
        'hourOfDay': [txn.hour_of_day],
        'dayIndex': [datetime.now().day],
        'amountToOldBalanceRatio': [amount_to_old_balance_ratio],
        'origBalanceDelta': [txn.oldbalanceOrg - txn.newbalanceOrig],
        'destBalanceDelta': [txn.newbalanceDest - txn.oldbalanceDest],
    }

    input_df = pd.DataFrame(data)
    input_df = pd.get_dummies(input_df, columns=['type'])

    # Ensure columns match training exactly even when type categories differ.
    input_df = input_df.reindex(columns=model_columns, fill_value=0)

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

    # --- Contextual Data Integration (Rubric requirement) ---
    # Signals derived from device fingerprint, IP reputation, and time-of-day.
    late_night        = txn.hour_of_day >= 23 or txn.hour_of_day <= 4
    high_ip_risk      = txn.ip_risk_score >= 0.7
    untrusted_device  = txn.device_trust_score < 0.5
    # First-time large transfer to an unknown recipient is a key fraud vector.
    new_large_transfer = txn.is_new_recipient and txn.amount >= 2000
    # Late-night + new recipient combo even for modest amounts is suspicious.
    night_new_transfer = late_night and txn.is_new_recipient and txn.amount >= 200

    contextual_flag = high_ip_risk or untrusted_device or new_large_transfer or night_new_transfer

    # Contextual escalation policy:
    # keep strong protection, but avoid blocking on mild context alone.
    contextual_block = high_ip_risk and (
        untrusted_device or
        new_large_transfer or
        (night_new_transfer and txn.amount >= 500)
    )

    if contextual_block:
        status = "BLOCKED"
        color = "red"
        recommendation = "Critical contextual risk detected. Transaction declined."
    elif contextual_flag and status == "APPROVED":
        status = "FLAGGED"
        color = "orange"
        if high_ip_risk:
            recommendation = "High-risk IP address detected. Step-up verification required."
        elif untrusted_device:
            recommendation = "Unrecognized device. OTP verification required."
        elif night_new_transfer:
            recommendation = "Late-night transfer to new recipient. OTP required."
        else:
            recommendation = "First-time large transfer flagged for verification."

    # 4. Explainable AI (Rubric: Innovation)
    reason = "Normal patterns"
    if insufficient_funds:
        reason = "Amount exceeds source balance."
    elif extreme_amount:
        reason = "High-value transfer above safety threshold."
    elif contextual_block and status != "APPROVED":
        reason = "High-risk IP combined with abnormal transaction context."
    elif contextual_flag and status != "APPROVED":
        if high_ip_risk:
            reason = "High-risk IP address flagged by threat intelligence."
        elif untrusted_device:
            reason = "Unrecognized device fingerprint detected."
        elif night_new_transfer:
            reason = "Behavioral anomaly: Late-night transfer to new recipient."
        else:
            reason = "First-time transfer above verification threshold."
    elif high_amount and status != "APPROVED":
        if status == "BLOCKED":
            reason = "High-value transfer exceeded policy safety threshold."
        else:
            reason = "High-value amount triggered extra verification."
    elif high_balance_ratio and status != "APPROVED":
        reason = "Amount consumes most of the available balance."
    elif empties_account and status != "APPROVED":
        reason = "Atypical behavior: Attempt to empty wallet balance."
    elif math_anomaly and status != "APPROVED":
        reason = "Mathematical anomaly in transaction flow."

    # Effective risk score blends ML probability + contextual/rule risk.
    # This avoids confusing cases like BLOCKED with 0% risk.
    effective_risk = float(prob)
    score_adjustments = []

    def add_adjustment(factor: str, delta: float):
        nonlocal effective_risk
        effective_risk += delta
        score_adjustments.append({"factor": factor, "delta": round(delta, 4)})

    if high_amount:
        add_adjustment("high_amount", 0.10)
    if high_balance_ratio:
        add_adjustment("high_balance_ratio", 0.12)
    if math_anomaly:
        add_adjustment("math_anomaly", 0.18)
    if high_ip_risk:
        add_adjustment("high_ip_risk", 0.22)
    if untrusted_device:
        add_adjustment("untrusted_device", 0.15)
    if new_large_transfer:
        add_adjustment("new_large_transfer", 0.12)
    if night_new_transfer:
        add_adjustment("night_new_transfer", 0.08)

    pre_floor_score = effective_risk

    hard_floor = 0.0
    hard_floor_reason = None
    status_floor = 0.0

    if insufficient_funds or extreme_amount or contextual_block:
        hard_floor = 0.75
        if insufficient_funds:
            hard_floor_reason = "insufficient_funds"
        elif extreme_amount:
            hard_floor_reason = "extreme_amount"
        else:
            hard_floor_reason = "contextual_block"
        effective_risk = max(effective_risk, hard_floor)

    if status == "FLAGGED":
        status_floor = 0.35
        effective_risk = max(effective_risk, status_floor)
    elif status == "BLOCKED":
        status_floor = 0.65
        effective_risk = max(effective_risk, status_floor)
    else:
        effective_risk = min(effective_risk, 0.30)

    effective_risk = min(max(effective_risk, 0.0), 0.999)

    return {
        "risk_score": round(effective_risk, 4),
        "model_score": round(float(prob), 4),
        "status": status,
        "color": color,
        "recommendation": recommendation,
        "reason_code": reason,
        "score_breakdown": {
            "raw_model_score": round(float(prob), 4),
            "adjustments": score_adjustments,
            "pre_floor_score": round(pre_floor_score, 4),
            "hard_floor": round(hard_floor, 4),
            "hard_floor_reason": hard_floor_reason,
            "status_floor": round(status_floor, 4),
            "final_score": round(effective_risk, 4),
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)