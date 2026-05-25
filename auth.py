"""
Shadow AI – Authentication

Phase 1: API-key auth with org_id + role, backed by a seeded in-memory store.
          Each key maps to a UserInfo dict that the gateway uses for decisions.

Phase 2 (ready to drop in): replace _USER_STORE with DB queries + JWT tokens.
         The /token endpoint below already supports JWT issuance.
"""
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Header, HTTPException, status

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


# ── In-memory user store (Phase 1) ────────────────────────────────────────────
# api_key_hash -> UserInfo
# Hashing the key at startup means the plaintext is not kept in memory.
def _h(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


_SEED_USERS = [
    {"api_key": "shadow_emp_101",  "user_id": "emp_101",  "org_id": "org_default", "role": "employee"},
    {"api_key": "shadow_emp_102",  "user_id": "emp_102",  "org_id": "org_default", "role": "employee"},
    {"api_key": "shadow_admin",    "user_id": "admin",    "org_id": "org_default", "role": "admin"},
    # Add more orgs here or load from DB in Phase 2
]

_USER_STORE: dict[str, dict] = {
    _h(u["api_key"]): {
        "user_id": u["user_id"],
        "org_id":  u["org_id"],
        "role":    u["role"],
    }
    for u in _SEED_USERS
}


# ── FastAPI dependency ─────────────────────────────────────────────────────────

def authenticate(x_api_key: str = Header(...)) -> dict:
    """
    Validates the X-Api-Key header.
    Returns a dict with keys: user_id, org_id, role
    """
    key_hash = _h(x_api_key)
    user = _USER_STORE.get(key_hash)
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
