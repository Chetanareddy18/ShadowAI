from fastapi import FastAPI
from pydantic import BaseModel
from scanner import scan_sensitive_data
from redactor import redact_text
from llm_client import call_llm
from datetime import datetime
import json

app = FastAPI(title="Shadow AI Gateway", version="1.0")

# ----------------- Request Model -----------------
class PromptRequest(BaseModel):
    user_id: str
    prompt: str

# ----------------- Risk Scoring -----------------
def compute_risk(findings):
    risk = "LOW"
    critical_keys = ["LLM_TOKEN", "DB_URL", "WEBHOOK"]

    if any(k in findings for k in critical_keys):
        risk = "CRITICAL"
    elif "POTENTIAL_SECRET" in findings:
        risk = "HIGH"
    elif "PHONE" in findings and "EMAIL" in findings:
        risk = "MEDIUM"
    elif "EMAIL" in findings or "PHONE" in findings:
        risk = "LOW"

    return risk

def decide_action(risk_level):
    if risk_level == "CRITICAL":
        return "BLOCK"
    elif risk_level in ["HIGH", "MEDIUM", "LOW"]:
        return "SANITIZE"
    return "ALLOW"

# ----------------- Audit Logging -----------------
def log_audit(entry, logfile="audit_log.json"):
    with open(logfile, "a") as f:
        f.write(json.dumps(entry))
        f.write("\n")

# ----------------- API Endpoint -----------------
@app.post("/process_prompt")
def process_prompt(request: PromptRequest):
    findings = scan_sensitive_data(request.prompt)
    risk_level = compute_risk(findings)
    decision = decide_action(risk_level)

    # Sanitize if required
    if decision in ["SANITIZE", "BLOCK"]:
        sanitized_prompt = redact_text(request.prompt)
    else:
        sanitized_prompt = request.prompt

    # ----------------- BLOCK CASE -----------------
    if decision == "BLOCK":
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": request.user_id,
            "original_prompt": request.prompt,
            "sanitized_prompt": sanitized_prompt,
            "findings": findings,
            "risk_level": risk_level,
            "decision": decision
        }
        log_audit(log_entry)

        return {
            "decision": decision,
            "risk_level": risk_level,
            "findings": findings,
            "message": "Prompt blocked due to critical security risk."
        }

    # ----------------- LLM FORWARDING -----------------
    llm_response = call_llm(sanitized_prompt)

    # ----------------- Audit Log -----------------
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "user_id": request.user_id,
        "original_prompt": request.prompt,
        "sanitized_prompt": sanitized_prompt,
        "findings": findings,
        "risk_level": risk_level,
        "decision": decision,
        "llm_response": llm_response
    }
    log_audit(log_entry)

    return {
        "decision": decision,
        "risk_level": risk_level,
        "findings": findings,
        "sanitized_prompt": sanitized_prompt,
        "llm_response": llm_response
    }
