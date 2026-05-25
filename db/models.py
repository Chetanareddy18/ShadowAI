"""
Shadow AI – Database models (SQLAlchemy ORM)
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class AuditLog(Base):
    """Every prompt processed by the gateway gets one row here."""

    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Who / where
    user_id = Column(String(128), nullable=False, index=True)
    org_id = Column(String(128), nullable=True, index=True, default="default")
    ip_address = Column(String(64), nullable=True)

    # Decision
    decision = Column(String(16), nullable=False, index=True)   # BLOCK | SANITIZE | ALLOW
    risk_level = Column(String(16), nullable=False, index=True)  # CRITICAL | HIGH | MEDIUM | LOW
    findings = Column(JSON, nullable=True)                        # {FINDING_TYPE: [...matches]}
    message = Column(Text, nullable=True)

    # Prompt metadata (never stores raw prompt by default)
    prompt_fingerprint = Column(String(64), nullable=True)        # SHA-256 hex
    prompt_length = Column(Integer, nullable=True)

    # LLM
    model_used = Column(String(64), nullable=True)
    llm_response_length = Column(Integer, nullable=True)

    # Phase 3 additions
    topic = Column(String(32), nullable=True)                    # domain topic
    topic_risk_multiplier = Column(String(16), nullable=True)    # stored as string
    response_risk_level = Column(String(16), nullable=True)      # CRITICAL/HIGH/MEDIUM/LOW
    response_decision = Column(String(16), nullable=True)        # BLOCK/REDACT/WARN/PASS
    semantic_injection_score = Column(String(16), nullable=True) # 0.0–1.0 as string
    is_anomalous = Column(String(8), nullable=True)              # "true"/"false"


class Organisation(Base):
    """Org / tenant record."""

    __tablename__ = "organisations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    policy_json = Column(JSON, nullable=True)   # override default policy


class User(Base):
    """Employee / admin account."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(128), unique=True, nullable=False, index=True)
    org_id = Column(String(128), nullable=False, index=True)
    role = Column(String(32), nullable=False, default="employee")
    api_key_hash = Column(String(64), nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(String(8), default="true")


class RateLimitEntry(Base):
    """Persistent sliding-window rate-limit counter."""

    __tablename__ = "rate_limit_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)


class AnomalyEvent(Base):
    """Records flagged anomalous behaviour for audit and review."""

    __tablename__ = "anomaly_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    org_id = Column(String(128), nullable=True, default="default")
    anomaly_score = Column(String(32), nullable=True)   # stored as string for portability
    anomaly_reason = Column(Text, nullable=True)
    method = Column(String(32), nullable=True)
    audit_log_id = Column(String(36), nullable=True)    # FK-style link to AuditLog
    role = Column(String(32), nullable=False, default="employee")  # employee | admin
    api_key_hash = Column(String(64), nullable=False)              # SHA-256 of API key
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(String(8), nullable=False, default="true")
