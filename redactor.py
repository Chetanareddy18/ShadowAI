import re

def redact_text(text):
    redacted = text

    # ---------------- OLD MASKING ----------------

    # Mask emails
    redacted = re.sub(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "[REDACTED_EMAIL]",
        redacted
    )

    # Mask phone numbers
    redacted = re.sub(
        r"\b\d{10}\b",
        "[REDACTED_PHONE]",
        redacted
    )

    # Mask generic secrets
    redacted = re.sub(
        r"(?:key|token|secret|password|auth|api)[^a-zA-Z0-9]{0,3}[a-zA-Z0-9_]{8,}",
        "[REDACTED_SECRET]",
        redacted,
        flags=re.IGNORECASE
    )

    # ---------------- NEW MASKING ----------------

    # Mask OpenAI / LLM tokens
    redacted = re.sub(
        r"sk[-_][a-zA-Z0-9]{20,}",
        "[REDACTED_LLM_TOKEN]",
        redacted
    )

    # Mask database URLs
    redacted = re.sub(
        r"(?:postgres|mysql|mongodb|redis)ql?:\/\/[^\s]+",
        "[REDACTED_DB_URL]",
        redacted,
        flags=re.IGNORECASE
    )

    # Mask Slack / Webhook URLs
    redacted = re.sub(
        r"https:\/\/hooks\.slack\.com\/[^\s]+",
        "[REDACTED_WEBHOOK]",
        redacted
    )

    return redacted


# ---------------- TEST ----------------
if __name__ == "__main__":
    sample_text = """
    Contact me at rahul.verma_92@outlook.com
    api_key=api_test_XYZ987654
    Temporary token: sk_prod_9f8a7b6c5d4e3f2a1
    Call me on 9123456789 after 8 PM
    DATABASE_URL=postgresql://admin:SuperSecretPass123@10.0.0.5:5432/prod_db
    SLACK_WEBHOOK=https://hooks.slack.com/services/T000/B000/SECRETKEY
    """

    print("ORIGINAL TEXT:")
    print(sample_text)

    print("\nREDACTED TEXT:")
    print(redact_text(sample_text))
