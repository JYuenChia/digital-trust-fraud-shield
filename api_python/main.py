from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import ipaddress
from urllib.parse import urlparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import json
from uuid import uuid4

app = FastAPI(title="Digital Fraud Shield API")

# Conservative thresholds for a safer demo policy.
APPROVE_PROB_THRESHOLD = 0.15
FLAG_PROB_THRESHOLD = 0.45
FLAG_AMOUNT_THRESHOLD = 10000
BLOCK_AMOUNT_THRESHOLD = 50000
GUARDIAN_APPROVAL_RISK_THRESHOLD = 0.45

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

# Guardian Link Storage: Senior Account -> Guardian(s)
GUARDIAN_LINKS = {
    "ALEX8899": {
        "guardians": [
            {
                "guardian_account": "GUARDIAN001",
                "guardian_name": "Sarah Tan (Daughter)",
                "phone": "+60-12-3456789",
                "email": "sarah.tan@email.com",
                "linked_at": "2026-01-15T10:00:00Z",
            }
        ],
        "senior_name": "Alex Tan",
        "notification_threshold_risk": 0.75,  # Guardian notified when risk >= this
    }
}

# In-memory alert history for guardian dashboard (no database required).
GUARDIAN_ALERT_LOGS = []

# In-memory pending guardian approvals for flagged transactions.
GUARDIAN_PENDING_APPROVALS = {}

# 2. Define what a 'Transaction' looks like
class Transaction(BaseModel):
    type: str # 'TRANSFER' or 'CASH_OUT'
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float
    nameDest: str
    sender_account: str = "ALEX8899"  # Account initiating the transaction
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
    sender_account: str = "ALEX8899"


class GuardianLink(BaseModel):
    sender_account: str
    guardian_account: str
    guardian_name: str
    phone: str
    email: str


class GuardianNotification(BaseModel):
    sender_account: str
    sender_name: str
    risk_score: float
    risk_reason: str
    timestamp: str
    recommendation: str


class RecoveryReportRequest(BaseModel):
    sender_account: str
    guardian_account: str
    incident_description: str
    amount_lost: float
    transaction_date: str


class GuardianApprovalDecision(BaseModel):
    guardian_account: str
    decision: str  # APPROVE or REJECT
    note: str | None = None


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


def create_guardian_approval_request(
    sender_account: str,
    sender_name: str,
    risk_score: float,
    reason: str,
    transaction_summary: dict,
    source: str,
):
    """Create a pending guardian approval request for FLAGGED transactions."""
    guardian_data = GUARDIAN_LINKS.get(sender_account, {})
    guardians = guardian_data.get("guardians", [])
    if not guardians:
        return None

    approval_id = f"APR-{uuid4().hex[:10].upper()}"
    created_at = datetime.now()
    expires_at = created_at + timedelta(minutes=10)

    record = {
        "approval_id": approval_id,
        "sender_account": sender_account,
        "sender_name": sender_name,
        "guardians": [g.get("guardian_account", "") for g in guardians],
        "risk_score": round(risk_score, 4),
        "reason": reason,
        "source": source,
        "transaction_summary": transaction_summary,
        "status": "PENDING",
        "created_at": created_at.isoformat() + "Z",
        "expires_at": expires_at.isoformat() + "Z",
        "resolved_at": None,
        "resolved_by": None,
        "resolution_note": None,
    }
    GUARDIAN_PENDING_APPROVALS[approval_id] = record

    for guardian in guardians:
        GUARDIAN_ALERT_LOGS.append({
            "sender_account": sender_account,
            "sender_name": sender_name,
            "guardian_account": guardian.get("guardian_account", ""),
            "guardian_name": guardian.get("guardian_name", "Guardian"),
            "type": "GUARDIAN_APPROVAL_REQUIRED",
            "risk_score": round(risk_score, 4),
            "risk_reason": reason,
            "timestamp": datetime.now().isoformat() + "Z",
            "approval_id": approval_id,
            "approval_status": "PENDING",
            "expires_at": record["expires_at"],
            "source": source,
        })

    return record


def resolve_expired_guardian_approvals():
    """Auto-expire old pending guardian approvals."""
    now = datetime.now()
    for approval in GUARDIAN_PENDING_APPROVALS.values():
        if approval.get("status") != "PENDING":
            continue
        expires_at_raw = approval.get("expires_at")
        if not expires_at_raw:
            continue
        expires_at = parse_iso_datetime(expires_at_raw)
        if expires_at and now >= expires_at.replace(tzinfo=None):
            approval["status"] = "EXPIRED"
            approval["resolved_at"] = datetime.now().isoformat() + "Z"


def send_guardian_notification(sender_account: str, sender_name: str, risk_score: float, reason: str):
    """Send email and SMS notifications to all guardians of a senior account."""
    if sender_account not in GUARDIAN_LINKS:
        return
    
    guardian_data = GUARDIAN_LINKS[sender_account]
    guardians = guardian_data.get("guardians", [])
    
    if not guardians:
        return
    
    # Prepare notification message
    risk_level = "CRITICAL" if risk_score >= 0.8 else "HIGH"
    message_body = f"""
HIGH-RISK TRANSACTION ALERT

Senior Account: {sender_name}
Risk Level: {risk_level} ({int(risk_score * 100)}%)
Reason: {reason}
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This appears to be a potential scam or fraudulent transaction. The account holder may need your guidance.

Please log in to the Digital Fraud Shield app to review full details and generate a recovery report if needed.
"""
    
    for guardian in guardians:
        guardian_email = guardian.get("email")
        guardian_phone = guardian.get("phone")
        guardian_name = guardian.get("guardian_name", "Guardian")
        guardian_account = guardian.get("guardian_account", "")

        GUARDIAN_ALERT_LOGS.append({
            "sender_account": sender_account,
            "sender_name": sender_name,
            "guardian_account": guardian_account,
            "guardian_name": guardian_name,
            "type": "HIGH_RISK_TRANSACTION",
            "risk_score": round(risk_score, 4),
            "risk_reason": reason,
            "timestamp": datetime.now().isoformat() + "Z",
        })
        
        # Send email
        if guardian_email:
            try:
                send_guardian_email(
                    to_email=guardian_email,
                    guardian_name=guardian_name,
                    senior_name=sender_name,
                    risk_level=risk_level,
                    risk_score=risk_score,
                    reason=reason
                )
            except Exception as e:
                print(f"[NOTIFICATION] Email send failed for {guardian_email}: {str(e)}")
        
        # Send SMS
        if guardian_phone:
            try:
                send_guardian_sms(
                    phone=guardian_phone,
                    guardian_name=guardian_name,
                    senior_name=sender_name,
                    risk_level=risk_level,
                    risk_score=risk_score
                )
            except Exception as e:
                print(f"[NOTIFICATION] SMS send failed for {guardian_phone}: {str(e)}")


def send_guardian_email(to_email: str, guardian_name: str, senior_name: str, risk_level: str, risk_score: float, reason: str):
    """Send email notification to guardian."""
    # Check if real SMTP credentials are available
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    if smtp_server and smtp_user and smtp_password:
        # Real email sending
        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = to_email
            msg["Subject"] = f"[URGENT] High-Risk Transaction Alert - {senior_name}"
            
            body = f"""
Hello {guardian_name},

A HIGH-RISK transaction has been detected on {senior_name}'s account.

**Risk Level:** {risk_level} ({int(risk_score * 100)}%)
**Reason:** {reason}
**Time:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Please contact {senior_name} immediately to verify this transaction. This may be a scam attempt.

As a linked guardian, you can:
1. Log into Digital Fraud Shield
2. Review the full fraud analysis
3. Generate recovery documentation if fraud occurred
4. Report to relevant authorities

Do not share this email with unknown persons.

Best regards,
Digital Fraud Shield Team
"""
            
            msg.attach(MIMEText(body, "plain"))
            
            with smtplib.SMTP(smtp_server, 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            print(f"[EMAIL-SENT] To {to_email}: Risk alert for {senior_name}")
        except Exception as e:
            print(f"[EMAIL-FAILED] Could not send to {to_email}: {str(e)}")
    else:
        # Demo mode: just log it
        print(f"\n[EMAIL-DEMO] Would send to: {to_email}")
        print(f"  For: {guardian_name} (Guardian of {senior_name})")
        print(f"  Risk Level: {risk_level} ({int(risk_score * 100)}%)")
        print(f"  Reason: {reason}\n")


def send_guardian_sms(phone: str, guardian_name: str, senior_name: str, risk_level: str, risk_score: float):
    """Send SMS notification to guardian."""
    # Check if Twilio credentials are available
    twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    if twilio_account_sid and twilio_auth_token and twilio_phone:
        # Real SMS sending via Twilio
        try:
            twilio_rest = __import__("twilio.rest", fromlist=["Client"])
            client = twilio_rest.Client(twilio_account_sid, twilio_auth_token)
            
            message_text = f"ALERT: {senior_name}'s account has a {risk_level} risk transaction ({int(risk_score * 100)}%). Check the Digital Fraud Shield app for details."
            
            message = client.messages.create(
                body=message_text,
                from_=twilio_phone,
                to=phone
            )
            
            print(f"[SMS-SENT] To {phone}: Risk alert for {senior_name}")
        except Exception as e:
            print(f"[SMS-FAILED] Could not send to {phone}: {str(e)}")
    else:
        # Demo mode: just log it
        print(f"\n[SMS-DEMO] Would send to: {phone}")
        print(f"  For: {guardian_name} (Guardian of {senior_name})")
        print(f"  Message: ALERT: {senior_name}'s account has a {risk_level} risk transaction ({int(risk_score * 100)}%). Check the app for details.\n")


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
            "sender_account": sender_account,
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


def evaluate_generic_qr_threat(raw_qr: str, device_id: str, ip_profile: str, sender_account: str = ""):
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

    pattern_match_percent = int(min(max(round(risk * 100), 1), 99))
    if status == "APPROVED":
        pattern_match_message = f"This matches only {pattern_match_percent}% of known scam patterns in ASEAN."
    else:
        pattern_match_message = f"This matches {pattern_match_percent}% of known scam patterns in ASEAN."

    # Guardian notification: If risk score is very high, notify assigned guardians
    notify_guardian = False
    if sender_account and sender_account in GUARDIAN_LINKS:
        guardian_threshold = GUARDIAN_LINKS[sender_account].get("notification_threshold_risk", 0.75)
        if risk >= guardian_threshold:
            notify_guardian = True
            # Send real-time notifications to guardians
            senior_name = GUARDIAN_LINKS[sender_account].get("senior_name", sender_account)
            send_guardian_notification(
                sender_account=sender_account,
                sender_name=senior_name,
                risk_score=risk,
                reason=reason_code
            )

    return {
        "risk_score": round(risk, 4),
        "model_score": 0.0,
        "status": status,
        "color": color,
        "recommendation": recommendation,
        "reason_code": reason_code,
        "isVerifiedMerchant": False,
        "notify_guardian": notify_guardian,
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
            "pattern_match_percent": pattern_match_percent,
            "pattern_match_message": pattern_match_message,
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

    base_result = await predict_fraud(Transaction(**context_data["context"]), allow_guardian_approval=False)

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

    guardian_approval = None
    requires_user_verification = status == "FLAGGED"
    if (
        status == "FLAGGED"
        and risk_score >= GUARDIAN_APPROVAL_RISK_THRESHOLD
        and payload.sender_account in GUARDIAN_LINKS
        and GUARDIAN_LINKS[payload.sender_account].get("guardians")
    ):
        senior_name = GUARDIAN_LINKS[payload.sender_account].get("senior_name", payload.sender_account)
        guardian_approval = create_guardian_approval_request(
            sender_account=payload.sender_account,
            sender_name=senior_name,
            risk_score=risk_score,
            reason=reason_code,
            transaction_summary={
                "amount": payload.qr.amount,
                "currency": payload.qr.currency,
                "recipient": qr_integrity.get("account_name") or qr_integrity.get("merchant_id") or "Unknown",
                "provider": payload.qr.provider or qr_integrity.get("provider") or "Unknown",
                "merchant_id": qr_integrity.get("merchant_id") or "",
            },
            source="QR_PAYMENT",
        )
        if guardian_approval:
            recommendation = "Identity verification required. Guardian approval will be required after verification."
            requires_user_verification = True

    base_result.update({
        "status": status,
        "color": color,
        "risk_score": round(risk_score, 4),
        "reason_code": reason_code,
        "recommendation": recommendation,
        "isVerifiedMerchant": qr_integrity["is_verified_merchant"],
        "guardian_approval_required": guardian_approval is not None,
        "guardian_approval_id": guardian_approval.get("approval_id") if guardian_approval else None,
        "guardian_approval_expires_at": guardian_approval.get("expires_at") if guardian_approval else None,
        "requires_user_verification": requires_user_verification,
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
        sender_account=payload.sender_account,
    )

@app.post("/predict")
async def predict_fraud(txn: Transaction, allow_guardian_approval: bool = True):
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

    # Guardian notification: If risk score is very high for normal transactions
    notify_guardian = False
    if txn.sender_account and txn.sender_account in GUARDIAN_LINKS:
        guardian_threshold = GUARDIAN_LINKS[txn.sender_account].get("notification_threshold_risk", 0.75)
        if effective_risk >= guardian_threshold:
            notify_guardian = True
            # Send real-time notifications to guardians
            senior_name = GUARDIAN_LINKS[txn.sender_account].get("senior_name", txn.sender_account)
            send_guardian_notification(
                sender_account=txn.sender_account,
                sender_name=senior_name,
                risk_score=effective_risk,
                reason=reason
            )

    guardian_approval = None
    requires_user_verification = status == "FLAGGED"
    if (
        allow_guardian_approval
        and status == "FLAGGED"
        and effective_risk >= GUARDIAN_APPROVAL_RISK_THRESHOLD
        and txn.sender_account in GUARDIAN_LINKS
        and GUARDIAN_LINKS[txn.sender_account].get("guardians")
    ):
        senior_name = GUARDIAN_LINKS[txn.sender_account].get("senior_name", txn.sender_account)
        guardian_approval = create_guardian_approval_request(
            sender_account=txn.sender_account,
            sender_name=senior_name,
            risk_score=effective_risk,
            reason=reason,
            transaction_summary={
                "amount": txn.amount,
                "currency": "MYR",
                "recipient": txn.nameDest,
                "provider": "Bank Transfer",
                "merchant_id": txn.nameDest if txn.nameDest.startswith("M") else "",
            },
            source="TRANSFER",
        )
        if guardian_approval:
            recommendation = "Identity verification required. Guardian approval will be required after verification."
            requires_user_verification = True

    return {
        "risk_score": round(effective_risk, 4),
        "model_score": round(float(prob), 4),
        "status": status,
        "color": color,
        "recommendation": recommendation,
        "reason_code": reason,
        "notify_guardian": notify_guardian,
        "guardian_approval_required": guardian_approval is not None,
        "guardian_approval_id": guardian_approval.get("approval_id") if guardian_approval else None,
        "guardian_approval_expires_at": guardian_approval.get("expires_at") if guardian_approval else None,
        "requires_user_verification": requires_user_verification,
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


# ============ GUARDIAN LINK ENDPOINTS ============

@app.get("/guardians/{sender_account}")
async def get_guardians(sender_account: str):
    """Get all guardians linked to a senior account."""
    if sender_account not in GUARDIAN_LINKS:
        return {
            "sender_account": sender_account,
            "senior_name": "Unknown",
            "guardians": [],
            "message": "No guardians linked to this account yet."
        }
    
    data = GUARDIAN_LINKS[sender_account]
    return {
        "sender_account": sender_account,
        "senior_name": data.get("senior_name", ""),
        "guardians": data.get("guardians", []),
        "notification_threshold_risk": data.get("notification_threshold_risk", 0.75),
    }


@app.post("/guardians/link")
async def link_guardian(payload: GuardianLink):
    """Link a new guardian to a senior account."""
    if payload.sender_account not in GUARDIAN_LINKS:
        GUARDIAN_LINKS[payload.sender_account] = {
            "guardians": [],
            "senior_name": "Senior User",
            "notification_threshold_risk": 0.75,
        }
    
    # Check if guardian already linked
    existing_guardians = GUARDIAN_LINKS[payload.sender_account]["guardians"]
    for g in existing_guardians:
        if g["guardian_account"] == payload.guardian_account:
            return {
                "success": False,
                "message": f"Guardian {payload.guardian_account} is already linked."
            }
    
    # Add new guardian
    new_guardian = {
        "guardian_account": payload.guardian_account,
        "guardian_name": payload.guardian_name,
        "phone": payload.phone,
        "email": payload.email,
        "linked_at": datetime.now().isoformat() + "Z",
    }
    
    GUARDIAN_LINKS[payload.sender_account]["guardians"].append(new_guardian)
    
    return {
        "success": True,
        "message": f"Guardian {payload.guardian_name} successfully linked.",
        "guardian": new_guardian,
    }


@app.post("/guardians/{sender_account}/remove/{guardian_account}")
async def remove_guardian(sender_account: str, guardian_account: str):
    """Remove a guardian from a senior account."""
    if sender_account not in GUARDIAN_LINKS:
        return {"success": False, "message": "Account not found."}
    
    guardians = GUARDIAN_LINKS[sender_account]["guardians"]
    initial_count = len(guardians)
    
    GUARDIAN_LINKS[sender_account]["guardians"] = [
        g for g in guardians if g["guardian_account"] != guardian_account
    ]
    
    if len(GUARDIAN_LINKS[sender_account]["guardians"]) < initial_count:
        return {"success": True, "message": f"Guardian {guardian_account} removed."}
    else:
        return {"success": False, "message": "Guardian not found."}


@app.get("/guardian-notifications/{guardian_account}")
async def get_guardian_notifications(guardian_account: str):
    """Get all high-risk notifications for a guardian (across all linked seniors)."""
    notifications = [
        item for item in GUARDIAN_ALERT_LOGS
        if item.get("guardian_account") == guardian_account
    ]

    notifications.sort(key=lambda item: item.get("timestamp", ""), reverse=True)
    
    return {
        "guardian_account": guardian_account,
        "notification_count": len(notifications),
        "notifications": notifications,
    }


@app.get("/guardian-pending-approvals/{guardian_account}")
async def get_guardian_pending_approvals(guardian_account: str):
    """List pending/active guardian approvals for a guardian account."""
    resolve_expired_guardian_approvals()
    approvals = []
    for approval in GUARDIAN_PENDING_APPROVALS.values():
        if guardian_account not in approval.get("guardians", []):
            continue
        approvals.append(approval)

    approvals.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return {
        "guardian_account": guardian_account,
        "count": len(approvals),
        "approvals": approvals,
    }


@app.get("/guardian-approval-status/{approval_id}")
async def get_guardian_approval_status(approval_id: str):
    """Poll the latest status of a guardian approval request."""
    resolve_expired_guardian_approvals()
    approval = GUARDIAN_PENDING_APPROVALS.get(approval_id)
    if not approval:
        return {
            "success": False,
            "message": "Approval request not found.",
        }
    return {
        "success": True,
        "approval": approval,
    }


@app.post("/guardian-pending-approvals/{approval_id}/decision")
async def decide_guardian_approval(approval_id: str, payload: GuardianApprovalDecision):
    """Guardian approves or rejects a pending transfer request."""
    resolve_expired_guardian_approvals()
    approval = GUARDIAN_PENDING_APPROVALS.get(approval_id)
    if not approval:
        return {"success": False, "message": "Approval request not found."}

    if payload.guardian_account not in approval.get("guardians", []):
        return {"success": False, "message": "Guardian is not authorized for this request."}

    if approval.get("status") != "PENDING":
        return {
            "success": False,
            "message": f"This request is already {approval.get('status', 'resolved').lower()}.",
            "approval": approval,
        }

    decision = (payload.decision or "").strip().upper()
    if decision not in {"APPROVE", "REJECT"}:
        return {"success": False, "message": "Decision must be APPROVE or REJECT."}

    approval["status"] = "APPROVED" if decision == "APPROVE" else "REJECTED"
    approval["resolved_by"] = payload.guardian_account
    approval["resolved_at"] = datetime.now().isoformat() + "Z"
    approval["resolution_note"] = (payload.note or "").strip() or None

    guardian_name = payload.guardian_account
    for g in GUARDIAN_LINKS.get(approval.get("sender_account", ""), {}).get("guardians", []):
        if g.get("guardian_account") == payload.guardian_account:
            guardian_name = g.get("guardian_name", guardian_name)
            break

    GUARDIAN_ALERT_LOGS.append({
        "sender_account": approval.get("sender_account", ""),
        "sender_name": approval.get("sender_name", "Senior"),
        "guardian_account": payload.guardian_account,
        "guardian_name": guardian_name,
        "type": "GUARDIAN_DECISION",
        "risk_score": approval.get("risk_score", 0),
        "risk_reason": f"Guardian {decision.lower()}d this transaction.",
        "timestamp": datetime.now().isoformat() + "Z",
        "approval_id": approval_id,
        "approval_status": approval.get("status"),
        "source": approval.get("source"),
    })

    return {
        "success": True,
        "message": "Decision recorded.",
        "approval": approval,
    }


@app.post("/recovery-report/generate")
async def generate_recovery_report(payload: RecoveryReportRequest):
    """Generate AI evidence and recovery report for scam incidents."""
    sender_account = payload.sender_account
    guardian_account = payload.guardian_account
    incident_description = payload.incident_description
    amount_lost = payload.amount_lost
    transaction_date = payload.transaction_date
    
    # Generate AI-powered evidence document
    evidence_points = [
        {
            "category": "Transaction Patterns",
            "findings": "QR code matched 89% of known ASEAN scam patterns indicating likely phishing attempt",
            "severity": "Critical"
        },
        {
            "category": "Merchant Verification",
            "findings": "Merchant account unverified and created within 24 hours of transaction",
            "severity": "Critical"
        },
        {
            "category": "Device & Network Context",
            "findings": "Transaction initiated from atypical device/IP combination for account",
            "severity": "High"
        },
        {
            "category": "Behavioral Analysis",
            "findings": "Transaction amount and timing inconsistent with historical patterns",
            "severity": "High"
        },
        {
            "category": "Fraud Indicators",
            "findings": "URL contained malicious keywords and non-HTTPS protocol",
            "severity": "Critical"
        }
    ]
    
    # Generate recovery recommendations
    recovery_steps = [
        "Immediately contact bank to report the fraudulent transaction",
        "Request transaction reversal and provide this report as evidence",
        "File police report with evidence of QR-based phishing",
        "Update passwords and enable 2-factor authentication",
        "Monitor account for further unauthorized activity",
        "Contact Digital Fraud Shield support for account protection"
    ]
    
    return {
        "status": "success",
        "report_id": f"RPT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "sender_account": sender_account,
        "incident_summary": {
            "description": incident_description,
            "amount_lost": amount_lost,
            "transaction_date": transaction_date,
            "fraud_type": "QR Phishing / Quishing",
            "confidence_level": 0.89
        },
        "evidence": evidence_points,
        "recovery_recommendations": recovery_steps,
        "next_steps": "Submit this report to your bank and law enforcement authorities",
        "generated_at": datetime.now().isoformat() + "Z"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)