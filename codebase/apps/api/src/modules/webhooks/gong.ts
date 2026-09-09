import type { Request, Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import { isValidObjectId } from 'mongoose';
import { addIngestCallJob } from '../../lib/queues/ingest-call.js';
import { log } from '../../lib/logger.js';

/** Minimal Gong webhook payload shape (stub — full schema when ingest-call worker lands). */
type GongWebhookPayload = {
  eventType?: string;
  callId?: string;
  callIds?: string[];
  metaData?: Record<string, unknown>;
};

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
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

  const rawBody =
    typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body)
      : JSON.stringify(req.body ?? {});

  let payload: GongWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as GongWebhookPayload;
  } catch {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } });
    return;
  }

  const eventType = payload.eventType ?? 'unknown';
  const callId = payload.callId ?? payload.callIds?.[0] ?? null;

  const workspaceId = String(connection.workspaceId);

  log('webhooks', 'gong event received', {
    connectionId,
    workspaceId,
    eventType,
    callId,
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
