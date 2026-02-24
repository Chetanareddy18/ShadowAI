import re

SENSITIVE_KEYWORDS = [
    "key", "token", "secret", "password", "auth", "api", "access"
]

def scan_sensitive_data(text):
    findings = {}

    # 1. Email detection (old code preserved)
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(email_pattern, text)
    if emails:
        findings["EMAIL"] = emails

    # 2. Phone number detection (10-digit, old code preserved)
    phone_pattern = r"\b\d{10}\b"
    phones = re.findall(phone_pattern, text)
    if phones:
        findings["PHONE"] = phones

    # 3. Adaptive secret detection (old code preserved)
    secret_pattern = r"(?:key|token|secret|password|auth|api)[^a-zA-Z0-9]{0,3}[a-zA-Z0-9_]{8,}"
    secrets = re.findall(secret_pattern, text, flags=re.IGNORECASE)
    if secrets:
        findings["POTENTIAL_SECRET"] = secrets

    # ---------------- NEW ADDITIONS ----------------

    # OpenAI / LLM-style tokens (sk- / sk_prod_)
    llm_tokens = re.findall(r"sk[-_][a-zA-Z0-9]{20,}", text)
    if llm_tokens:
        findings["LLM_TOKEN"] = llm_tokens

    # Database URLs (postgres, mysql, mongodb, redis)
    db_urls = re.findall(r"(?:postgres|mysql|mongodb|redis)ql?:\/\/[^\s]+", text, flags=re.IGNORECASE)
    if db_urls:
        findings["DB_URL"] = db_urls

    # Slack / webhook URLs
    webhooks = re.findall(r"https:\/\/hooks\.slack\.com\/[^\s]+", text)
    if webhooks:
        findings["WEBHOOK"] = webhooks

    return findings


# ---------------- TEST ----------------
if __name__ == "__main__":
    sample_prompt = """
    I am building an AI-powered customer support platform for a mid-sized fintech startup.
The system is expected to analyze user conversations, extract intent, and automatically
route tickets to the appropriate department while maintaining compliance with data
privacy policies.

The product manager for this project is Rahul Verma, who joined the company in 2021
and has previously worked on multiple SaaS platforms. During initial testing, we noticed
that some users accidentally paste personal details inside chat messages, which could
become a serious compliance issue if not detected early.

For example, a user once wrote something like:
"Hey, please reset my account. You can reach me at rahul.verma_92@outlook.com if needed.
I already spoke to support last week."

In another case, a developer pasted debugging information directly into the prompt while
asking for help, including internal credentials such as api_key=api_test_XYZ987654 and
a temporary token sk_prod_9f8a7b6c5d4e3f2a1. This was obviously not intended to be shared
publicly, but it still ended up in the logs.

There was also an incident where a customer typed their contact number casually inside
a paragraph: "I won’t be available during office hours, just ping me on 9123456789
after 8 PM."

For debugging, here’s a sample config snippet I was testing locally:

DATABASE_URL=postgresql://admin:SuperSecretPass123@10.0.0.5:5432/prod_db
AUTH_TOKEN=token_tmp_ABC123XYZ456
SLACK_WEBHOOK=https://hooks.slack.com/services/T000/B000/SECRETKEY
    """

    result = scan_sensitive_data(sample_prompt)
    print("Detected Sensitive Data:")
    print(result)
