import type { Request, Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import { isValidObjectId } from 'mongoose';
import { addIngestCallJob } from '../../lib/queues/ingest-call.js';
import { getGongWebhookRawBody, verifyIncomingGongWebhook } from '../../lib/gong-signature.js';
import { readWebhookSecret } from '../../lib/integrations/webhook-secret.js';
import { log } from '../../lib/logger.js';

/** Minimal Gong webhook payload shape. */
type GongWebhookPayload = {
  eventType?: string;
  callId?: string;
  callIds?: string[];
  metaData?: Record<string, unknown>;
  callData?: {
    metaData?: Record<string, unknown>;
  };
};

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function extractCallId(payload: GongWebhookPayload): string | null {
  const metaData = payload.callData?.metaData ?? payload.metaData;
  return payload.callId ?? payload.callIds?.[0] ?? (typeof metaData?.id === 'string' ? metaData.id : null);
}

export async function handleGongWebhook(req: Request, res: Response) {
  const connectionId = paramId(req.params.connectionId);

  if (!connectionId || !isValidObjectId(connectionId)) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    return;
  }

  const connection = await IntegrationConnection.findOne({
    _id: connectionId,
    providerKey: 'gong',
    status: { $ne: 'disconnected' },
  });

  if (!connection) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    return;
  }

  const auth = verifyIncomingGongWebhook(req, readWebhookSecret(connection.settings));
  if (!auth.ok) {
    log('webhooks', 'gong auth failed', { connectionId, reason: auth.reason });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: auth.reason } });
    return;
  }

  const rawBody = getGongWebhookRawBody(req);

  let payload: GongWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as GongWebhookPayload;
  } catch {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } });
    return;
  }

  const eventType = payload.eventType ?? 'unknown';
  const callId = extractCallId(payload);
  const workspaceId = String(connection.workspaceId);

  log('webhooks', 'gong event received', {
    connectionId,
    workspaceId,
    eventType,
    callId,
    verified: req.header('x-gong-signature') ? 'hmac' : 'internal-or-dev',
  });

  const jobData = {
    connectionId,
    workspaceId,
    eventType,
    callId,
    payload: payload as Record<string, unknown>,
  };

  void addIngestCallJob(jobData).catch((err) => {
    log('webhooks', 'gong enqueue failed', {
      connectionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  res.status(202).json({
    status: 'accepted',
    eventType,
    callId,
  });
}
