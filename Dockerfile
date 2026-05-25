# ──────────────────────────────────────────────────────────────────────────────
#  Shadow AI Gateway – Dockerfile
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Expose gateway port
EXPOSE 8000

# Default command – runs the FastAPI gateway
CMD ["uvicorn", "gateway:app", "--host", "0.0.0.0", "--port", "8000"]
