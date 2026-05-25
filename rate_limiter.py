"""
Shadow AI – Rate Limiter  (Phase 3 · DB-backed sliding window)

Replaces the in-memory dict with a SQLite-persisted sliding window so that:
  • Rate limit state survives server restarts
  • Multiple workers share the same counters (via DB)
  • Admins can query / inspect rate-limit events in the audit DB

Falls back to a fast in-memory implementation if the DB is unavailable
(maintains backward compatibility).
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

# ── Config (overridable via env) ──────────────────────────────────────────────
MAX_REQUESTS = int(os.getenv("SHADOW_RATE_LIMIT_MAX", "50"))
WINDOW_SECONDS = int(os.getenv("SHADOW_RATE_LIMIT_WINDOW", "60"))

# ── In-memory fallback (used when DB write fails) ─────────────────────────────
_fallback: dict[str, list[float]] = {}


def check_rate_limit(user_id: str, db=None) -> None:
    """
    Enforce a sliding-window rate limit for user_id.

    Raises HTTP 429 if the user exceeds MAX_REQUESTS in WINDOW_SECONDS.
    Tries DB-backed counting first; falls back to in-memory if DB unavailable.
    """
    if db is not None:
        try:
            _db_check(user_id, db)
            return
        except HTTPException:
            raise
        except Exception:
            pass  # DB unavailable – fall through to in-memory

    _memory_check(user_id)


# ── DB-backed implementation ──────────────────────────────────────────────────

def _db_check(user_id: str, db) -> None:
    from db.models import RateLimitEntry
    from sqlalchemy import func

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=WINDOW_SECONDS)

    # Count requests in the current window
    count = (
        db.query(func.count(RateLimitEntry.id))
        .filter(
            RateLimitEntry.user_id == user_id,
            RateLimitEntry.timestamp >= cutoff,
        )
        .scalar()
    )

    if count >= MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {MAX_REQUESTS} requests per {WINDOW_SECONDS}s.",
        )

    # Record this request
    entry = RateLimitEntry(user_id=user_id, timestamp=now)
    db.add(entry)
    db.commit()

    # Prune old entries (keep DB tidy – runs ~5% of the time)
    if hash(user_id + str(int(now.timestamp()))) % 20 == 0:
        db.query(RateLimitEntry).filter(RateLimitEntry.timestamp < cutoff).delete()
        db.commit()


# ── In-memory fallback ────────────────────────────────────────────────────────

def _memory_check(user_id: str) -> None:
    now = time.time()
    _fallback.setdefault(user_id, [])
    _fallback[user_id] = [t for t in _fallback[user_id] if now - t < WINDOW_SECONDS]
    if len(_fallback[user_id]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {MAX_REQUESTS} requests per {WINDOW_SECONDS}s.",
        )
    _fallback[user_id].append(now)