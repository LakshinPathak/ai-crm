import type { Request, Response } from 'express';
import { verifyIncomingHubSpotWebhook } from '../../lib/hubspot-signature.js';
import { log } from '../../lib/logger.js';

type HubSpotEvent = {
  subscriptionType?: string;
  objectType?: string;
  objectId?: number;
  propertyName?: string;
  propertyValue?: string;
  portalId?: number;
};

export async function handleHubSpotWebhook(req: Request, res: Response) {
  const auth = verifyIncomingHubSpotWebhook(req);
  if (!auth.ok) {
    log('webhooks', 'hubspot auth failed', { reason: auth.reason });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: auth.reason } });
    return;
  }

  const rawBody =
    typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body)
      : JSON.stringify(req.body ?? {});

  let payload: { events?: HubSpotEvent[]; source?: string } | HubSpotEvent[];
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } });
    return;
  }

  const events: HubSpotEvent[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.events)
      ? payload.events
      : [];

  const dealEvents = events.filter(
    (e) => e.objectType === 'deal' || e.subscriptionType?.includes('deal'),
  );
  const contactEvents = events.filter(
    (e) => e.objectType === 'contact' || e.subscriptionType?.includes('contact'),
  );

  log('webhooks', 'hubspot events received', {
    total: events.length,
    deals: dealEvents.length,
    contacts: contactEvents.length,
    source: Array.isArray(payload) ? 'hubspot-direct' : payload?.source ?? 'hubspot-app-function',
    verified: req.header('x-hubspot-signature-v3') ? 'v3' : 'internal-secret',
  });

  res.json({
    received: events.length,
    dealEvents: dealEvents.length,
    contactEvents: contactEvents.length,
    status: 'accepted',
  });
}
