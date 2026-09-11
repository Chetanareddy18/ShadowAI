"""
Shadow AI – Authentication

DB-backed API-key auth with in-memory seed user fallback.
Every request:
  1. Hash the supplied API key with SHA-256
  2. Look up the hash in the `users` table (DB)
  3. Reject if the user is deactivated (is_active != "true")
  4. Fallback to seed users list for development convenience

JWT tokens are also supported via /token (optional — gracefully degrades).
"""
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

# ── JWT (optional – gracefully degrades if python-jose not installed) ─────────
_JWT_AVAILABLE = False
try:
    from jose import JWTError, jwt as _jwt
    _JWT_AVAILABLE = True
except ImportError:
    pass

SECRET_KEY: str = os.getenv("SHADOW_JWT_SECRET", "change-this-in-production-use-a-long-random-secret")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = int(os.getenv("SHADOW_TOKEN_EXPIRE_HOURS", "24"))


# ── Key hashing utility ───────────────────────────────────────────────────────

def _h(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


# ── Seed users (fallback when DB has no matching hash) ───────────────────────
# These ship with the project for local dev / first-run convenience.
_SEED_USERS = [
    {"api_key": "shadow_emp_101",  "user_id": "emp_101",  "org_id": "org_default", "role": "employee"},
    {"api_key": "shadow_emp_102",  "user_id": "emp_102",  "org_id": "org_default", "role": "employee"},
    {"api_key": "shadow_admin",    "user_id": "admin",    "org_id": "org_default", "role": "admin"},
]

_SEED_STORE: dict[str, dict] = {
    _h(u["api_key"]): {
        "user_id": u["user_id"],
        "org_id":  u["org_id"],
        "role":    u["role"],
    }
    for u in _SEED_USERS
}


# ── Core lookup (used by FastAPI dependency + tests) ──────────────────────────

def _lookup_user(key_hash: str, db: Optional[Session] = None) -> Optional[dict]:
    """
    Resolve an API-key hash to a user dict.
    Priority: DB user table → seed store fallback.
    Returns None if not found or deactivated.
    """
    if db is not None:
        try:
            from db.models import User  # local import to avoid circular dependency
            db_user = db.query(User).filter(User.api_key_hash == key_hash).first()
            if db_user:
                if db_user.is_active != "true":
                    return None  # deactivated — explicitly deny
                return {
                    "user_id": db_user.user_id,
                    "org_id":  db_user.org_id,
                    "role":    db_user.role,
                }
        except Exception:
            pass  # DB unavailable — fall through to seed store

    return _SEED_STORE.get(key_hash)


# ── FastAPI dependency ─────────────────────────────────────────────────────────
# Import get_db here so FastAPI can resolve the nested dependency correctly.
from db.database import get_db  # noqa: E402 — intentional deferred import

def authenticate(
    x_api_key: str = Header(...),
    db: Session = Depends(get_db),
) -> dict:
    """
    Validates the X-Api-Key header against the DB (then seed fallback).
    Returns a dict with keys: user_id, org_id, role.
    Raises 401 for unknown / deactivated keys.
    """
    key_hash = _h(x_api_key)
    user = _lookup_user(key_hash, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
    return user


# ── JWT helpers (used by /token endpoint) ─────────────────────────────────────

def create_access_token(data: dict, expires_hours: int = TOKEN_EXPIRE_HOURS) -> Optional[str]:
    """Create a signed JWT. Returns None if python-jose is not installed."""
    if not _JWT_AVAILABLE:
        return None
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    payload.update({"exp": expire})
    return _jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT. Returns None on failure."""
    if not _JWT_AVAILABLE:
        return None
    try:
        return _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
