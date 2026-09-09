import type { TokenRefreshResult } from './tokens.js';

const GONG_AUTH_URL = 'https://app.gong.io/oauth2/authorize';
const GONG_TOKEN_URL = 'https://app.gong.io/oauth2/generate-customer-token';

export function gongOAuthConfigured(): boolean {
  return Boolean(process.env.GONG_CLIENT_ID && process.env.GONG_CLIENT_SECRET);
}

export function gongOAuthRedirectUri(): string {
  const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return `${api}/api/v1/oauth/callback/gong`;
}

export function buildGongAuthUrl(state: string): string {
  const clientId = process.env.GONG_CLIENT_ID;
  if (!clientId) {
    throw new Error('GONG_CLIENT_ID is not configured');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: gongOAuthRedirectUri(),
    response_type: 'code',
    state,
  });
  return `${GONG_AUTH_URL}?${params.toString()}`;
}

type GongTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  api_base_url_for_customer?: string;
};

export async function exchangeGongCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  apiBaseUrl?: string;
}> {
  const clientId = process.env.GONG_CLIENT_ID;
  const clientSecret = process.env.GONG_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Gong OAuth credentials are not configured');
  }

  const res = await fetch(GONG_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: gongOAuthRedirectUri(),
    }),
  });

  const data = (await res.json()) as GongTokenResponse & { error?: string; message?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.message ?? data.error ?? `Gong token exchange failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    apiBaseUrl: data.api_base_url_for_customer,
  };
}

export async function refreshGongToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.GONG_CLIENT_ID;
  const clientSecret = process.env.GONG_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Gong OAuth credentials are not configured');
  }

  const res = await fetch(GONG_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as GongTokenResponse & { error?: string; message?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.message ?? data.error ?? `Gong token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}
