import { randomBytes } from 'node:crypto';

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

export function ensureWebhookSecret(settings: Record<string, unknown> | undefined | null): Record<string, unknown> {
  const base = settings && typeof settings === 'object' ? { ...settings } : {};
  if (typeof base.webhookSecret === 'string' && base.webhookSecret.length > 0) {
    return base;
  }
  return { ...base, webhookSecret: generateWebhookSecret() };
}

export function readWebhookSecret(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object') return null;
  const secret = (settings as { webhookSecret?: unknown }).webhookSecret;
  return typeof secret === 'string' && secret.length > 0 ? secret : null;
}
