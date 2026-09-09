import type { Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { slackOAuthConfigured } from '../../lib/integrations/slack-oauth.js';
import { startSlackOAuth } from '../oauth/handlers.js';

export async function listChatProviders(_req: AuthedRequest, res: Response) {
  res.json({
    providers: [
      {
        id: 'slack',
        name: 'Slack',
        status: slackOAuthConfigured() ? 'available' : 'needs_config',
      },
      { id: 'teams', name: 'Microsoft Teams', status: 'coming_soon' },
      { id: 'google_chat', name: 'Google Chat', status: 'coming_soon' },
    ],
  });
}

export async function connectSlack(req: AuthedRequest, res: Response) {
  if (!slackOAuthConfigured()) {
    res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to enable Slack OAuth.',
      },
    });
    return;
  }

  await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey: 'slack' },
    { status: 'pending', settings: { provider: 'slack' } },
    { upsert: true },
  );

  const authUrl = startSlackOAuth(res, req.tenant!.workspaceId, req.tenant!.userId);
  if (!authUrl) {
    res.status(500).json({ error: { code: 'OAUTH_START_FAILED', message: 'Could not start Slack OAuth' } });
    return;
  }

  res.json({ authUrl, provider: 'slack' });
}

export async function getSlackStatus(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey: 'slack',
  });
  res.json({
    connected: conn?.status === 'connected',
    provider: 'slack',
    externalAccountId: conn?.externalAccountId ?? null,
    lastSyncAt: conn?.lastSyncAt ?? null,
  });
}

export async function disconnectSlack(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey: 'slack' },
    { status: 'disconnected', encryptedAccessToken: null, encryptedRefreshToken: null },
    { new: true },
  );
  if (!conn) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Slack connection not found' } });
    return;
  }
  res.json({ disconnected: true, provider: 'slack' });
}
