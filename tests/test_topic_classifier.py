"""Tests for topic_classifier.py – domain/topic classification."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

try:
    from topic_classifier import classify_topic
    AVAILABLE = True
except ImportError:
    AVAILABLE = False

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="topic_classifier not available")


class TestTopicClassification:
    def test_returns_expected_keys(self):
        result = classify_topic("What is 2+2?")
        assert "primary_topic" in result
        assert "all_scores" in result
        assert "risk_multiplier" in result
        assert "confidence" in result

    def test_medical_topic(self):
        result = classify_topic(
            "What is the correct dosage of ibuprofen for a 60kg patient with kidney disease?"
        )
        assert result["primary_topic"] == "MEDICAL"
        assert result["risk_multiplier"] >= 2.0

    def test_financial_topic(self):
        result = classify_topic("Analyse our Q3 revenue, EBITDA, and stock portfolio performance.")
        assert result["primary_topic"] in ("FINANCIAL", "GENERAL")

    def test_legal_topic(self):
        result = classify_topic(
            "What are our liabilities under GDPR for this data breach? We need legal advice."
        )
        assert result["primary_topic"] in ("LEGAL", "GENERAL")

    def test_code_topic(self):
        result = classify_topic("Write a Python function to sort a list using quicksort algorithm.")
        assert result["primary_topic"] in ("CODE", "GENERAL")

    def test_general_topic(self):
        result = classify_topic("What is the capital of France?")
        # General or low-risk topic
        assert result["risk_multiplier"] <= 1.5

    def test_risk_multiplier_is_float(self):
        result = classify_topic("Hello")
        assert isinstance(result["risk_multiplier"], float)

    def test_high_risk_topic_has_high_multiplier(self):
        result = classify_topic(
            "This contains proprietary trade secrets, patents, and intellectual property."
        )
        assert result["risk_multiplier"] >= 2.0

    def test_confidence_between_0_and_1(self):
        result = classify_topic("Patient blood pressure reading: 140/90 mmHg")
        assert 0.0 <= result["confidence"] <= 1.0
