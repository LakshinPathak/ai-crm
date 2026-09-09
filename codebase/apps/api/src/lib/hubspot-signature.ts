import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

const QUERY_DECODE_MAP: Record<string, string> = {
  '%3A': ':',
  '%2F': '/',
  '%3F': '?',
  '%40': '@',
  '%21': '!',
  '%24': '$',
  '%27': "'",
  '%28': '(',
  '%29': ')',
  '%2A': '*',
  '%2C': ',',
  '%3B': ';',
};

/** Decode query-string encodings per HubSpot v3 signature spec. */
export function decodeHubSpotRequestUri(hostname: string, url: string): string {
  let uri = `https://${hostname}${url.split('#')[0]}`;
  const queryPos = uri.indexOf('?');
  if (queryPos === -1) return uri;

  const path = uri.slice(0, queryPos + 1);
  const query = uri.slice(queryPos + 1).replace(
    /%3A|%2F|%3F|%40|%21|%24|%27|%28|%29|%2A|%2C|%3B/g,
    (m) => QUERY_DECODE_MAP[m] ?? m,
  );
  return path + query;
}

export function verifyHubSpotSignatureV3(params: {
  method: string;
  requestUri: string;
  rawBody: string;
  timestamp: string;
  signature: string;
  clientSecret: string;
}): boolean {
  const ts = Number(params.timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_TIMESTAMP_DRIFT_MS) {
    return false;
  }

  const rawString = `${params.method}${params.requestUri}${params.rawBody}${params.timestamp}`;
  const expected = createHmac('sha256', params.clientSecret).update(rawString, 'utf8').digest('base64');

  const sigBuf = Buffer.from(params.signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

export function getHubSpotWebhookRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body ?? '');
}

export function verifyIncomingHubSpotWebhook(req: Request): { ok: true } | { ok: false; reason: string } {
  const signatureV3 = req.header('x-hubspot-signature-v3');
  const timestamp = req.header('x-hubspot-request-timestamp');
  const internalSecret = req.header('x-ai-crm-secret');
  const rawBody = getHubSpotWebhookRawBody(req);

  if (signatureV3 && timestamp) {
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientSecret) {
      return { ok: false, reason: 'HUBSPOT_CLIENT_SECRET not configured' };
    }

    const hostname =
      process.env.HUBSPOT_WEBHOOK_PUBLIC_HOST ??
      req.header('x-forwarded-host')?.split(',')[0]?.trim() ??
      req.hostname;
    const requestUri = decodeHubSpotRequestUri(hostname, req.originalUrl);

    const valid = verifyHubSpotSignatureV3({
      method: req.method,
      requestUri,
      rawBody,
      timestamp,
      signature: signatureV3,
      clientSecret,
    });
    return valid ? { ok: true } : { ok: false, reason: 'Invalid HubSpot v3 signature' };
  }

  if (internalSecret) {
    const expected = process.env.HUBSPOT_WEBHOOK_SECRET ?? process.env.AI_CRM_WEBHOOK_SECRET;
    if (!expected) {
      return { ok: false, reason: 'Internal webhook secret not configured' };
    }
    if (internalSecret !== expected) {
      return { ok: false, reason: 'Invalid internal webhook secret' };
    }
    return { ok: true };
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.HUBSPOT_CLIENT_SECRET) {
    return { ok: true };
  }

  return { ok: false, reason: 'Missing HubSpot signature or internal secret' };
}
