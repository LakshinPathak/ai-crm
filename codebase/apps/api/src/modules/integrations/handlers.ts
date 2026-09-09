import type { Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { gongOAuthConfigured } from '../../lib/integrations/gong-oauth.js';
import { ensureWebhookSecret } from '../../lib/integrations/webhook-secret.js';
import { startGongOAuth } from '../oauth/handlers.js';

export async function listPlatformIntegrations(_req: AuthedRequest, res: Response) {
  res.json({
    integrations: [
      {
        id: 'gong',
        name: 'Gong',
        category: 'conversation_intelligence',
        status: gongOAuthConfigured() ? 'available' : 'needs_config',
      },
    ],
  });
}

export async function connectGong(req: AuthedRequest, res: Response) {
  if (!gongOAuthConfigured()) {
    res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Set GONG_CLIENT_ID and GONG_CLIENT_SECRET to enable Gong OAuth.',
      },
    });
    return;
  }

  const existing = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey: 'gong',
  });
  const settings = ensureWebhookSecret({
    provider: 'gong',
    ...(existing?.settings && typeof existing.settings === 'object'
      ? (existing.settings as Record<string, unknown>)
      : {}),
  });

  await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey: 'gong' },
    { status: 'pending', settings },
    { upsert: true },
  );

  const authUrl = startGongOAuth(res, req.tenant!.workspaceId, req.tenant!.userId);
  if (!authUrl) {
    res.status(500).json({ error: { code: 'OAUTH_START_FAILED', message: 'Could not start Gong OAuth' } });
    return;
  }

  res.json({ authUrl, provider: 'gong' });
}

export async function getGongStatus(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey: 'gong',
  });
  res.json({
    connected: conn?.status === 'connected',
    provider: 'gong',
    externalAccountId: conn?.externalAccountId ?? null,
    apiBaseUrl: (conn?.settings as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ?? null,
  });
}

export async function disconnectGong(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey: 'gong' },
    { status: 'disconnected', encryptedAccessToken: null, encryptedRefreshToken: null },
    { new: true },
  );
  if (!conn) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Gong connection not found' } });
    return;
  }
  res.json({ disconnected: true, provider: 'gong' });
}
