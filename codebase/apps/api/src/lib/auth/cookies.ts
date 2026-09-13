import type { Response } from 'express';

const REFRESH_COOKIE = 'ai_crm_refresh';
const OAUTH_STATE_COOKIE = 'ai_crm_oauth_state';
const OAUTH_INVITE_COOKIE = 'ai_crm_oauth_invite';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieBase(),
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, cookieBase());
}

export function getRefreshTokenFromCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...cookieBase(),
    maxAge: 10 * 60 * 1000, // 10 min
  });
}

export function getOAuthStateFromCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${OAUTH_STATE_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, cookieBase());
}

export function setOAuthInviteCookie(res: Response, inviteId: string): void {
  res.cookie(OAUTH_INVITE_COOKIE, inviteId, {
    ...cookieBase(),
    maxAge: 10 * 60 * 1000,
  });
}

export function getOAuthInviteFromCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${OAUTH_INVITE_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function clearOAuthInviteCookie(res: Response): void {
  res.clearCookie(OAUTH_INVITE_COOKIE, cookieBase());
}
