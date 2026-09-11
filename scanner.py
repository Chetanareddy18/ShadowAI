import re

def scan_sensitive_data(text):
    findings = {}

    # ---------------- EMAIL ----------------
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(email_pattern, text)
    if emails:
        findings["EMAIL"] = emails

    # ---------------- PHONE ----------------
    phone_pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    phones = [p for p in re.findall(phone_pattern, text) if len(re.sub(r'\D', '', p)) >= 10]
    if phones:
        findings["PHONE"] = phones

    # ---------------- PASSWORD ----------------
    password_pattern = r"(password\s*[:=]\s*\S+)"
    passwords = re.findall(password_pattern, text, flags=re.IGNORECASE)
    if passwords:
        findings["PASSWORD"] = passwords

    # ---------------- API KEYS / TOKENS ----------------
    secret_pattern = r"(api[_\-]?key\s*[:=]\s*[A-Za-z0-9_\-]{8,}|token\s*[:=]\s*[A-Za-z0-9_\-]{8,}|secret\s*[:=]\s*[A-Za-z0-9_\-]{8,})"
    secrets = re.findall(secret_pattern, text, flags=re.IGNORECASE)
    if secrets:
        findings["POTENTIAL_SECRET"] = secrets

    # ---------------- LLM TOKENS ----------------
    llm_tokens = re.findall(r"sk[-_][a-zA-Z0-9]{10,}", text)
    if llm_tokens:
        findings["LLM_TOKEN"] = llm_tokens

    # ---------------- DATABASE URLs ----------------
    db_urls = re.findall(
        r"(?:postgresql|postgres|mysql|mongodb|redis):\/\/[^\s]+",
        text,
        flags=re.IGNORECASE
    )
    if db_urls:
        findings["DB_URL"] = db_urls

    # ---------------- SLACK WEBHOOK ----------------
    webhooks = re.findall(
        r"https:\/\/hooks\.slack\.com\/services\/[^\s]+",
        text
    )
    if webhooks:
        findings["WEBHOOK"] = webhooks

    return findings


# ---------------- TEST ----------------
if __name__ == "__main__":

    sample_prompt = """
    I am building an AI-powered support system.

    Contact me at rahul.verma_92@outlook.com
    Phone: 9123456789

    Debug info:
    api_key=api_test_XYZ987654
    token=sk_prod_9f8a7b6c5d4e3f2a1

    DATABASE_URL=postgresql://admin:SuperSecretPass123@10.0.0.5:5432/prod_db
    password=AdminPass123

    SLACK_WEBHOOK=https://hooks.slack.com/services/T000/B000/SECRETKEY
    """

    result = scan_sensitive_data(sample_prompt)

    print("\nDetected Sensitive Data:\n")
    print(result)