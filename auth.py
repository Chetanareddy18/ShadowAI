from fastapi import Header, HTTPException

# Mock API key store (later: DB, IAM, SSO)
VALID_API_KEYS = {
    "shadow_emp_101": "emp_101",
    "shadow_emp_102": "emp_102",
    "shadow_admin": "admin"
}

def authenticate(x_api_key: str = Header(...)):
    if x_api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )
    return VALID_API_KEYS[x_api_key]
