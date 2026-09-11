const BASE = import.meta.env.VITE_API_URL ?? sessionStorage.getItem('shadow_gateway_url') ?? 'http://localhost:8000';

function getKey(): string {
  return sessionStorage.getItem('shadow_api_key') ?? '';
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = (sessionStorage.getItem('shadow_gateway_url') ?? BASE) + path;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  get:    <T>(path: string)              => req<T>('GET',    path),
  post:   <T>(path: string, b: unknown)  => req<T>('POST',   path, b),
  delete: <T>(path: string)              => req<T>('DELETE',  path),

  health: ()                             => req<{ status: string }>('GET', '/health'),
  stats:  ()                             => req<StatsResponse>('GET', '/admin/stats'),
  audit:  (p: AuditParams)              => req<AuditResponse>('GET', `/admin/audit?${new URLSearchParams(p as Record<string,string>).toString()}`),
  users:  (orgId?: string)              => req<User[]>('GET', `/admin/users${orgId ? `?org_id=${orgId}` : ''}`),
  orgs:   ()                            => req<Org[]>('GET', '/admin/orgs'),
  anomalies: (limit = 20)               => req<AnomalyEvent[]>('GET', `/admin/anomalies?limit=${limit}`),
  createUser: (b: CreateUserBody)       => req<User>('POST', '/admin/users', b),
  deleteUser: (id: string)              => req<unknown>('DELETE', `/admin/users/${id}`),
  createOrg:  (b: { org_id: string; name: string }) => req<Org>('POST', '/admin/orgs', b),
  updatePolicy: (b: { org_id: string; policy: unknown }) => req<unknown>('POST', '/admin/policy', b),
  getPolicy:  (orgId: string)           => req<unknown>('GET', `/admin/policy/${encodeURIComponent(orgId)}`),
  processPrompt: (b: PromptBody)        => req<PromptResponse>('POST', '/process_prompt', b),
};

// ── Types ──────────────────────────────────────────────────────
export interface StatsResponse {
  total_requests: number;
  blocked: number;
  sanitized: number;
  allowed: number;
  anomalies_detected: number;
  by_risk: Record<string, number>;
  by_topic: Record<string, number>;
  by_decision: Record<string, number>;
}

export interface AuditParams {
  page?: number;
  page_size?: number;
  decision?: string;
  risk_level?: string;
  user_id?: string;
  org_id?: string;
  topic?: string;
}

export interface AuditRow {
  id: string;
  timestamp: string;
  user_id: string;
  org_id: string;
  decision: string;
  risk_level: string;
  topic: string;
  findings: Record<string, unknown>;
  prompt_length: number;
  is_anomalous: string;
  message: string;
  model_used: string;
}

export interface AuditResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AuditRow[];
}

export interface User {
  user_id: string;
  org_id: string;
  role: string;
  is_active: string;
  created_at: string;
}

export interface Org {
  org_id: string;
  name: string;
  created_at: string;
  has_custom_policy: boolean;
}

export interface AnomalyEvent {
  id: number;
  timestamp: string;
  user_id: string;
  org_id: string;
  anomaly_score: number;
  reason: string;
}

export interface CreateUserBody {
  user_id: string;
  org_id: string;
  role: string;
  api_key: string;
}

export interface PromptBody {
  prompt: string;
  model?: string;
  org_id?: string;
}

export interface PromptResponse {
  decision: string;
  risk_level: string;
  message: string;
  sanitized_prompt?: string;
  findings: Record<string, unknown>;
}
