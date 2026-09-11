# 🛡️ Shadow AI — Enterprise AI Security Gateway

[![CI](https://github.com/Chetanareddy18/ShadowAI/actions/workflows/ci.yml/badge.svg)](https://github.com/Chetanareddy18/ShadowAI/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Shadow AI** is a full-stack AI security gateway that sits between users and any LLM. It intercepts every prompt, detects injection attacks, scans for PII/secrets, enforces per-organisation policies, and gives admins a real-time control-plane to monitor everything — a Python/FastAPI security engine, a live-monitoring React admin portal, and a marketing landing page, all in one repo.

---

## 🧩 What's in this repo

| Part | Path | Stack | What it does |
|---|---|---|---|
| **Gateway (API)** | [`gateway.py`](gateway.py) | FastAPI + SQLAlchemy + scikit-learn | The security brain — auth, rate limiting, injection/PII detection, policy engine, LLM call, audit logging |
| **Admin Portal** | [`portal/`](portal/) | React 19 + TypeScript + Vite + Zustand | Live dashboard, real-time threat feed (SSE), user/org management, audit log explorer, prompt studio |
| **Landing Page** | [`landing/`](landing/) | React 19 + TypeScript + Three.js + Framer Motion | Public-facing marketing site with a 3D hero, animated security pipeline, dark/light theme |
| **Legacy Streamlit tools** | [`dashboard.py`](dashboard.py), [`chat_ui.py`](chat_ui.py) | Streamlit | Optional lightweight analytics dashboard + test chat client (kept for quick local demos) |

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
| **Live Admin Portal** | React SPA — SSE threat feed, KPI dashboard, user/org CRUD, CSV export, prompt studio |
| **Metrics** | Prometheus `/metrics` endpoint (optional) |
| **Admin API** | User CRUD, Org CRUD, Policy management, CSV export |

---

## 🏗️ Architecture

```
┌───────────────┐        ┌──────────────────────┐
│  Landing Page │        │     Admin Portal     │
│  (React + 3D) │        │  (React + TS + SSE)  │
└───────┬───────┘        └──────────┬───────────┘
        │                           │  fetch / EventSource
        │                           ▼
        │              ┌─────────────────────────────────────────┐
        │              │           Shadow AI Gateway             │
        └─────────────►│                                         │
       "Open Portal"   │  1. Auth (API Key / JWT)                │
                        │  2. Rate Limit (DB-backed)              │
                        │  3. Regex Injection Detection  ─► BLOCK │
                        │  4. Semantic Injection (TF-IDF+LogReg)  │
                        │  5. PII / Secret Scan                   │
                        │  6. Topic Classification (risk mult.)   │
                        │  7. Risk Score + Policy Decision        │
                        │  8. Sanitize (redact PII if SANITIZE)   │
                        │  9. LLM Call (OpenAI / mock)            │
                        │ 10. Response Scan  ─► REDACT / BLOCK    │
                        │ 11. Anomaly Detection (IsolationForest) │
                        │ 12. Audit Log (SQLite / PostgreSQL)     │
                        │ 13. Alert (Slack / Email on CRITICAL)   │
                        └───────────────┬─────────────────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                    LLM Response              Portal Dashboard / SSE
                    (to client)                (live analytics + admin)
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ (for `portal/` and `landing/`)
- (Optional) Docker & Docker Compose

### 1. Clone & configure

```bash
git clone https://github.com/Chetanareddy18/ShadowAI.git
cd ShadowAI
cp .env.example .env
# edit .env → set OPENAI_API_KEY, SHADOW_JWT_SECRET, etc. (optional — mock LLM works out of the box)
```

### 2. Run everything at once (Windows)

```powershell
.\start-all.ps1
```

This installs dependencies and opens the gateway, portal, and landing page each in their own terminal window.

### 3. …or run each piece manually

```bash
# Backend — FastAPI gateway
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn gateway:app --reload --port 8000

# Admin portal (new terminal)
cd portal
npm install
npm run dev          # → http://localhost:5173

# Landing page (new terminal)
cd landing
npm install
npm run dev          # → http://localhost:5175
```

| Service | URL | Notes |
|---|---|---|
| Gateway API | http://localhost:8000 | `/docs` for interactive Swagger UI |
| Admin Portal | http://localhost:5173 | Login with a seed API key (see below) |
| Landing Page | http://localhost:5175 | Public marketing site |

**Demo API keys** (created automatically on first run, dev/demo only — rotate before any real deployment):
`shadow_admin` (admin role), `shadow_emp_101`, `shadow_emp_102` (employee role)

### Docker Compose (backend + Streamlit tools)

```bash
docker-compose up --build
```

Gateway → `http://localhost:8000` · Dashboard → `http://localhost:8502` · Chat UI → `http://localhost:8501`
(`portal/` and `landing/` are Vite apps, run/deployed separately — see their own `package.json`.)

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
# Backend
pytest tests/ -v
pytest tests/ --cov=. --cov-report=term-missing

# Portal / Landing
cd portal && npm run build   # type-checks + production build
cd landing && npm run build
```

---

## 🔐 Security Highlights

- **API keys are hashed** (SHA-256) — plaintext never stored
- **Prompts logged by fingerprint** (SHA-256), not raw text (unless `SHADOW_LOG_RAW_PROMPTS=true`)
- **Response scanning** closes the most critical gap: LLM output can contain PII or harmful content even for benign prompts
- **Semantic injection** defeats paraphrased attacks that bypass simple regex
- **Anomaly detection** catches insider threats and compromised accounts via behavioural baselining
- **Per-org policies** enable multi-tenant isolation
- **Secrets stay out of git**: `.env`, `*.db` and audit logs are gitignored — only `.env.example` is committed
- OWASP Top 10 mitigations applied throughout

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| API Gateway | FastAPI + Uvicorn |
| Database | SQLAlchemy 2 · SQLite (dev) · PostgreSQL (prod) |
| ML | scikit-learn (TF-IDF, IsolationForest, LogisticRegression) |
| LLM | OpenAI API (gpt-4o-mini default) |
| Admin Portal | React 19 · TypeScript · Vite · Zustand · Recharts · Framer Motion |
| Landing Page | React 19 · TypeScript · Three.js (`@react-three/fiber`) · Framer Motion · Tailwind CSS v4 |
| Legacy dashboard | Streamlit + Plotly |
| Auth | SHA-256 API keys + python-jose JWT |
| Testing | pytest + FastAPI TestClient |
| CI/CD | GitHub Actions |
| Containerisation | Docker + Docker Compose |

---

## 🗺️ Phase Roadmap

- [x] **Phase 1** — Core gateway: auth, rate limiting, PII scan, policy engine, LLM call, audit log
- [x] **Phase 2** — Dashboard, alerting, JWT auth, CSV export, per-org policies
- [x] **Phase 3** — Semantic injection (ML), response scanner, topic classifier, anomaly detection, user/org admin API, Prometheus metrics
- [x] **Phase 4** — React admin portal (live SSE threat feed, dashboard, prompt studio) + 3D landing page
- [ ] **Phase 5** — PostgreSQL migration, Redis rate limiting, RBAC, multi-modal scanning, SOC 2 compliance mode

---

## 👩‍💻 Author

**Palla Chetana Reddy**

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

