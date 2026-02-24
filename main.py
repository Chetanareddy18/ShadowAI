from scanner import scan_sensitive_data
from redactor import redact_text
import json
from datetime import datetime

# ----------------- Risk Scoring -----------------
def compute_risk(findings):
    risk = "LOW"
    
    # CRITICAL items
    critical_keys = ["LLM_TOKEN", "DB_URL", "WEBHOOK"]
    if any(k in findings for k in critical_keys):
        risk = "CRITICAL"
    # HIGH items
    elif "POTENTIAL_SECRET" in findings:
        risk = "HIGH"
    # MEDIUM items
    elif "PHONE" in findings and "EMAIL" in findings:
        risk = "MEDIUM"
    # LOW items
    elif "EMAIL" in findings or "PHONE" in findings:
        risk = "LOW"
    
    return risk

# ----------------- Decision Engine -----------------
def decide_action(risk_level):
    if risk_level in ["CRITICAL"]:
        return "BLOCK"
    elif risk_level in ["HIGH", "MEDIUM", "LOW"]:
        return "SANITIZE"
    else:
        return "ALLOW"

# ----------------- Audit Logging -----------------
def log_audit(prompt, sanitized_prompt, findings, risk_level, decision, logfile="audit_log.json"):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "original_prompt": prompt,
        "sanitized_prompt": sanitized_prompt,
        "findings": findings,
        "risk_level": risk_level,
        "decision": decision
    }
    # Append to log file
    with open(logfile, "a") as f:
        f.write(json.dumps(entry, indent=2))
        f.write("\n")

# ----------------- Main Processor -----------------
def process_prompt(prompt):
    findings = scan_sensitive_data(prompt)
    risk_level = compute_risk(findings)
    decision = decide_action(risk_level)

    if decision in ["SANITIZE", "BLOCK"]:
        sanitized_prompt = redact_text(prompt)
    else:
        sanitized_prompt = prompt

    log_audit(prompt, sanitized_prompt, findings, risk_level, decision)
    return decision, risk_level, findings, sanitized_prompt

# ----------------- TEST -----------------
if __name__ == "__main__":
    user_prompt = """
    Hey, can you check this? 
    My API key is api_test_XYZ987654
    Temporary token: sk_prod_9f8a7b6c5d4e3f2a1
    Contact: rahul.verma_92@outlook.com, Phone: 9123456789
    DATABASE_URL=postgresql://admin:SuperSecretPass123@10.0.0.5:5432/prod_db
    SLACK_WEBHOOK=https://hooks.slack.com/services/T000/B000/SECRETKEY
    """

    decision, risk_level, findings, sanitized_prompt = process_prompt(user_prompt)

    print("DECISION:", decision)
    print("RISK LEVEL:", risk_level)
    print("DETECTED:", findings)
    print("\nFINAL PROMPT:")
    print(sanitized_prompt)
