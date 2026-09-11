import express, { Router } from 'express';
import { handleCrmWebhook } from './crm.js';

/** HubSpot and Gong POST routes are registered in create-app.ts with express.raw() for signature verification. */

export const webhooksRouter = Router();

webhooksRouter.post(
  '/crm/:connectionId',
  express.raw({ type: 'application/json' }),
  handleCrmWebhook,
);

webhooksRouter.get('/_stub', (_req, res) => {
  res.json({
    module: 'webhooks',
    apiModule: 'M15',
    status: 'ok',
    endpoints: [
      'POST /hubspot (raw body, v3 signature)',
      'POST /crm/:connectionId (raw body, X-CRM-Signature HMAC)',
      'POST /gong/:connectionId (raw body, X-Gong-Signature HMAC)',
      'POST /slack/interactions (raw body, X-Slack-Signature HMAC)',
    ],
  });
});
