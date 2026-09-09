import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PREFIX = 'sha256=';

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

export function ensureConnectionWebhookSecret(
  settings: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const existing = settings ?? {};
  const current = existing.webhookSecret;
  if (typeof current === 'string' && current.length > 0) {
    return existing;
  }
  return { ...existing, webhookSecret: generateWebhookSecret() };
}

export function resolveWebhookSecret(settings: unknown): string | null {
  const fromSettings =
    settings && typeof settings === 'object' && 'webhookSecret' in settings
      ? (settings as { webhookSecret?: unknown }).webhookSecret
      : undefined;
  if (typeof fromSettings === 'string' && fromSettings.length > 0) {
    return fromSettings;
  }
  const fallback = process.env.WEBHOOK_HMAC_SECRET;
  return fallback && fallback.length > 0 ? fallback : null;
}

export function computeCrmWebhookSignature(rawBody: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return `${SIGNATURE_PREFIX}${digest}`;
}

export function verifyCrmWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = computeCrmWebhookSignature(rawBody, secret);
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}
