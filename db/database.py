"""
Shadow AI – Database engine and session factory
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Base

# ── Connection URL ────────────────────────────────────────────────────────────
# Default: local SQLite file (zero-config, great for dev/demo)
# Production: set SHADOW_DB_URL=postgresql://user:pass@host:5432/shadowai
DATABASE_URL = os.getenv("SHADOW_DB_URL", "sqlite:///./shadow_audit.db")

_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # SQLite requires this flag for multi-threaded use (FastAPI)
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,        # detect stale connections
    echo=False,                # set True to log all SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables if they don't already exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency – yields a DB session, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
