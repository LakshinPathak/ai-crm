import type { TokenRefreshResult } from './tokens.js';

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

const DEFAULT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.companies.read',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.schemas.deals.read',
  'oauth',
].join(' ');

export function hubspotOAuthConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
}

export function hubspotOAuthRedirectUri(): string {
  const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return `${api}/api/v1/oauth/callback/crm/hubspot`;
}

export function buildHubSpotAuthUrl(state: string): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!clientId) {
    throw new Error('HUBSPOT_CLIENT_ID is not configured');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: hubspotOAuthRedirectUri(),
    scope: process.env.HUBSPOT_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    state,
  });
  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

type HubSpotTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function exchangeHubSpotCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}> {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('HubSpot OAuth credentials are not configured');
  }

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: hubspotOAuthRedirectUri(),
      code,
    }),
  });

  const data = (await res.json()) as HubSpotTokenResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `HubSpot token exchange failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

export async function refreshHubSpotToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('HubSpot OAuth credentials are not configured');
  }

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as HubSpotTokenResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `HubSpot token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}
