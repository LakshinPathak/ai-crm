import { Router } from 'express';
import {
  connectSlack,
  disconnectSlack,
  getSlackStatus,
  listChatProviders,
} from './handlers.js';

export const integrationsChatRouter = Router();

integrationsChatRouter.get('/providers', listChatProviders);
integrationsChatRouter.post('/slack/connect', connectSlack);
integrationsChatRouter.get('/slack/status', getSlackStatus);
integrationsChatRouter.delete('/slack', disconnectSlack);
