"""Tests for anomaly_detector.py – IsolationForest user behaviour anomaly detection."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

try:
    from anomaly_detector import score_request, get_org_detector
    AVAILABLE = True
except ImportError:
    AVAILABLE = False

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="anomaly_detector not available")


def _make_request(**overrides):
    defaults = dict(
        org_id="test_org",
        user_id="test_user",
        hour_of_day=10,
        prompt_length=100,
        is_high_risk=False,
        is_blocked=False,
        unique_finding_types=0,
        response_length=200,
    )
    defaults.update(overrides)
    return score_request(**defaults)


class TestAnomalyDetector:
    def test_returns_expected_keys(self):
        result = _make_request()
        assert "is_anomalous" in result
        assert "anomaly_score" in result
        assert "anomaly_percentile" in result
        assert "reason" in result
        assert "method" in result

    def test_is_anomalous_is_bool(self):
        result = _make_request()
        assert isinstance(result["is_anomalous"], bool)

    def test_anomaly_score_is_numeric(self):
        result = _make_request()
        assert isinstance(result["anomaly_score"], (int, float))

    def test_insufficient_data_method(self):
        # Fresh user/org combo should return insufficient_data
        result = _make_request(org_id="brand_new_org_xyz", user_id="brand_new_user_xyz")
        assert result["method"] in ("insufficient_data", "statistical", "isolation_forest")

    def test_single_user_multiple_requests(self):
        """Submit 25 requests to trigger model training."""
        for i in range(25):
            score_request(
                org_id="train_org",
                user_id="train_user",
                hour_of_day=9,
                prompt_length=80 + i,
                is_high_risk=False,
                is_blocked=False,
                unique_finding_types=0,
                response_length=150,
            )
        # After 25+ samples, method should upgrade from insufficient_data
        result = score_request(
            org_id="train_org",
            user_id="train_user",
            hour_of_day=9,
            prompt_length=85,
            is_high_risk=False,
            is_blocked=False,
            unique_finding_types=0,
            response_length=150,
        )
        assert result["method"] in ("statistical", "isolation_forest")

    def test_org_detector_singleton(self):
        d1 = get_org_detector("singleton_test_org")
        d2 = get_org_detector("singleton_test_org")
        assert d1 is d2

    def test_different_orgs_separate_detectors(self):
        d1 = get_org_detector("org_alpha")
        d2 = get_org_detector("org_beta")
        assert d1 is not d2
