import type { Request, Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import { isValidObjectId } from 'mongoose';
import { log } from '../../lib/logger.js';
import { resolveWebhookSecret, verifyCrmWebhookSignature } from '../../lib/webhook-hmac.js';
import {
  getWebhookRawBody,
  parseHubSpotWebhookPayload,
  partitionHubSpotEvents,
} from './hubspot-events.js';

const CRM_PROVIDER_KEYS = ['hubspot', 'salesforce', 'zoho', 'pipedrive'];

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function handleCrmWebhook(req: Request, res: Response) {
  const connectionId = paramId(req.params.connectionId);

  if (!connectionId || !isValidObjectId(connectionId)) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    return;
  }

  const connection = await IntegrationConnection.findOne({
    _id: connectionId,
    providerKey: { $in: CRM_PROVIDER_KEYS },
    status: { $ne: 'disconnected' },
  });

  if (!connection) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    return;
  }

  const rawBody = getWebhookRawBody(req);
  const secret = resolveWebhookSecret(connection.settings);

  if (secret) {
    const signature = req.header('x-crm-signature');
    if (!verifyCrmWebhookSignature(rawBody, signature, secret)) {
      log('webhooks', 'crm auth failed', { connectionId, reason: 'Invalid HMAC signature' });
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
      return;
    }
  } else if (process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Webhook secret not configured' } });
    return;
  }

  const parsed = parseHubSpotWebhookPayload(rawBody);
  if (!parsed.ok) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.reason } });
    return;
  }

  const { dealEvents, contactEvents } = partitionHubSpotEvents(parsed.events);
  const workspaceId = String(connection.workspaceId);

  log('webhooks', 'crm events received', {
    connectionId,
    workspaceId,
    provider: connection.providerKey,
    total: parsed.events.length,
    deals: dealEvents.length,
    contacts: contactEvents.length,
  });

  res.status(202).json({
    status: 'accepted',
    received: parsed.events.length,
    dealEvents: dealEvents.length,
    contactEvents: contactEvents.length,
    workspaceId,
    provider: connection.providerKey,
  });
}
