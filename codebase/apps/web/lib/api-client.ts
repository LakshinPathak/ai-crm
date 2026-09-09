import { clearToken, getToken, refreshAccessToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, token: string | null, init?: RequestInit, retried = false): Promise<T> {
  const authToken = token ?? getToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, newToken, init, true);
    }
    clearToken();
  }

  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, token?: string | null) {
  return request<T>(path, token ?? getToken());
}

export function apiPost<T>(path: string, token: string | null, body: unknown) {
  return request<T>(path, token, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, token: string | null, body: unknown) {
  return request<T>(path, token, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string, token: string | null) {
  return request<T>(path, token, { method: 'DELETE' });
}
