"""Tests for scanner.py – PII and secret detection."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from scanner import scan_sensitive_data


class TestEmailDetection:
    def test_detects_plain_email(self):
        findings = scan_sensitive_data("Contact me at alice@example.com")
        assert "EMAIL" in findings

    def test_no_false_positive_no_email(self):
        findings = scan_sensitive_data("Hello, how are you?")
        assert "EMAIL" not in findings

    def test_detects_multiple_emails(self):
        findings = scan_sensitive_data("a@b.com and c@d.org both replied")
        assert "EMAIL" in findings


class TestPhoneDetection:
    def test_detects_us_phone(self):
        findings = scan_sensitive_data("Call me at +1-800-555-1234")
        assert "PHONE" in findings

    def test_detects_plain_number(self):
        findings = scan_sensitive_data("Phone: 9876543210")
        assert "PHONE" in findings


class TestSecretDetection:
    def test_detects_password_keyword(self):
        findings = scan_sensitive_data("password=SuperSecret123")
        assert "PASSWORD" in findings or "POTENTIAL_SECRET" in findings

    def test_detects_openai_token(self):
        findings = scan_sensitive_data("key: sk-abcdefghijklmnopqrstuvwxyz012345")
        assert "LLM_TOKEN" in findings or "POTENTIAL_SECRET" in findings

    def test_detects_db_url(self):
        findings = scan_sensitive_data("postgres://user:pass@localhost/mydb")
        assert "DB_URL" in findings

    def test_clean_prompt_no_findings(self):
        findings = scan_sensitive_data("What is the capital of France?")
        assert findings == {}
