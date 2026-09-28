const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

let _token: string | null = null;

async function acquireToken(): Promise<string> {
  if (_token) return _token;
  const resp = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin@example.com', password: 'admin123' }),
  });
  if (!resp.ok) throw new Error('Login failed');
  const data = await resp.json();
  _token = data.access_token as string;
  return _token;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await acquireToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
}

export interface ApiAsset {
  id: number;
  unique_id: string;
  name: string;
  type_id: number;
  region_id: number;
  status: string;
  geometry: string | null;
  attributes: Record<string, unknown>;
  condition_score: number | null;
  created_at: string;
  updated_at: string;
}

export async function fetchAllAssets(limit = 500): Promise<ApiAsset[]> {
  const resp = await authFetch(`/api/v1/assets/?limit=${limit}`);
  if (!resp.ok) throw new Error(`Failed to fetch assets: ${resp.status}`);
  return resp.json();
}
