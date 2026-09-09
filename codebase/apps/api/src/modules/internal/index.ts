import { Router } from 'express';
import { internalServiceMiddleware } from '../../lib/auth/internal-service.js';
import { executeAgent } from './handlers.js';

/** Module M20 — worker callbacks (service token auth) */
export const internalRouter = Router();

internalRouter.use(internalServiceMiddleware);
internalRouter.post('/agent/execute', executeAgent);
