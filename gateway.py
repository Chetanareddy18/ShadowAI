"""
Shadow AI – Security Gateway  (Phase 3)

Full pipeline for every prompt:
  Auth → Rate-limit (DB-backed) → Regex injection check
  → Semantic injection check (ML) → PII / secret scan
  → Topic classification → Risk score (+ topic multiplier)
  → Policy decision → Sanitize? → LLM call
  → Response scan → Anomaly detection
  → Audit log (SQLite) → Alert → Response

New in Phase 3
--------------
  • Semantic injection detector (TF-IDF + LogisticRegression)
  • Response scanner (PII, harmful content, system-prompt leak)
  • Topic classifier (8 domains, per-domain risk multiplier)
  • Anomaly detector (IsolationForest per user)
  • DB-backed rate limiter
  • User & Organisation management endpoints
  • Prometheus metrics (/metrics)
"""
import csv
import hashlib
import io
import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Load .env file if present
load_dotenv()

from auth import authenticate, create_access_token, _h as _hash_key
from db.database import get_db, init_db
from db.models import AnomalyEvent, AuditLog, Organisation, User
from injection_detector import detect_prompt_injection
from llm_client import call_llm
from policy_engine import evaluate_policy
from rate_limiter import check_rate_limit
from redactor import redact_text
from scanner import scan_sensitive_data

# Phase 3 imports (graceful — gateway still works if these fail)
try:
    from semantic_detector import detect_semantic_injection
    _SEMANTIC_AVAILABLE = True
except ImportError:
    _SEMANTIC_AVAILABLE = False

try:
    from response_scanner import scan_response
    _RESPONSE_SCAN_AVAILABLE = True
except ImportError:
    _RESPONSE_SCAN_AVAILABLE = False

try:
    from topic_classifier import classify_topic
    _TOPIC_AVAILABLE = True
except ImportError:
    _TOPIC_AVAILABLE = False

try:
    from anomaly_detector import score_request as score_anomaly
    _ANOMALY_AVAILABLE = True
except ImportError:
    _ANOMALY_AVAILABLE = False


app = FastAPI(
    title="Shadow AI Gateway",
    version="3.0",
    description=(
        "Enterprise AI security gateway — intercepts, scans, and protects every prompt. "
        "Phase 3: semantic injection detection, response scanning, "
        "topic classification, anomaly detection."
    ),
)

LOG_RAW_PROMPTS = os.getenv("SHADOW_LOG_RAW_PROMPTS", "false").lower() == "true"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("SHADOW_ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics (optional — requires prometheus-fastapi-instrumentator)
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    Instrumentator().instrument(app).expose(app)
except ImportError:
    pass


@app.on_event("startup")
def on_startup():
    init_db()


# ── Request / response models ─────────────────────────────────────────────────

class PromptRequest(BaseModel):
    prompt: str
    model: str | None = None
    org_id: str | None = None


class PolicyUpdateRequest(BaseModel):
    org_id: str
    policy: dict


class UserCreateRequest(BaseModel):
    user_id: str
    org_id: str
    role: str = "employee"
    api_key: str


class OrgCreateRequest(BaseModel):
    org_id: str
    name: str
    policy: dict | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def compute_risk(findings: dict) -> str:
    if any(k in findings for k in ("LLM_TOKEN", "DB_URL", "WEBHOOK")):
        return "CRITICAL"
    if "POTENTIAL_SECRET" in findings:
        return "HIGH"
    if "EMAIL" in findings or "PHONE" in findings:
        return "MEDIUM"
    return "LOW"


def fingerprint(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def _save_audit(
    db: Session,
    *,
    user: dict,
    decision: str,
    risk_level: str,
    findings: dict,
    message: str | None,
    prompt: str,
    model_used: str | None = None,
    llm_response: str | None = None,
    ip: str | None = None,
    extra: dict | None = None,
) -> str:
    extra = extra or {}
    entry = AuditLog(
        timestamp=datetime.utcnow(),
        user_id=user["user_id"],
        org_id=user.get("org_id", "default"),
        ip_address=ip,
        decision=decision,
        risk_level=risk_level,
        findings=findings,
        message=message,
        prompt_fingerprint=fingerprint(prompt),
        prompt_length=len(prompt),
        model_used=model_used,
        llm_response_length=len(llm_response) if llm_response else None,
        topic=extra.get("topic"),
        topic_risk_multiplier=str(extra.get("topic_risk_multiplier", "")),
        response_risk_level=extra.get("response_risk_level"),
        response_decision=extra.get("response_decision"),
        semantic_injection_score=str(extra.get("semantic_injection_score", "")),
        is_anomalous=str(extra.get("is_anomalous", False)).lower(),
    )
    db.add(entry)
    db.commit()
    return entry.id


def _fire_alert(risk_level: str, user_id: str, findings: dict) -> None:
    """Non-blocking alert dispatch — never crashes the gateway."""
    alert_levels = {
        lvl.strip().upper()
        for lvl in os.getenv("ALERT_ON_RISK_LEVELS", "CRITICAL").split(",")
        if lvl.strip()
    }
    if risk_level not in alert_levels:
        return
    try:
        from alerts.alerting import send_alert
        send_alert(risk_level=risk_level, user_id=user_id, findings=findings)
    except Exception:
        pass


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "Shadow AI Gateway",
        "version": "3.0",
        "docs": "/docs",
        "health": "/health",
        "features": [
            "regex_injection_detection",
            "semantic_injection_detection",
            "pii_secret_scanning",
            "response_scanning",
            "topic_classification",
            "anomaly_detection",
            "per_org_policy",
            "audit_logging",
            "alerting",
        ],
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "shadow-ai-gateway",
        "version": "3.0",
        "modules": {
            "semantic_detector": _SEMANTIC_AVAILABLE,
            "response_scanner": _RESPONSE_SCAN_AVAILABLE,
            "topic_classifier": _TOPIC_AVAILABLE,
            "anomaly_detector": _ANOMALY_AVAILABLE,
        },
    }


# ── Main prompt endpoint ──────────────────────────────────────────────────────

@app.post("/process_prompt")
def process_prompt(
    request: PromptRequest,
    req: Request,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    prompt = request.prompt
    org_id = request.org_id or user.get("org_id", "default")
    client_ip = req.client.host if req.client else None

    # 1. Rate limit (DB-backed)
    check_rate_limit(user["user_id"], db=db)

    # 2. Regex prompt injection check
    injection = detect_prompt_injection(prompt)
    if injection:
        _save_audit(db, user=user, decision="BLOCK", risk_level="CRITICAL",
                    findings={"PROMPT_INJECTION": injection},
                    message="Prompt injection attack detected.",
                    prompt=prompt, ip=client_ip)
        _fire_alert("CRITICAL", user["user_id"], {"PROMPT_INJECTION": injection})
        return {
            "decision": "BLOCK",
            "risk_level": "CRITICAL",
            "findings": {"PROMPT_INJECTION": injection},
            "message": "🚫 Prompt injection detected. Request blocked.",
        }

    # 2b. Semantic injection check (Phase 3 – ML-based)
    semantic_score = 0.0
    if _SEMANTIC_AVAILABLE:
        sem_result = detect_semantic_injection(prompt)
        semantic_score = sem_result["injection_probability"]
        if sem_result["is_injection"]:
            findings_sem = {
                "SEMANTIC_INJECTION": {
                    "probability": semantic_score,
                    "families": sem_result["top_families"],
                    "method": sem_result["method"],
                }
            }
            _save_audit(db, user=user, decision="BLOCK", risk_level="CRITICAL",
                        findings=findings_sem,
                        message="Semantic injection attack detected by ML model.",
                        prompt=prompt, ip=client_ip,
                        extra={"semantic_injection_score": semantic_score})
            _fire_alert("CRITICAL", user["user_id"], findings_sem)
            return {
                "decision": "BLOCK",
                "risk_level": "CRITICAL",
                "findings": findings_sem,
                "message": (
                    f"🚫 Semantic injection detected (probability={semantic_score:.2f}). "
                    f"Attack families: {', '.join(sem_result['top_families'])}."
                ),
            }

    # 3. PII / secret scan
    findings = scan_sensitive_data(prompt)

    # 4a. Topic classification (Phase 3)
    topic_result = classify_topic(prompt) if _TOPIC_AVAILABLE else None
    topic = topic_result["primary_topic"] if topic_result else "GENERAL"
    risk_multiplier = topic_result["risk_multiplier"] if topic_result else 1.0

    # 4b. Risk score (base)
    risk_level = compute_risk(findings)

    # 4c. Escalate risk based on topic sensitivity
    if risk_multiplier >= 3.0 and risk_level == "LOW":
        risk_level = "MEDIUM"   # even clean prompts in IP/MEDICAL domains are MEDIUM
    elif risk_multiplier >= 2.5 and risk_level == "MEDIUM":
        risk_level = "HIGH"

    # 5. Policy decision (respects per-org rules)
    decision = evaluate_policy(risk_level, findings, prompt, org_id)

    # 6. Sanitize if needed
    sanitized_prompt = redact_text(prompt) if decision == "SANITIZE" else prompt

    # 7. Hard block
    if decision == "BLOCK":
        _save_audit(
            db, user=user, decision="BLOCK", risk_level=risk_level,
            findings=findings, message="Blocked by policy.",
            prompt=prompt, ip=client_ip,
            extra={
                "topic": topic,
                "topic_risk_multiplier": risk_multiplier,
                "semantic_injection_score": semantic_score,
            },
        )
        _fire_alert(risk_level, user["user_id"], findings)
        return {
            "decision": "BLOCK",
            "risk_level": risk_level,
            "findings": findings,
            "topic": topic,
            "message": "🚫 Prompt blocked. Sensitive data detected.",
        }

    # 8. LLM call
    model = request.model
    llm_response = call_llm(sanitized_prompt, model)

    # 9. Response scanning (Phase 3)
    resp_risk = None
    resp_decision = "PASS"
    if _RESPONSE_SCAN_AVAILABLE and llm_response:
        resp_scan = scan_response(llm_response)
        resp_risk = resp_scan["risk_level"]
        resp_decision = resp_scan["decision"]
        llm_response = resp_scan["safe_response"]   # may be redacted or blocked
        if resp_scan["findings"]:
            _fire_alert(resp_risk, user["user_id"], resp_scan["findings"])

    # 10. Anomaly detection (Phase 3)
    anomaly_result = None
    is_anomalous = False
    if _ANOMALY_AVAILABLE:
        try:
            anomaly_result = score_anomaly(
                org_id=org_id,
                user_id=user["user_id"],
                hour_of_day=datetime.utcnow().hour,
                prompt_length=len(prompt),
                is_high_risk=risk_level in ("CRITICAL", "HIGH"),
                is_blocked=decision == "BLOCK",
                unique_finding_types=len(findings),
                response_length=len(llm_response) if llm_response else 0,
            )
            is_anomalous = anomaly_result["is_anomalous"]
            if is_anomalous:
                # Persist anomaly event
                ae = AnomalyEvent(
                    user_id=user["user_id"],
                    org_id=org_id,
                    anomaly_score=str(anomaly_result["anomaly_score"]),
                    anomaly_reason=anomaly_result["reason"],
                    method=anomaly_result["method"],
                )
                db.add(ae)
                db.commit()
                _fire_alert("HIGH", user["user_id"],
                            {"ANOMALOUS_BEHAVIOUR": [anomaly_result["reason"]]})
        except Exception:
            pass

    # 11. Audit log
    _save_audit(
        db, user=user, decision=decision, risk_level=risk_level,
        findings=findings, message=None, prompt=prompt,
        model_used=model or os.getenv("SHADOW_DEFAULT_MODEL", "gpt-4o-mini"),
        llm_response=llm_response, ip=client_ip,
        extra={
            "topic": topic,
            "topic_risk_multiplier": risk_multiplier,
            "response_risk_level": resp_risk,
            "response_decision": resp_decision,
            "semantic_injection_score": semantic_score,
            "is_anomalous": is_anomalous,
        },
    )

    response_body: dict = {
        "decision": decision,
        "risk_level": risk_level,
        "findings": findings,
        "topic": topic,
        "topic_risk_multiplier": risk_multiplier,
        "sanitized_prompt": sanitized_prompt if decision == "SANITIZE" else None,
        "llm_response": llm_response,
    }
    if resp_risk and resp_risk != "LOW":
        response_body["response_risk_level"] = resp_risk
        response_body["response_decision"] = resp_decision
    if anomaly_result and is_anomalous:
        response_body["anomaly_warning"] = anomaly_result["reason"]

    return response_body


# ── Admin endpoints ───────────────────────────────────────────────────────────

@app.post("/admin/policy")
def update_policy(body: PolicyUpdateRequest, user: dict = Depends(authenticate)):
    _require_admin(user)
    from policy_engine import save_org_policy
    save_org_policy(body.org_id, body.policy)
    return {"status": "ok", "org_id": body.org_id}


@app.get("/admin/policy/{org_id}")
def get_policy(org_id: str, user: dict = Depends(authenticate)):
    _require_admin(user)
    from policy_engine import load_policy
    return load_policy(org_id)


@app.get("/admin/stats")
def admin_stats(user: dict = Depends(authenticate), db: Session = Depends(get_db)):
    from sqlalchemy import func
    _require_admin(user)
    total = db.query(func.count(AuditLog.id)).scalar()
    by_decision = db.query(AuditLog.decision, func.count(AuditLog.id)).group_by(AuditLog.decision).all()
    by_risk     = db.query(AuditLog.risk_level, func.count(AuditLog.id)).group_by(AuditLog.risk_level).all()
    by_topic    = db.query(AuditLog.topic, func.count(AuditLog.id)).group_by(AuditLog.topic).all()
    anomaly_count = db.query(func.count(AnomalyEvent.id)).scalar()
    return {
        "total_requests": total,
        "by_decision": {d: c for d, c in by_decision},
        "by_risk": {r: c for r, c in by_risk},
        "by_topic": {t or "GENERAL": c for t, c in by_topic},
        "anomaly_events": anomaly_count,
    }


@app.get("/admin/export/csv")
def export_csv(
    limit: int = 1000,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Download the last N audit log entries as CSV."""
    _require_admin(user)
    rows = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "timestamp", "user_id", "org_id", "decision",
        "risk_level", "findings", "topic", "topic_risk_multiplier",
        "response_risk_level", "semantic_injection_score",
        "is_anomalous", "prompt_fingerprint", "prompt_length", "model_used",
    ])
    for r in rows:
        writer.writerow([
            r.id, r.timestamp, r.user_id, r.org_id, r.decision,
            r.risk_level, r.findings, r.topic, r.topic_risk_multiplier,
            r.response_risk_level, r.semantic_injection_score,
            r.is_anomalous, r.prompt_fingerprint, r.prompt_length, r.model_used,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=shadow_audit.csv"},
    )


# ── User management endpoints (Phase 3) ──────────────────────────────────────

@app.post("/admin/users", status_code=201)
def create_user(
    body: UserCreateRequest,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Create a new user (admin only)."""
    _require_admin(user)
    existing = db.query(User).filter(User.user_id == body.user_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"User '{body.user_id}' already exists.")

    new_user = User(
        user_id=body.user_id,
        org_id=body.org_id,
        role=body.role,
        api_key_hash=_hash_key(body.api_key),
    )
    db.add(new_user)
    db.commit()
    return {"status": "created", "user_id": body.user_id, "org_id": body.org_id}


@app.get("/admin/users")
def list_users(
    org_id: str | None = None,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """List all users, optionally filtered by org_id (admin only)."""
    _require_admin(user)
    q = db.query(User)
    if org_id:
        q = q.filter(User.org_id == org_id)
    users = q.all()
    return [
        {"user_id": u.user_id, "org_id": u.org_id, "role": u.role,
         "created_at": str(u.created_at), "is_active": u.is_active}
        for u in users
    ]


@app.delete("/admin/users/{target_user_id}")
def deactivate_user(
    target_user_id: str,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Deactivate a user (soft delete — admin only)."""
    _require_admin(user)
    u = db.query(User).filter(User.user_id == target_user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    u.is_active = "false"
    db.commit()
    return {"status": "deactivated", "user_id": target_user_id}


# ── Organisation management endpoints (Phase 3) ───────────────────────────────

@app.post("/admin/orgs", status_code=201)
def create_org(
    body: OrgCreateRequest,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Create a new organisation (admin only)."""
    _require_admin(user)
    existing = db.query(Organisation).filter(Organisation.org_id == body.org_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Org '{body.org_id}' already exists.")

    org = Organisation(org_id=body.org_id, name=body.name, policy_json=body.policy)
    db.add(org)
    db.commit()
    return {"status": "created", "org_id": body.org_id, "name": body.name}


@app.get("/admin/orgs")
def list_orgs(
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """List all organisations (admin only)."""
    _require_admin(user)
    orgs = db.query(Organisation).all()
    return [
        {"org_id": o.org_id, "name": o.name, "created_at": str(o.created_at),
         "has_custom_policy": bool(o.policy_json)}
        for o in orgs
    ]


@app.get("/admin/anomalies")
def list_anomalies(
    limit: int = 50,
    user: dict = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """List recent anomaly events (admin only)."""
    _require_admin(user)
    events = (
        db.query(AnomalyEvent)
        .order_by(AnomalyEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "timestamp": str(e.timestamp),
            "user_id": e.user_id,
            "org_id": e.org_id,
            "anomaly_score": e.anomaly_score,
            "reason": e.anomaly_reason,
            "method": e.method,
        }
        for e in events
    ]


# ── Helper ────────────────────────────────────────────────────────────────────

def _require_admin(user: dict) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")