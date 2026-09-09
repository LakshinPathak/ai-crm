import type { TokenRefreshResult } from './tokens.js';

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

const DEFAULT_SCOPES = [
  'chat:write',
  'commands',
  'users:read',
  'channels:read',
].join(',');

export function slackOAuthConfigured(): boolean {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

export function slackOAuthRedirectUri(): string {
  const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return `${api}/api/v1/oauth/callback/chat/slack`;
}

export function buildSlackAuthUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error('SLACK_CLIENT_ID is not configured');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: slackOAuthRedirectUri(),
    scope: process.env.SLACK_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    state,
  });
  return `${SLACK_AUTH_URL}?${params.toString()}`;
}

type SlackTokenResponse = {
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  team?: { id: string; name: string };
  error?: string;
};

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  externalAccountId?: string;
}> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Slack OAuth credentials are not configured');
  }

  const res = await fetch(SLACK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: slackOAuthRedirectUri(),
      code,
    }),
  });

  const data = (await res.json()) as SlackTokenResponse;
  if (!res.ok || !data.ok || !data.access_token) {
    throw new Error(data.error ?? `Slack token exchange failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    externalAccountId: data.team?.id,
  };
}

export async function refreshSlackToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Slack OAuth credentials are not configured');
  }

  const res = await fetch(SLACK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as SlackTokenResponse;
  if (!res.ok || !data.ok || !data.access_token) {
    throw new Error(data.error ?? `Slack token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}
