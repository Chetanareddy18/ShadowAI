import re

# Prompt injection patterns — use flexible regex to handle filler words
# Each tuple is (human_label, regex_pattern)
INJECTION_PATTERNS = [
    # Instruction override attacks
    ("ignore_instructions",   r"ignore\b.{0,20}\b(previous|prior|all|above)\b.{0,20}\binstructions"),
    ("disregard_instructions", r"disregard\b.{0,20}\b(previous|all|above)\b.{0,20}\binstructions"),
    ("forget_instructions",   r"forget\b.{0,20}\b(all|previous|your)\b.{0,20}\binstructions"),
    ("override_instructions", r"override\b.{0,20}\binstructions"),
    ("new_instructions",      r"your new instructions (are|will be)"),
    # System prompt extraction
    ("reveal_system_prompt",  r"reveal\b.{0,30}\b(system\s*prompt|prompt)"),
    ("show_system_prompt",    r"show\b.{0,30}\b(system\s*prompt|hidden prompt|original prompt)"),
    ("print_system_prompt",   r"print\b.{0,30}\b(system\s*prompt|original instructions)"),
    ("repeat_instructions",   r"repeat\b.{0,30}\b(everything|instructions|prompt) (above|before)"),
    # Persona / jailbreak
    ("act_as",                r"act as (an?\s+)?(different|unrestricted|new|evil|dan|jailbreak)"),
    ("pretend_you_are",       r"pretend (you are|to be) (a\s+)?(different|unrestricted|evil|dan)"),
    ("you_are_now",           r"you are now (a\s+)?(unrestricted|dan|jailbreak|evil|devel)"),
    ("jailbreak",             r"jailbreak"),
    ("developer_mode",        r"developer\s*mode\s*(enabled|on|activate)"),
    ("bypass_security",       r"bypass\b.{0,20}\b(security|filter|restrict|guardrail)"),
    ("do_anything_now",       r"do anything now|dan mode"),
    # Role / context injection
    ("system_role_inject",    r"<\s*system\s*>|\[system\]|\{\{system\}\}"),
    ("assistant_role_inject", r"<\s*assistant\s*>|\[assistant\]"),
    ("role_play_attack",      r"role.?play.{0,20}(no (rules|restrictions|limits)|unrestricted)"),
]


def detect_prompt_injection(text: str) -> dict:
    text_lower = text.lower()
    findings = []

    for label, pattern in INJECTION_PATTERNS:
        if re.search(pattern, text_lower):
            findings.append(label)

    if findings:
        return {"PROMPT_INJECTION": findings}

    return {}
