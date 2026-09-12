import type { TokenRefreshResult } from './tokens.js';

const DEFAULT_LOGIN_URL = 'https://login.salesforce.com';

const DEFAULT_SCOPES = 'api refresh_token';

// Salesforce's OAuth token responses do not include `expires_in`, so there is
// no server-provided signal for when the access token should be refreshed.
// Without setting a synthetic expiry, `refreshIfNeeded()` never triggers a
// refresh (see workspace-tokens.ts), and a revoked/rotated token would only
// surface as a 401 with no retry path. Use a conservative fixed window so the
// existing buffer-based refresh loop periodically re-validates the token.
const SYNTHETIC_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function salesforceLoginUrl(): string {
  const base = process.env.SALESFORCE_LOGIN_URL ?? DEFAULT_LOGIN_URL;
  return base.replace(/\/$/, '');
}

export function salesforceOAuthConfigured(): boolean {
  return Boolean(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
}

export function salesforceOAuthRedirectUri(): string {
  const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return `${api}/api/v1/oauth/callback/crm/salesforce`;
}

export function buildSalesforceAuthUrl(state: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  if (!clientId) {
    throw new Error('SALESFORCE_CLIENT_ID is not configured');
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: salesforceOAuthRedirectUri(),
    scope: process.env.SALESFORCE_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    state,
  });
  return `${salesforceLoginUrl()}/services/oauth2/authorize?${params.toString()}`;
}

type SalesforceTokenResponse = {
  access_token: string;
  refresh_token?: string;
  instance_url?: string;
  id?: string;
  issued_at?: string;
  error?: string;
  error_description?: string;
};

function tokenUrl(): string {
  return `${salesforceLoginUrl()}/services/oauth2/token`;
}

export async function exchangeSalesforceCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  instanceUrl?: string;
  externalAccountId?: string;
}> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Salesforce OAuth credentials are not configured');
  }

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: salesforceOAuthRedirectUri(),
      code,
    }),
  });

  const data = (await res.json()) as SalesforceTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Salesforce token exchange failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + SYNTHETIC_TOKEN_TTL_MS),
    instanceUrl: data.instance_url,
    externalAccountId: data.id ?? data.instance_url,
  };
}

export async function refreshSalesforceToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Salesforce OAuth credentials are not configured');
  }

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as SalesforceTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Salesforce token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + SYNTHETIC_TOKEN_TTL_MS),
  };
}
