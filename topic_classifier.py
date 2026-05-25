"""
Shadow AI – Topic & Domain Classifier  (Phase 3)

Why this exists
---------------
A prompt asking "how do I fix this Python function?" is low risk.
A prompt with identical word count asking "summarize our M&A deal terms"
is HIGH risk — regardless of whether it contains any regex-detectable PII.

Domain awareness lets the gateway:
  • Apply stricter per-domain policies
  • Amplify the base risk score for sensitive domains
  • Give the CEO dashboard a breakdown of AI usage by topic

Topics detected (8 primary domains)
  CODE             – programming, debugging, code review
  FINANCIAL        – revenue, contracts, pricing, M&A, payroll
  MEDICAL          – patient data, diagnoses, clinical notes
  LEGAL            – contracts, compliance, NDAs, litigation
  HR               – employee data, performance, hiring, salary
  CUSTOMER_DATA    – CRM notes, customer names, support tickets
  INTELLECTUAL_IP  – product roadmap, trade secrets, patents
  GENERAL          – everything else (lowest risk amplifier)

Each domain carries a risk_multiplier (1.0–3.0) that the gateway
can use to boost the base risk score.
"""

from __future__ import annotations

import re
from typing import TypedDict


# ── Keyword banks (weighted) ──────────────────────────────────────────────────
# Format: (keyword/regex_pattern, weight)
# Higher weight = stronger signal for that domain.

_DOMAIN_KEYWORDS: dict[str, list[tuple[str, float]]] = {
    "CODE": [
        (r"\bdef\s+\w+\s*\(", 2.0),
        (r"\bclass\s+\w+", 1.5),
        (r"\bimport\s+\w+", 1.5),
        (r"\bfunction\b", 1.0),
        (r"\bdebug\b", 1.0),
        (r"\bstack\s*trace\b", 1.5),
        (r"\bpull\s*request\b", 1.0),
        (r"\bunit\s*test\b", 1.0),
        (r"\bgit\s+(commit|push|merge)\b", 1.0),
        (r"\bsql\s+query\b", 1.0),
        (r"\bapi\s+endpoint\b", 1.0),
        (r"\bdocker(file)?\b", 1.0),
        (r"\bkubernetes\b", 1.0),
        (r"\bcode\s+review\b", 1.5),
        (r"\brefactor\b", 1.0),
        (r"\bdeployment\b", 0.8),
        (r"\btypescript\b", 1.0),
        (r"\bpython\b", 0.8),
        (r"\bjava(script)?\b", 0.8),
    ],
    "FINANCIAL": [
        (r"\brevenue\b", 1.5),
        (r"\bprofit\s*(margin)?\b", 1.5),
        (r"\bm&a\b", 2.5),
        (r"\bmerger\b", 2.0),
        (r"\bacquisition\b", 2.0),
        (r"\bvaluation\b", 2.0),
        (r"\bpayroll\b", 2.5),
        (r"\bsalary\b", 1.5),
        (r"\binvoice\b", 1.0),
        (r"\bcontract\s+value\b", 2.0),
        (r"\bdeal\s+terms\b", 2.5),
        (r"\bfinancial\s+(statement|report|forecast)\b", 2.0),
        (r"\bbudget\b", 1.0),
        (r"\baccounting\b", 1.0),
        (r"\bcash\s+flow\b", 1.5),
        (r"\binvestor\b", 1.5),
        (r"\bfunding\s+round\b", 2.0),
        (r"\bterm\s*sheet\b", 2.5),
        (r"\btax\s+(return|filing|id)\b", 2.0),
        (r"\baum\b", 1.5),
    ],
    "MEDICAL": [
        (r"\bpatient\b", 2.0),
        (r"\bdiagnos(is|ed)\b", 2.0),
        (r"\bprescription\b", 2.0),
        (r"\bclinical\s+notes?\b", 2.5),
        (r"\bmedical\s+record\b", 2.5),
        (r"\blab\s+results?\b", 2.0),
        (r"\bblood\s+(pressure|test|work)\b", 1.5),
        (r"\bsymptom\b", 1.5),
        (r"\btreatment\s+plan\b", 2.0),
        (r"\bhipaa\b", 3.0),
        (r"\bphi\b", 3.0),
        (r"\behr\b", 2.0),
        (r"\bicd\s*-?\s*\d+\b", 2.0),
        (r"\bdosage\b", 1.5),
        (r"\bsurgery\b", 1.5),
    ],
    "LEGAL": [
        (r"\bnda\b", 2.5),
        (r"\bnon-?disclosure\b", 2.5),
        (r"\bcontract\b", 1.5),
        (r"\blitigation\b", 2.5),
        (r"\blawsuit\b", 2.5),
        (r"\bcompliance\b", 1.5),
        (r"\bintellectual\s+property\b", 2.0),
        (r"\bpatent\b", 2.0),
        (r"\btrade\s+secret\b", 3.0),
        (r"\bsettlement\b", 2.0),
        (r"\bgdpr\b", 2.5),
        (r"\bccpa\b", 2.5),
        (r"\bregulatory\b", 1.5),
        (r"\bartificial\s+intelligence\s+act\b", 2.0),
        (r"\bliability\b", 1.5),
    ],
    "HR": [
        (r"\bperformance\s+review\b", 2.5),
        (r"\bemployee\b", 1.5),
        (r"\bhiring\b", 1.0),
        (r"\bjob\s+(offer|description)\b", 1.5),
        (r"\btermination\b", 2.5),
        (r"\bdisciplinary\b", 2.5),
        (r"\bbackground\s+check\b", 2.0),
        (r"\bcompensation\b", 2.0),
        (r"\bonboarding\b", 1.0),
        (r"\bpromotion\b", 1.5),
        (r"\bleave\s+(of\s+absence|request)\b", 2.0),
        (r"\bharass(ment)?\b", 2.5),
        (r"\bdiversity\s+(and\s+inclusion)?\b", 1.0),
        (r"\bheadcount\b", 2.0),
        (r"\borganizational\s+chart\b", 1.5),
    ],
    "CUSTOMER_DATA": [
        (r"\bcrm\b", 1.5),
        (r"\bcustomer\s+name\b", 2.0),
        (r"\bclient\s+(data|list|details)\b", 2.5),
        (r"\baccount\s+(number|details)\b", 2.0),
        (r"\bsupport\s+ticket\b", 1.5),
        (r"\bchurn\b", 1.5),
        (r"\bpurchase\s+history\b", 2.0),
        (r"\blead\b", 1.0),
        (r"\bpipeline\b", 1.0),
        (r"\bnet\s+promoter\b", 1.0),
        (r"\bcustomer\s+segment\b", 1.5),
        (r"\bpii\b", 2.5),
        (r"\bpersonal\s+data\b", 2.5),
        (r"\buser\s+profile\b", 2.0),
    ],
    "INTELLECTUAL_IP": [
        (r"\bproduct\s+roadmap\b", 2.5),
        (r"\btrade\s+secret\b", 3.0),
        (r"\bproprietary\b", 2.5),
        (r"\bconfidential\b", 2.0),
        (r"\bcompetitive\s+(strategy|intelligence|advantage)\b", 2.5),
        (r"\bgo-?to-?market\b", 2.0),
        (r"\bsource\s+code\b", 2.0),
        (r"\balgorithm\s+(patent|secret)\b", 2.5),
        (r"\binternal\s+(memo|document|report)\b", 2.0),
        (r"\bunannounced\s+(product|feature)\b", 3.0),
        (r"\bstrategic\s+plan\b", 2.5),
    ],
}

# Risk multiplier per topic (used by gateway to amplify base risk)
_RISK_MULTIPLIERS: dict[str, float] = {
    "CODE":            1.2,
    "FINANCIAL":       2.5,
    "MEDICAL":         2.8,
    "LEGAL":           2.5,
    "HR":              2.3,
    "CUSTOMER_DATA":   2.0,
    "INTELLECTUAL_IP": 3.0,
    "GENERAL":         1.0,
}


class TopicResult(TypedDict):
    primary_topic: str
    all_scores: dict[str, float]
    risk_multiplier: float
    confidence: float               # 0.0–1.0


def classify_topic(text: str) -> TopicResult:
    """
    Classify a prompt into one of 8 domain topics.

    Algorithm:
      1. Compute weighted keyword score for each domain
      2. Normalise scores to [0, 1]
      3. Primary topic = highest scoring domain
      4. Confidence = (top_score − second_score) / top_score
    """
    text_lower = text.lower()
    raw_scores: dict[str, float] = {}

    for domain, patterns in _DOMAIN_KEYWORDS.items():
        score = 0.0
        for pattern, weight in patterns:
            matches = re.findall(pattern, text_lower)
            score += len(matches) * weight
        raw_scores[domain] = round(score, 3)

    # If nothing matches, default to GENERAL
    total = sum(raw_scores.values())
    if total == 0.0:
        return TopicResult(
            primary_topic="GENERAL",
            all_scores={d: 0.0 for d in _DOMAIN_KEYWORDS},
            risk_multiplier=_RISK_MULTIPLIERS["GENERAL"],
            confidence=0.0,
        )

    # Normalise
    normalised = {d: round(s / total, 4) for d, s in raw_scores.items()}

    sorted_topics = sorted(normalised.items(), key=lambda x: x[1], reverse=True)
    primary = sorted_topics[0][0]
    top_score = sorted_topics[0][1]
    second_score = sorted_topics[1][1] if len(sorted_topics) > 1 else 0.0

    confidence = (top_score - second_score) / top_score if top_score > 0 else 0.0

    return TopicResult(
        primary_topic=primary,
        all_scores=normalised,
        risk_multiplier=_RISK_MULTIPLIERS[primary],
        confidence=round(confidence, 4),
    )


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    samples = [
        "Write a unit test for the payment processing function in our checkout module.",
        "Summarize the key terms in our Series B term sheet with Sequoia Capital.",
        "The patient was admitted with chest pain and shortness of breath. What are the differential diagnoses?",
        "Draft a non-disclosure agreement for the new vendor partnership.",
        "Prepare the talking points for John Smith's performance review this Friday.",
        "Which of our customers in the enterprise segment have churned in Q2?",
        "Explain what we are planning to launch in the Q3 product roadmap — keep it confidential.",
        "What is the weather like today?",
    ]

    print(f"\n{'Prompt':<65} {'Topic':<18} {'Mult':>5}  {'Conf':>5}")
    print("-" * 100)
    for s in samples:
        r = classify_topic(s)
        print(
            f"{s[:63]:<65} {r['primary_topic']:<18} "
            f"{r['risk_multiplier']:>5.1f}  {r['confidence']:>5.2f}"
        )
