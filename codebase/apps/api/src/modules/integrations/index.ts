import { Router } from 'express';
import {
  connectGong,
  disconnectGong,
  getGongStatus,
  listPlatformIntegrations,
} from './handlers.js';

export const integrationsRouter = Router();

integrationsRouter.get('/providers', listPlatformIntegrations);
integrationsRouter.post('/gong/connect', connectGong);
integrationsRouter.get('/gong/status', getGongStatus);
integrationsRouter.delete('/gong', disconnectGong);
