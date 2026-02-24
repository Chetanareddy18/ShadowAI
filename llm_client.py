def call_llm(prompt: str) -> str:
    """
    Mock LLM response.
    Replace this later with OpenAI / Claude / Gemini.
    """

    # Simple intelligence simulation
    if "error" in prompt.lower():
        return (
            "It looks like you're encountering an error. "
            "Check authentication, credentials, and service availability. "
            "Consider reviewing logs and retrying with safe configurations."
        )

    if "api" in prompt.lower():
        return (
            "When working with APIs, ensure secrets are stored securely "
            "and never exposed in logs or prompts."
        )

    return (
        "Thanks for your query. The issue seems related to system configuration. "
        "Please verify environment variables and retry."
    )
