const TOKEN_KEY = 'ai_crm_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getGoogleSignInUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return `${api}/api/v1/auth/google`;
}

export async function exchangeAuthCode(code: string): Promise<{ accessToken: string; needsWorkspace: boolean }> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${api}/api/v1/auth/exchange`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = (await res.json()) as { accessToken: string; needsWorkspace: boolean };
  setToken(data.accessToken);
  return data;
}

export async function refreshAccessToken(): Promise<string | null> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${api}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    clearToken();
    return null;
  }
  const data = (await res.json()) as { accessToken: string };
  setToken(data.accessToken);
  return data.accessToken;
}

export async function logout(): Promise<void> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  await fetch(`${api}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
  clearToken();
}
