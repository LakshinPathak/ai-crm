import type { Request, Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import { ensureConnectionWebhookSecret } from '../../lib/webhook-hmac.js';
import { buildGongAuthUrl, exchangeGongCode, gongOAuthConfigured } from '../../lib/integrations/gong-oauth.js';
import { ensureWebhookSecret } from '../../lib/integrations/webhook-secret.js';
import {
  consumeIntegrationOAuthContext,
  integrationOAuthRedirectUrl,
  issueIntegrationOAuthContext,
} from '../../lib/integrations/oauth-context.js';
import {
  buildHubSpotAuthUrl,
  exchangeHubSpotCode,
  hubspotOAuthConfigured,
} from '../../lib/integrations/hubspot-oauth.js';
import { saveTokens } from '../../lib/integrations/tokens.js';
import {
  buildGoogleChatAuthUrl,
  exchangeGoogleChatCode,
  googleChatOAuthConfigured,
} from '../../lib/integrations/google-chat-oauth.js';
import {
  buildSlackAuthUrl,
  exchangeSlackCode,
  slackOAuthConfigured,
} from '../../lib/integrations/slack-oauth.js';
import {
  buildTeamsAuthUrl,
  exchangeTeamsCode,
  teamsOAuthConfigured,
} from '../../lib/integrations/teams-oauth.js';
import { log } from '../../lib/logger.js';

export function startCrmOAuth(
  res: Response,
  workspaceId: string,
  userId: string,
  provider: string,
): string | null {
  if (provider !== 'hubspot' || !hubspotOAuthConfigured()) {
    return null;
  }
  const state = issueIntegrationOAuthContext(res, {
    workspaceId,
    userId,
    provider: 'hubspot',
    kind: 'crm',
  });
  return buildHubSpotAuthUrl(state);
}

export function startSlackOAuth(res: Response, workspaceId: string, userId: string): string | null {
  if (!slackOAuthConfigured()) {
    return null;
  }
  const state = issueIntegrationOAuthContext(res, {
    workspaceId,
    userId,
    provider: 'slack',
    kind: 'chat',
  });
  return buildSlackAuthUrl(state);
}

export function startTeamsOAuth(res: Response, workspaceId: string, userId: string): string | null {
  if (!teamsOAuthConfigured()) {
    return null;
  }
  const state = issueIntegrationOAuthContext(res, {
    workspaceId,
    userId,
    provider: 'teams',
    kind: 'chat',
  });
  return buildTeamsAuthUrl(state);
}

export function startGoogleChatOAuth(res: Response, workspaceId: string, userId: string): string | null {
  if (!googleChatOAuthConfigured()) {
    return null;
  }
  const state = issueIntegrationOAuthContext(res, {
    workspaceId,
    userId,
    provider: 'google_chat',
    kind: 'chat',
  });
  return buildGoogleChatAuthUrl(state);
}

export function startGongOAuth(res: Response, workspaceId: string, userId: string): string | null {
  if (!gongOAuthConfigured()) {
    return null;
  }
  const state = issueIntegrationOAuthContext(res, {
    workspaceId,
    userId,
    provider: 'gong',
    kind: 'gong',
  });
  return buildGongAuthUrl(state);
}

export async function handleCrmOAuthCallback(req: Request, res: Response): Promise<void> {
  const provider = req.params.provider as string;
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined;

  if (oauthError || !code || !state) {
    res.redirect(integrationOAuthRedirectUrl(false, provider));
    return;
  }

  const ctx = consumeIntegrationOAuthContext(res, req.headers.cookie, state);
  if (!ctx || ctx.kind !== 'crm' || ctx.provider !== provider) {
    res.redirect(integrationOAuthRedirectUrl(false, provider));
    return;
  }

  try {
    if (provider === 'hubspot' && hubspotOAuthConfigured()) {
      const tokens = await exchangeHubSpotCode(code);
      const existing = await IntegrationConnection.findOne({
        workspaceId: ctx.workspaceId,
        providerKey: 'hubspot',
      });
      const settings = ensureConnectionWebhookSecret(
        (existing?.settings ?? {}) as Record<string, unknown>,
      );
      await IntegrationConnection.findOneAndUpdate(
        { workspaceId: ctx.workspaceId, providerKey: 'hubspot' },
        {
          status: 'connected',
          externalAccountId: 'oauth-hubspot',
          settings: { ...settings, mode: 'live' },
        },
        { upsert: true },
      );
      await saveTokens(ctx.workspaceId, 'hubspot', {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
      res.redirect(integrationOAuthRedirectUrl(true, provider));
      return;
    }

    res.redirect(integrationOAuthRedirectUrl(false, provider));
  } catch (err) {
    log('oauth', 'crm callback failed', {
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
    res.redirect(integrationOAuthRedirectUrl(false, provider));
  }
}

async function handleChatOAuthCallback(
  req: Request,
  res: Response,
  providerKey: 'slack' | 'teams' | 'google_chat',
): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined;

  if (oauthError || !code || !state) {
    res.redirect(integrationOAuthRedirectUrl(false, providerKey));
    return;
  }

  const ctx = consumeIntegrationOAuthContext(res, req.headers.cookie, state);
  if (!ctx || ctx.kind !== 'chat' || ctx.provider !== providerKey) {
    res.redirect(integrationOAuthRedirectUrl(false, providerKey));
    return;
  }

  try {
    const exchange =
      providerKey === 'slack'
        ? { configured: slackOAuthConfigured(), run: () => exchangeSlackCode(code) }
        : providerKey === 'teams'
          ? { configured: teamsOAuthConfigured(), run: () => exchangeTeamsCode(code) }
          : { configured: googleChatOAuthConfigured(), run: () => exchangeGoogleChatCode(code) };

    if (!exchange.configured) {
      res.redirect(integrationOAuthRedirectUrl(false, providerKey));
      return;
    }

    const tokens = await exchange.run();
    await IntegrationConnection.findOneAndUpdate(
      { workspaceId: ctx.workspaceId, providerKey },
      {
        status: 'connected',
        externalAccountId: tokens.externalAccountId ?? `${providerKey}-workspace`,
        settings: { mode: 'live', provider: providerKey },
      },
      { upsert: true },
    );
    await saveTokens(ctx.workspaceId, providerKey, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    res.redirect(integrationOAuthRedirectUrl(true, providerKey));
  } catch (err) {
    log('oauth', `${providerKey} callback failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
    res.redirect(integrationOAuthRedirectUrl(false, providerKey));
  }
}

export async function handleSlackOAuthCallback(req: Request, res: Response): Promise<void> {
  await handleChatOAuthCallback(req, res, 'slack');
}

export async function handleTeamsOAuthCallback(req: Request, res: Response): Promise<void> {
  await handleChatOAuthCallback(req, res, 'teams');
}

export async function handleGoogleChatOAuthCallback(req: Request, res: Response): Promise<void> {
  await handleChatOAuthCallback(req, res, 'google_chat');
}

export async function handleGongOAuthCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined;

  if (oauthError || !code || !state) {
    res.redirect(integrationOAuthRedirectUrl(false, 'gong'));
    return;
  }

  const ctx = consumeIntegrationOAuthContext(res, req.headers.cookie, state);
  if (!ctx || ctx.kind !== 'gong' || ctx.provider !== 'gong') {
    res.redirect(integrationOAuthRedirectUrl(false, 'gong'));
    return;
  }

  try {
    const tokens = await exchangeGongCode(code);
    const existing = await IntegrationConnection.findOne({
      workspaceId: ctx.workspaceId,
      providerKey: 'gong',
    });
    const settings = ensureWebhookSecret({
      mode: 'live',
      apiBaseUrl: tokens.apiBaseUrl,
      ...(existing?.settings && typeof existing.settings === 'object'
        ? (existing.settings as Record<string, unknown>)
        : {}),
    });
    await IntegrationConnection.findOneAndUpdate(
      { workspaceId: ctx.workspaceId, providerKey: 'gong' },
      {
        status: 'connected',
        externalAccountId: tokens.apiBaseUrl ?? 'gong-workspace',
        settings,
      },
      { upsert: true },
    );
    await saveTokens(ctx.workspaceId, 'gong', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    res.redirect(integrationOAuthRedirectUrl(true, 'gong'));
  } catch (err) {
    log('oauth', 'gong callback failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.redirect(integrationOAuthRedirectUrl(false, 'gong'));
  }
}
