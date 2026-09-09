import type { TokenRefreshResult } from './tokens.js';

const TEAMS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TEAMS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

const DEFAULT_SCOPES = [
  'offline_access',
  'https://graph.microsoft.com/ChannelMessage.Send',
  'https://graph.microsoft.com/Chat.ReadWrite',
  'https://graph.microsoft.com/Team.ReadBasic.All',
].join(' ');

export function teamsOAuthConfigured(): boolean {
  return Boolean(process.env.TEAMS_CLIENT_ID && process.env.TEAMS_CLIENT_SECRET);
}

export function teamsOAuthRedirectUri(): string {
  const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return `${api}/api/v1/oauth/callback/chat/teams`;
}

export function buildTeamsAuthUrl(state: string): string {
  const clientId = process.env.TEAMS_CLIENT_ID;
  if (!clientId) {
    throw new Error('TEAMS_CLIENT_ID is not configured');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: teamsOAuthRedirectUri(),
    response_type: 'code',
    scope: process.env.TEAMS_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    state,
    response_mode: 'query',
  });
  return `${TEAMS_AUTH_URL}?${params.toString()}`;
}

type TeamsTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function exchangeTeamsCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  externalAccountId?: string;
}> {
  const clientId = process.env.TEAMS_CLIENT_ID;
  const clientSecret = process.env.TEAMS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Teams OAuth credentials are not configured');
  }

  const res = await fetch(TEAMS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: teamsOAuthRedirectUri(),
      code,
    }),
  });

  const data = (await res.json()) as TeamsTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Teams token exchange failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    externalAccountId: 'teams-workspace',
  };
}

export async function refreshTeamsToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.TEAMS_CLIENT_ID;
  const clientSecret = process.env.TEAMS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Teams OAuth credentials are not configured');
  }

  const res = await fetch(TEAMS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      scope: process.env.TEAMS_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    }),
  });

  const data = (await res.json()) as TeamsTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Teams token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}
