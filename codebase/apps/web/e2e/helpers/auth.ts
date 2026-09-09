import type { Page } from '@playwright/test';

export const TOKEN_KEY = 'ai_crm_token';
export const API_URL =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type DevLoginResponse = {
  accessToken?: string;
  token?: string;
  needsWorkspace?: boolean;
};

async function api<T>(
  path: string,
  token?: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }
  return data;
}

export async function devLoginViaApi(
  email: string,
  displayName = 'E2E User',
): Promise<string> {
  const data = await api<DevLoginResponse>('/auth/dev-login', undefined, 'POST', {
    email,
    displayName,
  });
  const token = data.accessToken ?? data.token;
  if (!token) {
    throw new Error('dev-login response missing token');
  }
  return token;
}

export async function ensureOnboardedUser(
  email: string,
  displayName = 'E2E User',
): Promise<string> {
  let token = await devLoginViaApi(email, displayName);

  const me = await api<{ workspace?: { onboardingCompletedAt?: string | null } }>(
    '/me',
    token,
  );
  if (!me.workspace) {
    const ws = await api<{ token?: string; accessToken?: string }>(
      '/onboarding/workspace',
      token,
      'POST',
      { name: 'E2E Workspace', timezone: 'UTC' },
    );
    token = ws.accessToken ?? ws.token ?? token;
  }

  const status = await api<{ completed?: boolean }>('/onboarding/status', token);
  if (!status.completed) {
    await api('/onboarding/complete', token, 'POST', {});
  }

  return token;
}

export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [TOKEN_KEY, token] as const,
  );
  // Establish origin so localStorage is available before dashboard routes load.
  await page.goto('/');
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [TOKEN_KEY, token] as const,
  );
}
