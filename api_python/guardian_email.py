"""
guardian_email.py
-----------------
Sends guardian verification emails and confirmation emails via SMTP.
Credentials are loaded from .env in the same directory (git-ignored).

Run directly for a smoke test:
    cd api_python
    python guardian_email.py
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
_ENV_PATH = Path(__file__).parent / ".env"

def _load_env(env_path: Path) -> None:
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

_load_env(_ENV_PATH)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SMTP_HOST  = os.getenv("SMTP_HOST",  "smtp.gmail.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.environ["EMAIL_USER"]   # raises clearly if missing
EMAIL_PASS = os.environ["EMAIL_PASS"]
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------
def _send(to_email: str, subject: str, html_body: str) -> None:
    """Low-level SMTP send. Raises on failure so callers can handle it."""
    msg = MIMEMultipart("alternative")
    msg["From"]    = EMAIL_USER
    msg["To"]      = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
    print(f"[EMAIL-SENT] To: {to_email} | Subject: {subject}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def send_guardian_invite_email(
    guardian_email: str,
    token: str,
    senior_name: str = "a Digital Fraud Shield user",
    guardian_name: str = "Guardian",
) -> None:
    """
    Send the guardian verification invite.
    Guardian clicks Accept/Reject from the link in this email.
    """
    verify_url = f"{APP_BASE_URL}/verify-guardian?token={token}"
    reject_url = f"{APP_BASE_URL}/verify-guardian?token={token}&action=reject"

    subject = "Guardian Verification Request - Digital Fraud Shield"
    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }}
    .wrapper {{ max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px;
                overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }}
    .header {{ background: linear-gradient(135deg, #003049 0%, #051d3e 100%);
               padding: 36px 32px; text-align: center; }}
    .header h1 {{ color: #F77F00; font-size: 22px; margin: 0 0 4px; letter-spacing: 0.5px; }}
    .header p {{ color: #FCBF49; font-size: 13px; margin: 0; }}
    .body {{ padding: 32px; color: #1f2937; line-height: 1.7; }}
    .body h2 {{ font-size: 18px; color: #003049; margin-top: 0; }}
    .info-box {{ background: #fff8ee; border-left: 4px solid #F77F00;
                 border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 14px; }}
    .btn-accept {{ display: inline-block; background: #16a34a; color: #fff; font-weight: 700;
                   font-size: 15px; padding: 14px 32px; border-radius: 8px;
                   text-decoration: none; margin: 8px 8px 8px 0; }}
    .btn-reject {{ display: inline-block; background: #dc2626; color: #fff; font-weight: 700;
                   font-size: 15px; padding: 14px 32px; border-radius: 8px;
                   text-decoration: none; margin: 8px 0; }}
    .footer {{ background: #f9fafb; padding: 20px 32px; font-size: 12px;
               color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; }}
    .token-code {{ font-family: monospace; font-size: 12px; color: #6b7280;
                   background: #f3f4f6; padding: 4px 8px; border-radius: 4px; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Digital Fraud Shield</h1>
      <p>Guardian Verification Request</p>
    </div>
    <div class="body">
      <h2>Hello {guardian_name},</h2>
      <p>
        <strong>{senior_name}</strong> has added you as a <strong>trusted guardian</strong>
        on Digital Fraud Shield — a fraud protection platform that protects seniors
        from online scams.
      </p>
      <div class="info-box">
        <strong>What does being a guardian mean?</strong><br>
        You will receive alerts when suspicious transactions are detected on
        {senior_name}'s account, and can help review or block them.
      </div>
      <p>Please click one of the buttons below to respond:</p>
      <div>
        <a href="{verify_url}" class="btn-accept">Accept</a>
        <a href="{reject_url}" class="btn-reject">Reject</a>
      </div>
      <p style="margin-top:24px; font-size:13px; color:#6b7280;">
        Or paste this link into your browser:<br>
        <span class="token-code">{verify_url}</span>
      </p>
      <p style="font-size:13px; color:#9ca3af;">
        This link expires in 24 hours. If you did not expect this email, you can safely ignore it.
      </p>
    </div>
    <div class="footer">
      Digital Fraud Shield &bull; Protecting Seniors Online<br>
      Token: <span class="token-code">{token}</span>
    </div>
  </div>
</body>
</html>
"""
    _send(guardian_email, subject, html)


def send_guardian_accepted_confirmation(
    guardian_email: str,
    senior_email: str,
    senior_name: str,
    guardian_name: str,
    token: str,
) -> None:
    """Send confirmation emails to BOTH parties after guardian accepts."""
    now = datetime.now().strftime("%d %b %Y, %I:%M %p")

    # --- Email to guardian ---
    guardian_html = f"""
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin:0; padding:0; }}
  .wrapper {{ max-width:560px; margin:40px auto; background:#fff; border-radius:12px;
              overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }}
  .header {{ background:linear-gradient(135deg,#003049 0%,#051d3e 100%); padding:36px 32px; text-align:center; }}
  .header h1 {{ color:#F77F00; font-size:22px; margin:0 0 4px; }}
  .header p {{ color:#FCBF49; font-size:13px; margin:0; }}
  .body {{ padding:32px; color:#1f2937; line-height:1.7; }}
  .badge {{ display:inline-block; background:#dcfce7; color:#16a34a; font-weight:700;
            padding:6px 16px; border-radius:999px; font-size:14px; margin-bottom:16px; }}
  .footer {{ background:#f9fafb; padding:20px 32px; font-size:12px;
             color:#9ca3af; text-align:center; border-top:1px solid #e5e7eb; }}
</style></head><body>
<div class="wrapper">
  <div class="header"><h1>Digital Fraud Shield</h1><p>Guardian Link Confirmed</p></div>
  <div class="body">
    <div class="badge">Guardian Activated</div>
    <p>Hello <strong>{guardian_name}</strong>,</p>
    <p>You have successfully accepted the guardian role for <strong>{senior_name}</strong>.</p>
    <p>You will now receive real-time alerts whenever a suspicious transaction is detected on
       {senior_name}'s account. You can approve or block transactions directly from the alert.</p>
    <p style="color:#6b7280; font-size:13px;">Confirmed on: {now}</p>
  </div>
  <div class="footer">Digital Fraud Shield &bull; Token: {token}</div>
</div></body></html>
"""
    _send(guardian_email, "You Are Now a Guardian - Digital Fraud Shield", guardian_html)

    # --- Email to senior ---
    senior_html = f"""
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body {{ font-family:'Segoe UI',Arial,sans-serif; background:#f3f4f6; margin:0; padding:0; }}
  .wrapper {{ max-width:560px; margin:40px auto; background:#fff; border-radius:12px;
              overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }}
  .header {{ background:linear-gradient(135deg,#003049 0%,#051d3e 100%); padding:36px 32px; text-align:center; }}
  .header h1 {{ color:#F77F00; font-size:22px; margin:0 0 4px; }}
  .header p {{ color:#FCBF49; font-size:13px; margin:0; }}
  .body {{ padding:32px; color:#1f2937; line-height:1.7; }}
  .badge {{ display:inline-block; background:#dcfce7; color:#16a34a; font-weight:700;
            padding:6px 16px; border-radius:999px; font-size:14px; margin-bottom:16px; }}
  .footer {{ background:#f9fafb; padding:20px 32px; font-size:12px;
             color:#9ca3af; text-align:center; border-top:1px solid #e5e7eb; }}
</style></head><body>
<div class="wrapper">
  <div class="header"><h1>Digital Fraud Shield</h1><p>Guardian Link Confirmed</p></div>
  <div class="body">
    <div class="badge">Guardian Accepted</div>
    <p>Hello <strong>{senior_name}</strong>,</p>
    <p>Great news! <strong>{guardian_name}</strong> has accepted your guardian request.</p>
    <p>They are now linked to your account and will be notified whenever a high-risk
       transaction is detected — giving you an extra layer of protection.</p>
    <p style="color:#6b7280; font-size:13px;">Confirmed on: {now}</p>
  </div>
  <div class="footer">Digital Fraud Shield &bull; Protecting Seniors Online</div>
</div></body></html>
"""
    _send(senior_email, f"{guardian_name} Has Accepted Your Guardian Request", senior_html)


def send_guardian_rejected_confirmation(
    guardian_email: str,
    senior_email: str,
    senior_name: str,
    guardian_name: str,
    token: str,
) -> None:
    """Notify senior that guardian declined."""
    now = datetime.now().strftime("%d %b %Y, %I:%M %p")

    senior_html = f"""
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body {{ font-family:'Segoe UI',Arial,sans-serif; background:#f3f4f6; margin:0; padding:0; }}
  .wrapper {{ max-width:560px; margin:40px auto; background:#fff; border-radius:12px;
              overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }}
  .header {{ background:linear-gradient(135deg,#003049 0%,#051d3e 100%); padding:36px 32px; text-align:center; }}
  .header h1 {{ color:#F77F00; font-size:22px; margin:0 0 4px; }}
  .header p {{ color:#FCBF49; font-size:13px; margin:0; }}
  .body {{ padding:32px; color:#1f2937; line-height:1.7; }}
  .badge {{ display:inline-block; background:#fee2e2; color:#dc2626; font-weight:700;
            padding:6px 16px; border-radius:999px; font-size:14px; margin-bottom:16px; }}
  .footer {{ background:#f9fafb; padding:20px 32px; font-size:12px;
             color:#9ca3af; text-align:center; border-top:1px solid #e5e7eb; }}
</style></head><body>
<div class="wrapper">
  <div class="header"><h1>Digital Fraud Shield</h1><p>Guardian Request Update</p></div>
  <div class="body">
    <div class="badge">Guardian Declined</div>
    <p>Hello <strong>{senior_name}</strong>,</p>
    <p><strong>{guardian_name}</strong> has declined your guardian request.</p>
    <p>You can invite another trusted person as your guardian from the app.</p>
    <p style="color:#6b7280; font-size:13px;">Declined on: {now}</p>
  </div>
  <div class="footer">Digital Fraud Shield &bull; Protecting Seniors Online</div>
</div></body></html>
"""
    _send(senior_email, f"{guardian_name} Declined Your Guardian Request", senior_html)


def send_guardian_alert_email(
    guardian_email: str,
    guardian_name: str,
    senior_name: str,
    risk_level: str,
    risk_score: float,
    reason: str,
    approval_id: str | None = None,
) -> None:
    """Send a high-risk transaction alert to guardian."""
    action_url = (
        f"{APP_BASE_URL}/guardian-review?approval_id={approval_id}"
        if approval_id else APP_BASE_URL
    )
    color = "#dc2626" if risk_level == "CRITICAL" else "#d97706"
    subject = f"[{risk_level}] Fraud Alert - {senior_name}'s Account"
    html = f"""
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body {{ font-family:'Segoe UI',Arial,sans-serif; background:#f3f4f6; margin:0; padding:0; }}
  .wrapper {{ max-width:560px; margin:40px auto; background:#fff; border-radius:12px;
              overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }}
  .header {{ background:linear-gradient(135deg,#003049 0%,#051d3e 100%); padding:36px 32px; text-align:center; }}
  .header h1 {{ color:#F77F00; font-size:22px; margin:0 0 4px; }}
  .header p {{ color:#FCBF49; font-size:13px; margin:0; }}
  .alert-bar {{ background:{color}; color:#fff; text-align:center; padding:12px;
                font-weight:700; font-size:15px; letter-spacing:1px; }}
  .body {{ padding:32px; color:#1f2937; line-height:1.7; }}
  .stat {{ display:inline-block; background:#f3f4f6; border-radius:8px; padding:12px 20px;
           margin:8px 8px 8px 0; text-align:center; }}
  .stat-val {{ font-size:26px; font-weight:800; color:{color}; }}
  .stat-label {{ font-size:12px; color:#6b7280; }}
  .reason-box {{ background:#fff8ee; border-left:4px solid #F77F00; border-radius:6px;
                 padding:14px 16px; margin:20px 0; font-size:14px; }}
  .btn {{ display:inline-block; background:#003049; color:#fff; font-weight:700;
          font-size:15px; padding:14px 32px; border-radius:8px; text-decoration:none; margin-top:8px; }}
  .footer {{ background:#f9fafb; padding:20px 32px; font-size:12px;
             color:#9ca3af; text-align:center; border-top:1px solid #e5e7eb; }}
</style></head><body>
<div class="wrapper">
  <div class="header"><h1>Digital Fraud Shield</h1><p>Real-Time Fraud Alert</p></div>
  <div class="alert-bar">FRAUD ALERT - {risk_level} RISK</div>
  <div class="body">
    <p>Hello <strong>{guardian_name}</strong>,</p>
    <p>A suspicious transaction was detected on <strong>{senior_name}</strong>'s account:</p>
    <div>
      <div class="stat"><div class="stat-val">{int(risk_score * 100)}%</div><div class="stat-label">Risk Score</div></div>
      <div class="stat"><div class="stat-val">{risk_level}</div><div class="stat-label">Severity</div></div>
    </div>
    <div class="reason-box"><strong>Reason:</strong> {reason}</div>
    <a href="{action_url}" class="btn">Review Transaction</a>
  </div>
  <div class="footer">Digital Fraud Shield &bull; Protecting Seniors Online</div>
</div></body></html>
"""
    _send(guardian_email, subject, html)


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    print("=== Guardian Email smoke test ===")
    print(f"SMTP Host : {SMTP_HOST}:{SMTP_PORT}")
    print(f"From      : {EMAIL_USER}")

    test_guardian_email = os.getenv("GUARDIAN_EMAIL", "")
    test_senior_email   = os.getenv("SENIOR_EMAIL",   "")
    test_token          = "demo-token-abc123"

    if not test_guardian_email:
        print("[SKIP] Set GUARDIAN_EMAIL in .env to run the smoke test.")
        sys.exit(0)

    errors = 0
    print(f"\nSending invite to: {test_guardian_email}")
    try:
        send_guardian_invite_email(
            guardian_email=test_guardian_email,
            token=test_token,
            senior_name="Alex Tan",
            guardian_name="Sarah (Daughter)",
        )
        print("[OK] Invite sent.")
    except Exception as e:
        print(f"[FAILED] {e}")
        errors += 1

    print(f"\nDone. {'Success' if errors == 0 else f'{errors} error(s)'}.")
    sys.exit(errors)
