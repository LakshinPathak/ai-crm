import { Router } from 'express';
import { handleGongWebhook } from './gong.js';

/** HubSpot POST is registered in create-app.ts with express.raw() for signature verification. */

export const webhooksRouter = Router();

webhooksRouter.post('/gong/:connectionId', handleGongWebhook);

webhooksRouter.get('/_stub', (_req, res) => {
  res.json({
    module: 'webhooks',
    apiModule: 'M15',
    status: 'ok',
    endpoints: [
      'POST /hubspot (raw body, v3 signature)',
      'POST /gong/:connectionId',
    ],
  });
});
