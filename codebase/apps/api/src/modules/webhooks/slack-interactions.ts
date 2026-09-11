import type { Request, Response } from 'express';
import { verifySlackRequestSignature } from '../../lib/integrations/slack-signature.js';
import { log } from '../../lib/logger.js';

function getRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  return '';
}

export async function handleSlackInteractions(req: Request, res: Response): Promise<void> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';
  const rawBody = getRawBody(req);
  const auth = verifySlackRequestSignature(
    signingSecret,
    req.header('x-slack-signature'),
    req.header('x-slack-request-timestamp'),
    rawBody,
  );

  if (!auth.ok) {
    log('webhooks', 'slack interactions auth failed', { reason: auth.reason });
    res.status(401).send('invalid signature');
    return;
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get('payload');
  if (!payloadRaw) {
    res.status(400).send('missing payload');
    return;
  }

  let payload: { type?: string; actions?: Array<{ action_id?: string; value?: string }> };
  try {
    payload = JSON.parse(payloadRaw) as typeof payload;
  } catch {
    res.status(400).send('invalid payload json');
    return;
  }

  log('webhooks', 'slack interaction received', {
    type: payload.type ?? null,
    actionIds: (payload.actions ?? []).map((a) => a.action_id ?? null),
  });

  // Link buttons open WEB_URL; block_actions can be extended to call approve API with user mapping.
  res.status(200).send('');
}
