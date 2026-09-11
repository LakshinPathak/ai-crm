import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_SEC = 60 * 5;

export function verifySlackRequestSignature(
  signingSecret: string,
  signature: string | undefined,
  timestamp: string | undefined,
  rawBody: string,
): { ok: true } | { ok: false; reason: string } {
  if (!signingSecret.trim()) {
    return { ok: false, reason: 'SLACK_SIGNING_SECRET not configured' };
  }
  if (!signature?.startsWith('v0=') || !timestamp) {
    return { ok: false, reason: 'Missing Slack signature headers' };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: 'Invalid Slack request timestamp' };
  }
  const ageSec = Math.abs(Date.now() / 1000 - ts);
  if (ageSec > MAX_AGE_SEC) {
    return { ok: false, reason: 'Stale Slack request timestamp' };
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac('sha256', signingSecret).update(base).digest('hex');
  const expected = `v0=${digest}`;

  try {
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'Invalid Slack signature' };
    }
  } catch {
    return { ok: false, reason: 'Invalid Slack signature' };
  }

  return { ok: true };
}
