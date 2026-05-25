"""
Shadow AI – Policy Engine

Each organisation can have its own policy stored in policies/<org_id>.json.
Falls back to the default policy if no org-specific file is found.
The gateway can also pass a policy dict loaded from the DB (Organisation.policy_json).
"""
import json
from pathlib import Path
from typing import Optional

# ── Default policy (applies when no org override exists) ──────────────────────
DEFAULT_POLICY: dict = {
    "org_id": "default",
    # Risk levels that trigger a hard BLOCK (no LLM call, no response)
    "block_on": ["CRITICAL"],
    # Risk levels that trigger sanitization before passing to LLM
    "sanitize_on": ["HIGH", "MEDIUM"],
    # Models this org is allowed to use (informational, enforced by LLM router)
    "allowed_models": ["gpt-4o-mini", "gpt-4o", "claude-3-haiku"],
    # Extra finding categories that always trigger a BLOCK
    "blocked_categories": [],
    # Maximum prompt length in characters (0 = no limit)
    "max_prompt_length": 10000,
    # Plain keywords that automatically trigger a BLOCK if found in the prompt
    "custom_blocked_keywords": [],
    # Whether code snippets are allowed to pass through
    "allow_code": True,
}

_POLICY_DIR = Path(__file__).parent / "policies"


def load_policy(org_id: str = "default", db_override: Optional[dict] = None) -> dict:
    """
    Load the effective policy for an org.

    Priority (highest to lowest):
      1. db_override  – policy_json column from the Organisation DB row
      2. policies/<org_id>.json  – file-based override
      3. DEFAULT_POLICY
    """
    if db_override:
        policy = DEFAULT_POLICY.copy()
        policy.update(db_override)
        return policy

    policy_file = _POLICY_DIR / f"{org_id}.json"
    if policy_file.exists():
        with open(policy_file, "r", encoding="utf-8") as f:
            file_policy = json.load(f)
        policy = DEFAULT_POLICY.copy()
        policy.update(file_policy)
        return policy

    return DEFAULT_POLICY.copy()


def evaluate_policy(
    risk_level: str,
    findings: dict,
    prompt: str,
    org_id: str = "default",
    db_override: Optional[dict] = None,
) -> str:
    """
    Given the scanner output and org policy, return: BLOCK | SANITIZE | ALLOW
    """
    policy = load_policy(org_id, db_override)

    # 1. Prompt too long
    max_len = policy.get("max_prompt_length", 0)
    if max_len and len(prompt) > max_len:
        return "BLOCK"

    # 2. Custom keyword blocklist
    prompt_lower = prompt.lower()
    for keyword in policy.get("custom_blocked_keywords", []):
        if keyword.lower() in prompt_lower:
            return "BLOCK"

    # 3. Blocked finding categories (e.g. org wants to always block PHONE)
    for category in policy.get("blocked_categories", []):
        if category in findings:
            return "BLOCK"

    # 4. Risk-level rules
    if risk_level in policy.get("block_on", ["CRITICAL"]):
        return "BLOCK"

    if risk_level in policy.get("sanitize_on", ["HIGH", "MEDIUM"]):
        return "SANITIZE"

    return "ALLOW"


def save_org_policy(org_id: str, policy: dict) -> None:
    """Persist a per-org policy override to disk (used by admin API)."""
    _POLICY_DIR.mkdir(parents=True, exist_ok=True)
    policy_file = _POLICY_DIR / f"{org_id}.json"
    with open(policy_file, "w", encoding="utf-8") as f:
        json.dump(policy, f, indent=2)
