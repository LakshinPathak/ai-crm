import type { Request, Response } from 'express';
import { verifyIncomingHubSpotWebhook } from '../../lib/hubspot-signature.js';
import { log } from '../../lib/logger.js';
import {
  getWebhookRawBody,
  parseHubSpotWebhookPayload,
  partitionHubSpotEvents,
} from './hubspot-events.js';

export async function handleHubSpotWebhook(req: Request, res: Response) {
  const auth = verifyIncomingHubSpotWebhook(req);
  if (!auth.ok) {
    log('webhooks', 'hubspot auth failed', { reason: auth.reason });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: auth.reason } });
    return;
  }

  const rawBody = getWebhookRawBody(req);
  const parsed = parseHubSpotWebhookPayload(rawBody);
  if (!parsed.ok) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.reason } });
    return;
  }

  const { dealEvents, contactEvents } = partitionHubSpotEvents(parsed.events);

  log('webhooks', 'hubspot events received', {
    total: parsed.events.length,
    deals: dealEvents.length,
    contacts: contactEvents.length,
    verified: req.header('x-hubspot-signature-v3') ? 'v3' : 'internal-secret',
  });

  res.json({
    received: parsed.events.length,
    dealEvents: dealEvents.length,
    contactEvents: contactEvents.length,
    status: 'accepted',
  });
}
