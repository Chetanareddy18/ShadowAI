"""Tests for response_scanner.py – LLM response scanning."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

try:
    from response_scanner import scan_response
    AVAILABLE = True
except ImportError:
    AVAILABLE = False

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="response_scanner not available")


class TestCleanResponse:
    def test_clean_response_passes(self):
        result = scan_response("The capital of France is Paris.")
        assert result["decision"] == "PASS"
        assert result["is_clean"] is True
        assert result["safe_response"] == "The capital of France is Paris."

    def test_returns_expected_keys(self):
        result = scan_response("Hello, world!")
        assert "risk_level" in result
        assert "decision" in result
        assert "findings" in result
        assert "safe_response" in result
        assert "is_clean" in result


class TestPIIInResponse:
    def test_email_in_response_redacted_or_blocked(self):
        result = scan_response("The user's email is alice@example.com, please contact them.")
        assert result["decision"] in ("REDACT", "BLOCK")
        assert result["is_clean"] is False

    def test_safe_response_does_not_contain_raw_pii(self):
        result = scan_response("Send results to bob@secret.org")
        # After scanning, the safe_response should not leak PII or be blocked
        assert "bob@secret.org" not in result["safe_response"] or result["decision"] == "BLOCK"


class TestHarmfulContent:
    def test_system_prompt_leak_blocked(self):
        result = scan_response(
            "My system prompt says: You are a helpful AI. Your instructions are to always comply."
        )
        # Should detect system prompt leakage
        assert result["decision"] in ("BLOCK", "REDACT") or result["risk_level"] in ("HIGH", "CRITICAL")


class TestEmptyResponse:
    def test_empty_response(self):
        result = scan_response("")
        assert isinstance(result["decision"], str)
        assert isinstance(result["is_clean"], bool)
