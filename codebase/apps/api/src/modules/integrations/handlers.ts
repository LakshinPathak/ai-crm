import type { Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { googleCalendarOAuthConfigured } from '../../lib/integrations/google-calendar-oauth.js';
import { gongOAuthConfigured } from '../../lib/integrations/gong-oauth.js';
import { ensureWebhookSecret } from '../../lib/integrations/webhook-secret.js';
import { enqueueGoogleCalendarSync } from '../../lib/queues/google-calendar-sync.js';
import { startGongOAuth, startGoogleCalendarOAuth } from '../oauth/handlers.js';

export async function listPlatformIntegrations(_req: AuthedRequest, res: Response) {
  res.json({
    integrations: [
      {
        id: 'gong',
        name: 'Gong',
        category: 'conversation_intelligence',
        status: gongOAuthConfigured() ? 'available' : 'needs_config',
      },
      {
        id: 'google_calendar',
        name: 'Google Calendar',
        category: 'calendar',
        status: googleCalendarOAuthConfigured() ? 'available' : 'needs_config',
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

export async function connectGoogleCalendar(req: AuthedRequest, res: Response) {
  if (!googleCalendarOAuthConfigured()) {
    res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message:
          'Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET (or GOOGLE_CLIENT_ID/SECRET) to enable Google Calendar OAuth.',
      },
    });
    return;
  }

  await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey: 'google_calendar' },
    { status: 'pending', settings: { provider: 'google_calendar' } },
    { upsert: true },
  );

  const authUrl = startGoogleCalendarOAuth(res, req.tenant!.workspaceId, req.tenant!.userId);
  if (!authUrl) {
    res.status(500).json({
      error: { code: 'OAUTH_START_FAILED', message: 'Could not start Google Calendar OAuth' },
    });
    return;
  }

  res.json({ authUrl, provider: 'google_calendar' });
}

export async function getGoogleCalendarStatus(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey: 'google_calendar',
  });
  res.json({
    connected: conn?.status === 'connected',
    provider: 'google_calendar',
    externalAccountId: conn?.externalAccountId ?? null,
    lastSyncAt: conn?.lastSyncAt ?? null,
    mode: (conn?.settings as { mode?: string } | undefined)?.mode ?? null,
  });
}

export async function disconnectGoogleCalendar(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey: 'google_calendar' },
    { status: 'disconnected', encryptedAccessToken: null, encryptedRefreshToken: null },
    { new: true },
  );
  if (!conn) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Google Calendar connection not found' },
    });
    return;
  }
  res.json({ disconnected: true, provider: 'google_calendar' });
}

export async function syncGoogleCalendar(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey: 'google_calendar',
    status: 'connected',
  });
  if (!conn) {
    res.status(400).json({
      error: { code: 'NOT_CONNECTED', message: 'Connect Google Calendar before syncing.' },
    });
    return;
  }

  await enqueueGoogleCalendarSync({
    workspaceId: req.tenant!.workspaceId,
    connectionId: String(conn._id),
  });
  res.status(202).json({ queued: true, provider: 'google_calendar' });
}
