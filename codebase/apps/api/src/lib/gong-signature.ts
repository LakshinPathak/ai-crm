import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export function getGongWebhookRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body ?? {});
}

export function verifyGongWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac('sha256', params.secret).update(params.rawBody, 'utf8').digest('base64');

  const sigBuf = Buffer.from(params.signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

export function resolveGongWebhookSecret(connectionSecret?: string | null): string | null {
  if (connectionSecret) return connectionSecret;
  return process.env.GONG_WEBHOOK_SECRET ?? null;
}

export function verifyIncomingGongWebhook(
  req: Request,
  connectionSecret?: string | null,
): { ok: true } | { ok: false; reason: string } {
  const rawBody = getGongWebhookRawBody(req);
  const signature = req.header('x-gong-signature');
  const secret = resolveGongWebhookSecret(connectionSecret);

  if (signature && secret) {
    const valid = verifyGongWebhookSignature({ rawBody, signature, secret });
    return valid ? { ok: true } : { ok: false, reason: 'Invalid Gong signature' };
  }

  const internalSecret = req.header('x-ai-crm-secret');
  if (internalSecret) {
    const expected = process.env.GONG_WEBHOOK_SECRET ?? process.env.AI_CRM_WEBHOOK_SECRET;
    if (!expected) {
      return { ok: false, reason: 'Internal webhook secret not configured' };
    }
    if (internalSecret !== expected) {
      return { ok: false, reason: 'Invalid internal webhook secret' };
    }
    return { ok: true };
  }

  if (process.env.NODE_ENV !== 'production' && !secret) {
    return { ok: true };
  }

  return { ok: false, reason: 'Missing Gong signature or webhook secret' };
}
