import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';

const COOKIE = 'ai_crm_oauth_ctx';
const MAX_AGE_MS = 10 * 60 * 1000;

export type IntegrationOAuthKind = 'crm' | 'chat' | 'gong' | 'calendar';

export type IntegrationOAuthContext = {
  state: string;
  workspaceId: string;
  userId: string;
  provider: string;
  kind: IntegrationOAuthKind;
};

function signingSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-oauth-signing-secret';
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_MS,
  };
}

export function issueIntegrationOAuthContext(
  res: Response,
  ctx: Omit<IntegrationOAuthContext, 'state'>,
): string {
  const state = randomUUID();
  const payload = Buffer.from(JSON.stringify({ ...ctx, state }), 'utf8').toString('base64url');
  const signature = sign(payload);
  res.cookie(COOKIE, `${payload}.${signature}`, cookieBase());
  return state;
}

export function consumeIntegrationOAuthContext(
  res: Response,
  cookieHeader: string | undefined,
  queryState: string | undefined,
): IntegrationOAuthContext | null {
  res.clearCookie(COOKIE, cookieBase());

  if (!cookieHeader || !queryState) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;

  const [payload, signature] = decodeURIComponent(match[1]).split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as IntegrationOAuthContext;
    if (parsed.state !== queryState) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function integrationOAuthRedirectUrl(success: boolean, provider: string): string {
  const base = process.env.WEB_URL ?? 'http://localhost:3000';
  const path = '/onboarding';
  const params = new URLSearchParams({
    integration: provider,
    status: success ? 'connected' : 'error',
  });
  return `${base}${path}?${params.toString()}`;
}
