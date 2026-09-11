import streamlit as st
import requests
import os

# Gateway API
API_URL = "http://127.0.0.1:8000/process_prompt"

# API KEY for gateway
API_KEY = os.getenv("SHADOW_API_KEY", "shadow_emp_101")

st.set_page_config(
    page_title="Shadow AI Secure Chat",
    page_icon="🤖",
    layout="centered"
)

st.title("🤖 Shadow AI Secure Chat")
st.write("All prompts pass through the Shadow AI Security Gateway")

# Chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display previous messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

# Chat input
prompt = st.chat_input("Ask something...")

if prompt:

    # Show user message
    with st.chat_message("user"):
        st.write(prompt)

    st.session_state.messages.append({
        "role": "user",
        "content": prompt
    })

    try:

        # Send prompt to gateway
        response = requests.post(
            API_URL,
            headers={
                "x-api-key": API_KEY
            },
            json={
                "prompt": prompt
            },
            timeout=20
        )
        response.raise_for_status()
        result = response.json()

    except Exception as e:

        reply = f"❌ Gateway connection error: {e}"

        with st.chat_message("assistant"):
            st.write(reply)

        st.session_state.messages.append({
            "role": "assistant",
            "content": reply
        })

        st.stop()

    # Handle response based on the gateway decision contract.
    decision = result.get("decision")

    if decision == "BLOCK":

        reply = f"""
🚫 **Prompt Rejected**

**Risk Level:** {result.get('risk_level')}

Sensitive information detected.
The Shadow AI Gateway blocked this request.
"""

    else:

        llm_reply = result.get(
            "llm_response",
            "Thanks for your query. Please check system configuration and retry."
        )

        reply = f"""
✅ **Prompt Accepted**

**Risk Level:** {result.get('risk_level')}

💬 **LLM Response**

{llm_reply}
"""

    # Show assistant message
    with st.chat_message("assistant"):
        st.write(reply)

    st.session_state.messages.append({
        "role": "assistant",
        "content": reply
    })
