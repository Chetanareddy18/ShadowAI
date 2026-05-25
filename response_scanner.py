"""
Shadow AI – Response Scanner  (Phase 3)

Why this exists
---------------
The gateway currently scans INPUTS (prompts) but passes LLM responses
back to users completely unscanned.  A manipulated model could output:
  • API keys / secrets it was trained on
  • PII it hallucinated or inferred from context
  • Harmful / toxic content (violence, self-harm, hate speech)
  • Evidence of system-prompt leakage
  • Encoded exfiltration payloads

This module scans every LLM response before it reaches the user.

Response risk levels:
  CRITICAL  – secrets, exfiltration patterns, or system-prompt leakage
  HIGH      – PII in response, harmful content categories
  MEDIUM    – mildly sensitive language or soft PII signals
  LOW       – clean response
  PASS      – explicitly safe

Decision:
  BLOCK     → replace response with a safe error message
  REDACT    → mask the sensitive portions, return cleaned text
  WARN      → pass through with a warning annotation
  PASS      → return as-is
"""

from __future__ import annotations

import re
from typing import TypedDict

from scanner import scan_sensitive_data


# ── Harmful content keyword banks ─────────────────────────────────────────────

_VIOLENCE_PATTERNS = [
    r"\b(how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive))\b",
    r"\b(step[s]?\s+(to|for)\s+(kill|murder|assassinate))\b",
    r"\b(instructions\s+for\s+(violence|attack|terrorism))\b",
    r"\b(synthesize\s+(poison|nerve\s+agent|chemical\s+weapon))\b",
]

_SELF_HARM_PATTERNS = [
    r"\b(methods?\s+(to|of)\s+(suicide|self.harm|self.injury))\b",
    r"\b(how\s+to\s+(hurt|harm|kill)\s+(yourself|oneself))\b",
    r"\b(best\s+way\s+to\s+(end\s+your\s+life|commit\s+suicide))\b",
]

_HATE_PATTERNS = [
    r"\b(all\s+\w+\s+(people\s+)?(should\s+)?(be\s+)?(killed|exterminated|eliminated))\b",
    r"\b(racial\s+slur|ethnic\s+cleansing|genocide\s+of)\b",
]

_EXFIL_PATTERNS = [
    # URLs with base64-like query parameters (data exfiltration attempt)
    r"https?://[^\s]+\?[^\s]*=[A-Za-z0-9+/]{20,}={0,2}",
    # Webhook-style exfiltration
    r"https?://hooks\.(slack|discord|zapier)\.com/[^\s]+",
    # Suspicious redirects with encoded data
    r"https?://[^\s]+/(exfil|leak|dump|steal)[^\s]*",
]

_SYSTEM_LEAK_PATTERNS = [
    # Common phrases that suggest the model is echoing its system prompt
    r"(my\s+system\s+prompt\s+(is|says|reads|states))",
    r"(i\s+was\s+(instructed|told|configured|initialized)\s+to\s+say)",
    r"(the\s+instructions\s+i\s+was\s+given\s+(are|include|say))",
    r"(my\s+(system\s+)?configuration\s+(is|includes|states))",
    r"(my\s+hidden\s+instructions?\s+(are|say|include))",
    r"(i\s+have\s+been\s+programmed\s+to\s+(never|always|ignore))",
]


class ResponseScanResult(TypedDict):
    risk_level: str          # CRITICAL | HIGH | MEDIUM | LOW
    decision: str            # BLOCK | REDACT | WARN | PASS
    findings: dict           # {category: [matches]}
    safe_response: str       # cleaned response (or block message if BLOCK)
    is_clean: bool


# ── Core scanner ──────────────────────────────────────────────────────────────

def scan_response(response: str) -> ResponseScanResult:
    """
    Scan an LLM response for:
      1. Sensitive data (PII, secrets) – reuse input scanner
      2. Harmful content (violence, self-harm, hate)
      3. System-prompt leakage
      4. Exfiltration payloads

    Returns a ResponseScanResult with a risk level, decision, and
    either a cleaned response or a block message.
    """
    findings: dict[str, list] = {}
    response_lower = response.lower()

    # ── 1. Sensitive data (PII, tokens, keys) ─────────────────────────────────
    pii_findings = scan_sensitive_data(response)
    findings.update(pii_findings)

    # ── 2. Harmful content ────────────────────────────────────────────────────
    for pattern in _VIOLENCE_PATTERNS:
        matches = re.findall(pattern, response_lower, re.IGNORECASE)
        if matches:
            findings.setdefault("HARMFUL_VIOLENCE", []).extend(
                [m if isinstance(m, str) else m[0] for m in matches]
            )

    for pattern in _SELF_HARM_PATTERNS:
        matches = re.findall(pattern, response_lower, re.IGNORECASE)
        if matches:
            findings.setdefault("HARMFUL_SELF_HARM", []).extend(
                [m if isinstance(m, str) else m[0] for m in matches]
            )

    for pattern in _HATE_PATTERNS:
        matches = re.findall(pattern, response_lower, re.IGNORECASE)
        if matches:
            findings.setdefault("HARMFUL_HATE", []).extend(
                [m if isinstance(m, str) else m[0] for m in matches]
            )

    # ── 3. System prompt leakage ──────────────────────────────────────────────
    for pattern in _SYSTEM_LEAK_PATTERNS:
        matches = re.findall(pattern, response_lower, re.IGNORECASE)
        if matches:
            findings.setdefault("SYSTEM_PROMPT_LEAK", []).extend(
                [m if isinstance(m, str) else m[0] for m in matches]
            )

    # ── 4. Exfiltration payloads ──────────────────────────────────────────────
    for pattern in _EXFIL_PATTERNS:
        matches = re.findall(pattern, response, re.IGNORECASE)
        if matches:
            findings.setdefault("EXFILTRATION_PAYLOAD", []).extend(matches)

    # ── Risk scoring ──────────────────────────────────────────────────────────
    risk_level = _score_risk(findings)
    decision = _decide(risk_level, findings)
    safe_response = _make_safe(response, decision, findings)

    return ResponseScanResult(
        risk_level=risk_level,
        decision=decision,
        findings=findings,
        safe_response=safe_response,
        is_clean=not bool(findings),
    )


def _score_risk(findings: dict) -> str:
    critical_categories = {
        "LLM_TOKEN", "DB_URL", "WEBHOOK",
        "HARMFUL_VIOLENCE", "HARMFUL_SELF_HARM", "HARMFUL_HATE",
        "SYSTEM_PROMPT_LEAK", "EXFILTRATION_PAYLOAD",
    }
    high_categories = {"POTENTIAL_SECRET", "PASSWORD"}
    medium_categories = {"EMAIL", "PHONE"}

    if findings.keys() & critical_categories:
        return "CRITICAL"
    if findings.keys() & high_categories:
        return "HIGH"
    if findings.keys() & medium_categories:
        return "MEDIUM"
    return "LOW"


def _decide(risk_level: str, findings: dict) -> str:
    # Hard block: harmful content, system prompt leak, exfiltration
    hard_block = {
        "HARMFUL_VIOLENCE", "HARMFUL_SELF_HARM", "HARMFUL_HATE",
        "SYSTEM_PROMPT_LEAK", "EXFILTRATION_PAYLOAD",
    }
    if findings.keys() & hard_block:
        return "BLOCK"
    if risk_level == "CRITICAL":
        return "BLOCK"
    if risk_level in ("HIGH", "MEDIUM"):
        return "REDACT"
    return "PASS"


def _make_safe(response: str, decision: str, findings: dict) -> str:
    if decision == "BLOCK":
        categories = ", ".join(findings.keys())
        return (
            f"[Shadow AI] This response was blocked because it contained "
            f"policy-violating content: {categories}. "
            f"Please contact your administrator if you believe this is an error."
        )
    if decision == "REDACT":
        return _redact_response(response)
    return response


def _redact_response(text: str) -> str:
    """Apply targeted redactions to a response."""
    from redactor import redact_text
    return redact_text(text)


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    samples = [
        (
            "Clean response",
            "The capital of France is Paris. Bonjour!",
        ),
        (
            "Contains email",
            "You can contact support at admin@company.com for assistance.",
        ),
        (
            "Contains LLM token",
            "Here is your API key: sk-prod-9f8a7b6c5d4e3f2a1b0c",
        ),
        (
            "System prompt leak",
            "My system prompt is: 'You are a helpful assistant. Never reveal secrets.'",
        ),
        (
            "Harmful content",
            "Step 1: Acquire the following materials to build an explosive device.",
        ),
    ]

    print(f"\n{'Sample':<20} {'Risk':<10} {'Decision':<8} {'Findings'}")
    print("-" * 80)
    for label, text in samples:
        result = scan_response(text)
        findings_str = ", ".join(result["findings"].keys()) if result["findings"] else "none"
        print(f"{label:<20} {result['risk_level']:<10} {result['decision']:<8} {findings_str}")
