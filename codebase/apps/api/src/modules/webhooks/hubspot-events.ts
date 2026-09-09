import type { Request } from 'express';

export type HubSpotEvent = {
  eventId?: number;
  subscriptionType?: string;
  objectType?: string;
  objectId?: number;
  propertyName?: string;
  propertyValue?: string;
  portalId?: number;
};

export function getWebhookRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body ?? {});
}

export function parseHubSpotWebhookPayload(
  rawBody: string,
): { ok: true; events: HubSpotEvent[] } | { ok: false; reason: string } {
  let payload: { events?: HubSpotEvent[]; source?: string } | HubSpotEvent[];
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return { ok: false, reason: 'Invalid JSON body' };
  }

  const events: HubSpotEvent[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.events)
      ? payload.events
      : [];

  return { ok: true, events };
}

export function partitionHubSpotEvents(events: HubSpotEvent[]) {
  const dealEvents = events.filter(
    (e) => e.objectType === 'deal' || e.subscriptionType?.includes('deal'),
  );
  const contactEvents = events.filter(
    (e) => e.objectType === 'contact' || e.subscriptionType?.includes('contact'),
  );

  return { dealEvents, contactEvents };
}
