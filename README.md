# 🛡️ Shadow AI — Enterprise AI Security Gateway

[![CI](https://github.com/Chetanareddy18/ShadowAI/actions/workflows/ci.yml/badge.svg)](https://github.com/Chetanareddy18/ShadowAI/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Shadow AI** is a production-grade AI security gateway that sits between your users and any LLM. It intercepts every prompt, scans it for threats, enforces per-organisation policies, and audits every interaction — in real time.

---

## ✨ Features

| Layer | Capability |
|---|---|
| **Auth** | API key (SHA-256 hashed) + optional JWT tokens |
| **Rate Limiting** | DB-backed sliding window per user (configurable) |
| **Regex Injection** | 20+ regex patterns across 5 attack categories |
| **Semantic Injection** | TF-IDF + Logistic Regression hybrid (150-entry corpus, 8 attack families) |
| **PII / Secret Scan** | Email, phone, passwords, API tokens, DB URLs, webhooks |
| **Topic Classification** | 8 domains (Medical, Financial, Legal, IP, HR …) with per-domain risk multipliers |
| **Policy Engine** | Per-org JSON policies — BLOCK / SANITIZE / ALLOW |
| **LLM Integration** | OpenAI (`gpt-4o-mini` default) + context-aware mock fallback |
| **Response Scanner** | Scans LLM output for PII, harmful content, system prompt leakage, exfil payloads |
| **Anomaly Detection** | IsolationForest per-user behavioural baseline (statistical fallback) |
| **Audit Log** | SQLite (dev) / PostgreSQL (prod) — every request persisted |
| **Alerting** | Slack webhook + SMTP email on configurable risk levels |
| **Dashboard** | 6-tab Streamlit analytics: Overview, Threat Feed, Topics, User Behaviour, Time-Series, Org Comparison |
| **Metrics** | Prometheus `/metrics` endpoint (optional) |
| **Admin API** | User CRUD, Org CRUD, Policy management, CSV export |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (API Consumer)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │  POST /process_prompt
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Shadow AI Gateway                          │
│                                                                 │
│  1. Auth (API Key / JWT)                                        │
│  2. Rate Limit (DB-backed sliding window)                       │
│  3. Regex Injection Detection  ──────────────────► BLOCK        │
│  4. Semantic Injection (TF-IDF + LogReg)  ──────► BLOCK        │
│  5. PII / Secret Scan                                           │
│  6. Topic Classification  (risk multiplier)                     │
│  7. Risk Score + Policy Decision  ──────────────► BLOCK        │
│  8. Sanitize (redact PII if SANITIZE)                          │
│  9. LLM Call (OpenAI / mock)                                   │
│ 10. Response Scan  ─────────────────────────────► REDACT/BLOCK │
│ 11. Anomaly Detection (IsolationForest)                        │
│ 12. Audit Log (SQLite / PostgreSQL)                            │
│ 13. Alert (Slack / Email on CRITICAL)                          │
└──────────────┬──────────────────────────┬──────────────────────┘
               │                          │
               ▼                          ▼
         LLM Response             Streamlit Dashboard
         (to client)              (analytics + admin)
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- (Optional) Docker & Docker Compose

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Chetanareddy18/ShadowAI.git
cd ShadowAI

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment (copy and edit)
cp .env.example .env
# Set OPENAI_API_KEY, SHADOW_JWT_SECRET, etc.

# 5. Run the gateway
uvicorn gateway:app --reload --port 8000

# 6. (Optional) Run the dashboard
streamlit run dashboard.py
```

### Docker Compose

```bash
docker-compose up --build
```

The gateway will be available at `http://localhost:8000` and the dashboard at `http://localhost:8501`.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | OpenAI API key (gateway works without it via mock) |
| `SHADOW_DB_URL` | `sqlite:///./shadow_audit.db` | SQLAlchemy database URL |
| `SHADOW_JWT_SECRET` | (insecure default) | JWT signing secret — **must change in production** |
| `SHADOW_LOG_RAW_PROMPTS` | `false` | Log full prompt text (disabled by default for privacy) |
| `SHADOW_DEFAULT_MODEL` | `gpt-4o-mini` | Default LLM model |
| `SHADOW_RATE_LIMIT_MAX` | `50` | Max requests per window per user |
| `SHADOW_RATE_LIMIT_WINDOW` | `60` | Rate limit window in seconds |
| `ALERT_ON_RISK_LEVELS` | `CRITICAL` | Comma-separated risk levels that trigger alerts |
| `SHADOW_ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |
| `SLACK_WEBHOOK_URL` | — | Slack incoming webhook URL for alerts |
| `ALERT_EMAIL_*` | — | SMTP settings for email alerts |

---

## 📡 API Reference

### Process a Prompt

```http
POST /process_prompt
X-Api-Key: shadow_emp_101

{
  "prompt": "Explain the GDPR data retention rules.",
  "model": "gpt-4o-mini",
  "org_id": "org_default"
}
```

**Response:**
```json
{
  "decision": "ALLOW",
  "risk_level": "MEDIUM",
  "findings": {},
  "topic": "LEGAL",
  "topic_risk_multiplier": 2.5,
  "llm_response": "Under GDPR, personal data should not be retained longer than necessary..."
}
```

### Key Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | — | Service info |
| `GET` | `/health` | — | Health check + module status |
| `POST` | `/process_prompt` | API Key | Main prompt processing endpoint |
| `GET` | `/admin/stats` | Admin | Aggregate request statistics |
| `GET` | `/admin/export/csv` | Admin | Download audit log as CSV |
| `GET` | `/admin/users` | Admin | List all users |
| `POST` | `/admin/users` | Admin | Create a user |
| `DELETE` | `/admin/users/{id}` | Admin | Deactivate a user |
| `GET` | `/admin/orgs` | Admin | List all organisations |
| `POST` | `/admin/orgs` | Admin | Create an organisation |
| `GET` | `/admin/anomalies` | Admin | List anomaly events |
| `GET` | `/admin/policy/{org_id}` | Admin | Get org policy |
| `POST` | `/admin/policy` | Admin | Update org policy |
| `GET` | `/metrics` | — | Prometheus metrics (if installed) |
| `GET` | `/docs` | — | Interactive Swagger UI |

---

## 🧪 Testing

```bash
# Run all unit tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=term-missing

# Run just gateway integration tests
pytest tests/test_gateway.py -v
```

---

## 🔐 Security Highlights

- **API keys are hashed** (SHA-256) — plaintext never stored
- **Prompts logged by fingerprint** (SHA-256), not raw text (unless `SHADOW_LOG_RAW_PROMPTS=true`)
- **Response scanning** closes the most critical gap: LLM output can contain PII or harmful content even for benign prompts
- **Semantic injection** defeats paraphrased attacks that bypass simple regex
- **Anomaly detection** catches insider threats and compromised accounts via behavioural baselining
- **Per-org policies** enable multi-tenant isolation
- OWASP Top 10 mitigations applied throughout

---

## 📊 Dashboard Tabs

| Tab | What You See |
|---|---|
| 📊 Overview | KPIs, exec impact, decision/risk/semantic score charts |
| 🚨 Threat Feed | Live blocked events, anomaly events, top blocked users |
| 🏷️ Topics | Domain distribution, block rate by topic, risk multiplier heatmap |
| 👤 User Behaviour | Per-user risk scores, anomaly timeline, request heatmap |
| 📈 Time-Series | Daily trends, hourly heatmap, 7-day rolling block rate |
| 🏢 Org Comparison | Multi-org scorecards, volume/block rate, topic mix |

---

## 🗺️ Phase Roadmap

- [x] **Phase 1** — Core gateway: auth, rate limiting, PII scan, policy engine, LLM call, audit log
- [x] **Phase 2** — Dashboard, alerting, JWT auth, CSV export, per-org policies
- [x] **Phase 3** — Semantic injection (ML), response scanner, topic classifier, anomaly detection, user/org admin API, Prometheus metrics
- [ ] **Phase 4** — PostgreSQL migration, Redis rate limiting, RBAC, multi-modal scanning, SOC 2 compliance mode

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| API Gateway | FastAPI + Uvicorn |
| Database | SQLAlchemy 2 · SQLite (dev) · PostgreSQL (prod) |
| ML | scikit-learn (TF-IDF, IsolationForest, LogisticRegression) |
| LLM | OpenAI API (gpt-4o-mini default) |
| Dashboard | Streamlit + Plotly |
| Auth | SHA-256 API keys + python-jose JWT |
| Testing | pytest + FastAPI TestClient |
| CI/CD | GitHub Actions |
| Containerisation | Docker + Docker Compose |

---

## 👩‍💻 Author

**Palla Chetana Reddy**  
Founder & CEO, [Oronzo](https://oronzo.in) · AI/ML Research Intern, Apollo Hospitals · Gold Medalist, B.Tech CSE  
[LinkedIn](https://linkedin.com/in/palla-chetana-reddy/) · [GitHub](https://github.com/Chetanareddy18)

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
