"""
Shadow AI – Alerting Module  (Phase 2)

Dispatches alerts via:
  • Slack  (SLACK_WEBHOOK_URL)
  • Email  (ALERT_EMAIL_TO / ALERT_SMTP_* env vars)

The gateway calls send_alert() — it is fully non-blocking and never raises.
"""
import json
import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.mime.text import MIMEText


def send_alert(risk_level: str, user_id: str, findings: dict) -> None:
    """
    Fire all configured alert channels for a blocked / critical event.
    Swallows every exception so the gateway is never disrupted.
    """
    message = _build_message(risk_level, user_id, findings)

    _slack(message)
    _email(message, risk_level)


# ── Message builder ───────────────────────────────────────────────────────────

def _build_message(risk_level: str, user_id: str, findings: dict) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    finding_str = ", ".join(findings.keys()) if findings else "unknown"
    return (
        f"[Shadow AI Alert]\n"
        f"🔴 Risk Level : {risk_level}\n"
        f"👤 User       : {user_id}\n"
        f"🎯 Findings   : {finding_str}\n"
        f"⏰ Time       : {ts}"
    )


# ── Slack ─────────────────────────────────────────────────────────────────────

def _slack(message: str) -> None:
    webhook = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    if not webhook:
        return
    try:
        import urllib.request
        payload = json.dumps({"text": message}).encode("utf-8")
        req = urllib.request.Request(
            webhook,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5):
            pass
    except Exception:
        pass


# ── Email ─────────────────────────────────────────────────────────────────────

def _email(message: str, risk_level: str) -> None:
    to_addr   = os.getenv("ALERT_EMAIL_TO",   "").strip()
    from_addr = os.getenv("ALERT_EMAIL_FROM", "").strip()
    smtp_host = os.getenv("ALERT_SMTP_HOST",  "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("ALERT_SMTP_PORT", "587"))
    smtp_user = os.getenv("ALERT_SMTP_USER",  "").strip()
    smtp_pass = os.getenv("ALERT_SMTP_PASSWORD", "").strip()

    if not (to_addr and from_addr and smtp_user and smtp_pass):
        return

    try:
        msg = MIMEText(message, "plain")
        msg["Subject"] = f"[Shadow AI] {risk_level} Alert Detected"
        msg["From"]    = from_addr
        msg["To"]      = to_addr

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, [to_addr], msg.as_string())
    except Exception:
        pass
