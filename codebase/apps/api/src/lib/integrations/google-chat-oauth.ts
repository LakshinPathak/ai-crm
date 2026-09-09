import type { TokenRefreshResult } from './tokens.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/chat.bot'].join(' ');

function resolveClientId(): string | undefined {
  return process.env.GOOGLE_CHAT_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
}

function resolveClientSecret(): string | undefined {
  return process.env.GOOGLE_CHAT_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
}

export function googleChatOAuthConfigured(): boolean {
  return Boolean(resolveClientId() && resolveClientSecret());
}

export function googleChatOAuthRedirectUri(): string {
  const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return `${api}/api/v1/oauth/callback/chat/google_chat`;
}

export function buildGoogleChatAuthUrl(state: string): string {
  const clientId = resolveClientId();
  if (!clientId) {
    throw new Error('GOOGLE_CHAT_CLIENT_ID (or GOOGLE_CLIENT_ID) is not configured');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleChatOAuthRedirectUri(),
    response_type: 'code',
    scope: process.env.GOOGLE_CHAT_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function exchangeGoogleChatCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  externalAccountId?: string;
}> {
  const clientId = resolveClientId();
  const clientSecret = resolveClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Google Chat OAuth credentials are not configured');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleChatOAuthRedirectUri(),
      code,
    }),
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? `Google Chat token exchange failed (${res.status})`,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    externalAccountId: 'google-chat-workspace',
  };
}

export async function refreshGoogleChatToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = resolveClientId();
  const clientSecret = resolveClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Google Chat OAuth credentials are not configured');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? `Google Chat token refresh failed (${res.status})`,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}
