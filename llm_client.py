"""
Shadow AI – LLM Client

Tries to use OpenAI if OPENAI_API_KEY is set.
Falls back to a safe mock response so the gateway always returns something.
"""
import os


def call_llm(prompt: str, model: str | None = None) -> str:
    """
    Send a (possibly sanitized) prompt to the configured LLM and return the response.

    Priority:
      1. OpenAI  (if OPENAI_API_KEY is set)
      2. Mock    (always works, great for demos without a key)
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if api_key:
        return _call_openai(prompt, model, api_key)

    return _mock_response(prompt)


# ── OpenAI ────────────────────────────────────────────────────────────────────

def _call_openai(prompt: str, model: str | None, api_key: str) -> str:
    try:
        from openai import OpenAI  # lazy import – not required if using mock
        client = OpenAI(api_key=api_key)
        selected_model = model or os.getenv("SHADOW_DEFAULT_MODEL", "gpt-4o-mini")
        response = client.chat.completions.create(
            model=selected_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""
    except Exception:  # network error, quota, etc.
        return f"[OpenAI error – falling back to mock] {_mock_response(prompt)}"


# ── Mock ──────────────────────────────────────────────────────────────────────

def _mock_response(prompt: str) -> str:
    """Context-aware mock – simulates a real LLM for demos without an API key."""
    p = prompt.lower()

    # Python / coding questions — check specific topics before generic ones
    if "fibonacci" in p or "fibonnaci" in p or "fib " in p or "fib(" in p:
        return (
            "Here's the Fibonacci series in Python:\n"
            "```python\n"
            "# Method 1: Simple loop\n"
            "def fibonacci(n):\n"
            "    a, b = 0, 1\n"
            "    for _ in range(n):\n"
            "        print(a, end=' ')\n"
            "        a, b = b, a + b\n\n"
            "fibonacci(10)  # 0 1 1 2 3 5 8 13 21 34\n\n"
            "# Method 2: Return as list\n"
            "def fib_list(n):\n"
            "    result, a, b = [], 0, 1\n"
            "    for _ in range(n):\n"
            "        result.append(a)\n"
            "        a, b = b, a + b\n"
            "    return result\n\n"
            "# Method 3: Recursive (elegant but slow for large n)\n"
            "def fib(n):\n"
            "    return n if n <= 1 else fib(n-1) + fib(n-2)\n"
            "```\n"
            "For large values use the iterative method — recursion hits Python's stack limit."
        )
    if "palindrome" in p:
        return (
            "Check if a string is a palindrome:\n"
            "```python\n"
            "def is_palindrome(s: str) -> bool:\n"
            "    s = s.lower().replace(' ', '')\n"
            "    return s == s[::-1]\n\n"
            "print(is_palindrome('racecar'))  # True\n"
            "print(is_palindrome('hello'))    # False\n"
            "```"
        )
    if "prime" in p or "prime number" in p:
        return (
            "Check and generate prime numbers in Python:\n"
            "```python\n"
            "def is_prime(n: int) -> bool:\n"
            "    if n < 2: return False\n"
            "    for i in range(2, int(n**0.5) + 1):\n"
            "        if n % i == 0: return False\n"
            "    return True\n\n"
            "# Get all primes up to N (Sieve of Eratosthenes)\n"
            "def primes_up_to(n):\n"
            "    sieve = [True] * (n + 1)\n"
            "    sieve[0] = sieve[1] = False\n"
            "    for i in range(2, int(n**0.5) + 1):\n"
            "        if sieve[i]:\n"
            "            for j in range(i*i, n+1, i):\n"
            "                sieve[j] = False\n"
            "    return [i for i, v in enumerate(sieve) if v]\n"
            "```"
        )
    if "factorial" in p:
        return (
            "Factorial in Python:\n"
            "```python\n"
            "import math\n"
            "print(math.factorial(5))  # 120 — built-in, fastest\n\n"
            "# Iterative\n"
            "def factorial(n):\n"
            "    result = 1\n"
            "    for i in range(2, n + 1):\n"
            "        result *= i\n"
            "    return result\n\n"
            "# Recursive\n"
            "def factorial_r(n):\n"
            "    return 1 if n <= 1 else n * factorial_r(n - 1)\n"
            "```"
        )
    if ("list comprehension" in p or "comprehension" in p):
        return (
            "List comprehensions — the most Pythonic way to build lists:\n"
            "```python\n"
            "# Basic\n"
            "squares = [x**2 for x in range(10)]\n\n"
            "# With condition\n"
            "evens = [x for x in range(20) if x % 2 == 0]\n\n"
            "# Nested\n"
            "flat = [x for row in matrix for x in row]\n\n"
            "# Dict comprehension\n"
            "word_len = {word: len(word) for word in ['hello', 'world']}\n"
            "```"
        )
    if "decorator" in p:
        return (
            "Python decorators wrap a function to add behaviour:\n"
            "```python\n"
            "import time\n\n"
            "def timer(func):\n"
            "    def wrapper(*args, **kwargs):\n"
            "        start = time.perf_counter()\n"
            "        result = func(*args, **kwargs)\n"
            "        print(f'{func.__name__} took {time.perf_counter()-start:.4f}s')\n"
            "        return result\n"
            "    return wrapper\n\n"
            "@timer\n"
            "def slow_function():\n"
            "    time.sleep(1)\n"
            "```"
        )
    if "async" in p or "asyncio" in p or "await" in p:
        return (
            "Async programming in Python with asyncio:\n"
            "```python\n"
            "import asyncio\n\n"
            "async def fetch_data(url: str) -> str:\n"
            "    # Use aiohttp for real HTTP calls\n"
            "    await asyncio.sleep(1)  # simulate IO\n"
            "    return f'data from {url}'\n\n"
            "async def main():\n"
            "    # Run concurrently\n"
            "    results = await asyncio.gather(\n"
            "        fetch_data('url1'),\n"
            "        fetch_data('url2'),\n"
            "    )\n"
            "    print(results)\n\n"
            "asyncio.run(main())\n"
            "```"
        )
    if "reverse" in p and "string" in p:
        return (
            "In Python you can reverse a string in several ways:\n"
            "```python\n"
            "s = 'hello'\n"
            "# Slice method (most Pythonic)\n"
            "reversed_s = s[::-1]  # 'olleh'\n\n"
            "# Using reversed() + join\n"
            "reversed_s = ''.join(reversed(s))\n"
            "```"
        )
    if "sort" in p and ("list" in p or "array" in p):
        return (
            "To sort a list in Python:\n"
            "```python\n"
            "nums = [3, 1, 4, 1, 5]\n"
            "nums.sort()               # in-place\n"
            "sorted_nums = sorted(nums) # returns new list\n"
            "# Reverse order\n"
            "nums.sort(reverse=True)\n"
            "```"
        )
    if "loop" in p or "iterate" in p or ("for " in p and ("list" in p or "array" in p or "items" in p)):
        return (
            "Common Python loop patterns:\n"
            "```python\n"
            "# Over a list\n"
            "for item in my_list:\n"
            "    print(item)\n\n"
            "# With index\n"
            "for i, item in enumerate(my_list):\n"
            "    print(i, item)\n"
            "```"
        )
    if "function" in p or "def " in p:
        return (
            "Here's how to define a function in Python:\n"
            "```python\n"
            "def greet(name: str) -> str:\n"
            "    return f'Hello, {name}!'\n\n"
            "result = greet('Alice')\n"
            "```\n"
            "Use type hints for clarity and add docstrings for documentation."
        )
    if "class" in p or "object" in p or "oop" in p:
        return (
            "Python class example:\n"
            "```python\n"
            "class Animal:\n"
            "    def __init__(self, name: str):\n"
            "        self.name = name\n\n"
            "    def speak(self) -> str:\n"
            "        return f'{self.name} says hello'\n"
            "```"
        )
    if "api" in p or "request" in p or "http" in p:
        return (
            "To make HTTP requests in Python use the `requests` library:\n"
            "```python\n"
            "import requests\n"
            "response = requests.get('https://api.example.com/data',\n"
            "                        headers={'Authorization': 'Bearer TOKEN'})\n"
            "data = response.json()\n"
            "```\n"
            "Always store API keys in environment variables, never hardcode them."
        )
    if "error" in p or "exception" in p or "debug" in p:
        return (
            "For error handling in Python:\n"
            "```python\n"
            "try:\n"
            "    result = risky_operation()\n"
            "except ValueError as e:\n"
            "    print(f'Value error: {e}')\n"
            "except Exception as e:\n"
            "    print(f'Unexpected error: {e}')\n"
            "finally:\n"
            "    cleanup()\n"
            "```"
        )
    if "sql" in p or "database" in p or "query" in p:
        return (
            "For safe SQL queries always use parameterized statements:\n"
            "```python\n"
            "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))\n"
            "```\n"
            "Never concatenate user input directly into SQL — that causes SQL injection."
        )
    if "send" in p or "email" in p or "results" in p:
        return (
            "I can help with that. Note: the email address in your prompt was automatically "
            "redacted by Shadow AI before reaching me — your data stays protected. "
            "Could you clarify what results you'd like to send?"
        )
    if "password" in p or "credential" in p or "secret" in p:
        return (
            "Security best practice: never include passwords or secrets in prompts. "
            "Use environment variables or a secrets manager like HashiCorp Vault or AWS Secrets Manager."
        )
    # Generic helpful fallback
    if "write" in p and ("code" in p or "python" in p or "program" in p):
        return (
            "I'd be happy to help you write code! To give you the best answer, could you tell me:\n"
            "1. What should the program **do**? (e.g. 'calculate fibonacci', 'read a CSV')\n"
            "2. Any specific requirements? (e.g. input format, output format)\n\n"
            "Try asking like: *'Write Python code to calculate fibonacci series up to N'*"
        )
    return (
        f"I understand you're asking about: *'{prompt[:80]}{'...' if len(prompt) > 80 else ''}'*\n\n"
        "Could you be more specific? For example:\n"
        "- **Coding**: 'How do I sort a dict by value in Python?'\n"
        "- **Debugging**: 'Why does my list index go out of range?'\n"
        "- **Concepts**: 'Explain recursion with an example'\n\n"
        "I'm here to help with coding, debugging, and technical questions."
    )
