"""
Shadow AI – User Behaviour Anomaly Detector  (Phase 3 · ML Component)

Why this exists
---------------
Even after all prompt-level checks, a compromised or rogue employee
can conduct a slow-burn data exfiltration by:
  • Sending many small, individually "clean" prompts
  • Probing system limits repeatedly
  • Suddenly shifting behaviour (time-of-day, prompt length, topic)

This module trains an Isolation Forest on per-user behavioural features
extracted from the audit log.  It produces an anomaly score for every
new request and flags deviations from a user's baseline.

Feature vector per observation (7 features)
  0  hour_of_day          (0–23)
  1  prompt_length        (characters)
  2  is_high_risk         (1 if risk ≥ HIGH, else 0)
  3  is_blocked           (1 if BLOCK decision, else 0)
  4  requests_last_10min  (rolling count)
  5  unique_finding_types (count of distinct finding categories)
  6  response_length      (0 if not available)

Training strategy
  • Minimum 20 observations needed before model is used.
  • Model is retrained lazily every RETRAIN_EVERY new observations.
  • Falls back to statistical z-score when sklearn is unavailable.
  • Each organisation has its own model instance.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import TypedDict

_SKLEARN_AVAILABLE = False
try:
    from sklearn.ensemble import IsolationForest
    import numpy as np
    _SKLEARN_AVAILABLE = True
except ImportError:
    pass

# ── Config ────────────────────────────────────────────────────────────────────
MIN_OBSERVATIONS = 20       # need this many before the model activates
RETRAIN_EVERY = 50          # retrain after this many new samples
ANOMALY_THRESHOLD = -0.15   # IsolationForest scores below this are anomalous
ROLLING_WINDOW_MINUTES = 10  # for requests_last_10min feature


class AnomalyResult(TypedDict):
    is_anomalous: bool
    anomaly_score: float        # raw IsolationForest score (lower = more anomalous)
    anomaly_percentile: float   # 0–1, easier to read (1 = worst)
    reason: str                 # human-readable explanation
    method: str                 # "isolation_forest" | "zscore" | "insufficient_data"


# ── Per-user state ────────────────────────────────────────────────────────────

class _UserState:
    """Stores raw observations and the trained model for one user."""

    def __init__(self) -> None:
        self.observations: list[list[float]] = []
        self.timestamps: list[datetime] = []
        self.model: "IsolationForest | None" = None
        self.since_last_train: int = 0
        self.scores: list[float] = []  # for percentile calc


class _OrgAnomalyDetector:
    """Anomaly detector for one organisation (aggregates all its users)."""

    def __init__(self, org_id: str) -> None:
        self.org_id = org_id
        self._users: dict[str, _UserState] = defaultdict(_UserState)

    def record_and_score(
        self,
        user_id: str,
        hour_of_day: int,
        prompt_length: int,
        is_high_risk: bool,
        is_blocked: bool,
        unique_finding_types: int,
        response_length: int = 0,
    ) -> AnomalyResult:
        state = self._users[user_id]
        now = datetime.now(timezone.utc)

        # Rolling count feature
        cutoff = now - timedelta(minutes=ROLLING_WINDOW_MINUTES)
        recent = sum(1 for t in state.timestamps if t >= cutoff)

        feature_vec: list[float] = [
            float(hour_of_day),
            float(prompt_length),
            1.0 if is_high_risk else 0.0,
            1.0 if is_blocked else 0.0,
            float(recent),
            float(unique_finding_types),
            float(response_length),
        ]

        state.observations.append(feature_vec)
        state.timestamps.append(now)
        state.since_last_train += 1

        n = len(state.observations)

        if n < MIN_OBSERVATIONS:
            return AnomalyResult(
                is_anomalous=False,
                anomaly_score=0.0,
                anomaly_percentile=0.0,
                reason=f"Insufficient data ({n}/{MIN_OBSERVATIONS} observations).",
                method="insufficient_data",
            )

        if _SKLEARN_AVAILABLE:
            return self._isolation_forest_score(state, feature_vec, user_id)
        return self._zscore_score(state, feature_vec)

    def _isolation_forest_score(
        self, state: _UserState, feature_vec: list[float], user_id: str
    ) -> AnomalyResult:
        # Retrain if needed
        if state.model is None or state.since_last_train >= RETRAIN_EVERY:
            X = np.array(state.observations)
            state.model = IsolationForest(
                n_estimators=100,
                contamination=0.05,
                random_state=42,
                n_jobs=-1,
            )
            state.model.fit(X)
            state.scores = list(state.model.score_samples(X))
            state.since_last_train = 0

        vec = np.array(feature_vec).reshape(1, -1)
        raw_score = float(state.model.score_samples(vec)[0])
        state.scores.append(raw_score)

        # Percentile (what fraction of historical scores are ABOVE this score)
        # A score very far below the median = high anomaly = high percentile
        all_scores = sorted(state.scores)
        rank = sum(1 for s in all_scores if s >= raw_score)
        percentile = rank / len(all_scores)

        is_anomalous = raw_score < ANOMALY_THRESHOLD
        reason = _build_reason(feature_vec, is_anomalous, raw_score)

        return AnomalyResult(
            is_anomalous=is_anomalous,
            anomaly_score=round(raw_score, 4),
            anomaly_percentile=round(percentile, 4),
            reason=reason,
            method="isolation_forest",
        )

    def _zscore_score(
        self, state: _UserState, feature_vec: list[float]
    ) -> AnomalyResult:
        """Statistical fallback when sklearn is unavailable."""
        arr = state.observations
        n = len(arr)

        # Compute per-feature mean and std
        means = [sum(row[i] for row in arr) / n for i in range(len(feature_vec))]
        stds = [
            math.sqrt(sum((row[i] - means[i]) ** 2 for row in arr) / max(n - 1, 1))
            for i in range(len(feature_vec))
        ]

        z_scores = [
            abs((feature_vec[i] - means[i]) / stds[i]) if stds[i] > 0 else 0.0
            for i in range(len(feature_vec))
        ]
        max_z = max(z_scores)
        is_anomalous = max_z > 3.0

        return AnomalyResult(
            is_anomalous=is_anomalous,
            anomaly_score=round(-max_z, 4),  # negative to match IF convention
            anomaly_percentile=round(min(max_z / 5.0, 1.0), 4),
            reason=f"Max z-score: {max_z:.2f} (threshold: 3.0).",
            method="zscore",
        )


def _build_reason(feature_vec: list[float], is_anomalous: bool, score: float) -> str:
    if not is_anomalous:
        return "Behaviour within normal baseline."

    parts: list[str] = []
    hour, length, high_risk, blocked, rolling, finding_types, resp_len = feature_vec

    if rolling > 15:
        parts.append(f"unusually high request rate ({int(rolling)} in 10 min)")
    if length > 5000:
        parts.append(f"very long prompt ({int(length)} chars)")
    if blocked:
        parts.append("request was blocked")
    if finding_types > 2:
        parts.append(f"{int(finding_types)} distinct sensitive data types detected")
    if not (6 <= hour <= 22):
        parts.append(f"off-hours activity ({int(hour):02d}:xx)")

    if parts:
        return "Anomaly detected: " + "; ".join(parts) + f" (score={score:.3f})."
    return f"Statistical anomaly detected (score={score:.3f})."


# ── Module-level registry ─────────────────────────────────────────────────────
_org_detectors: dict[str, _OrgAnomalyDetector] = {}


def get_org_detector(org_id: str = "default") -> _OrgAnomalyDetector:
    if org_id not in _org_detectors:
        _org_detectors[org_id] = _OrgAnomalyDetector(org_id)
    return _org_detectors[org_id]


def score_request(
    *,
    org_id: str = "default",
    user_id: str,
    hour_of_day: int,
    prompt_length: int,
    is_high_risk: bool,
    is_blocked: bool,
    unique_finding_types: int,
    response_length: int = 0,
) -> AnomalyResult:
    """Convenience function — main entry point for the gateway."""
    detector = get_org_detector(org_id)
    return detector.record_and_score(
        user_id=user_id,
        hour_of_day=hour_of_day,
        prompt_length=prompt_length,
        is_high_risk=is_high_risk,
        is_blocked=is_blocked,
        unique_finding_types=unique_finding_types,
        response_length=response_length,
    )


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import random
    random.seed(42)

    print("Simulating 30 normal requests then 5 anomalous ones...\n")

    # Feed 30 normal observations
    for i in range(30):
        r = score_request(
            user_id="emp_101",
            org_id="org_demo",
            hour_of_day=random.randint(9, 18),
            prompt_length=random.randint(50, 500),
            is_high_risk=False,
            is_blocked=False,
            unique_finding_types=0,
        )

    # Feed 5 anomalous observations
    anomalous = [
        dict(hour_of_day=3, prompt_length=8000, is_high_risk=True,
             is_blocked=True, unique_finding_types=4),
        dict(hour_of_day=2, prompt_length=7500, is_high_risk=True,
             is_blocked=True, unique_finding_types=3),
        dict(hour_of_day=4, prompt_length=9000, is_high_risk=True,
             is_blocked=True, unique_finding_types=5),
    ]
    for obs in anomalous:
        r = score_request(user_id="emp_101", org_id="org_demo", **obs)
        flag = "⚠️  ANOMALY" if r["is_anomalous"] else "✅  normal "
        print(f"{flag}  score={r['anomaly_score']:>7.3f}  {r['reason']}")
