import { Router } from 'express';
import {
  connectGoogleChat,
  connectSlack,
  connectTeams,
  disconnectGoogleChat,
  disconnectSlack,
  disconnectTeams,
  getGoogleChatStatus,
  getSlackStatus,
  getTeamsStatus,
  listChatProviders,
  listGoogleChatChannelsHandler,
  listTeamsChannelsHandler,
} from './handlers.js';

export const integrationsChatRouter = Router();

integrationsChatRouter.get('/providers', listChatProviders);
integrationsChatRouter.post('/slack/connect', connectSlack);
integrationsChatRouter.get('/slack/status', getSlackStatus);
integrationsChatRouter.delete('/slack', disconnectSlack);
integrationsChatRouter.post('/teams/connect', connectTeams);
integrationsChatRouter.get('/teams/status', getTeamsStatus);
integrationsChatRouter.get('/teams/channels', listTeamsChannelsHandler);
integrationsChatRouter.delete('/teams', disconnectTeams);
integrationsChatRouter.post('/google_chat/connect', connectGoogleChat);
integrationsChatRouter.get('/google_chat/status', getGoogleChatStatus);
integrationsChatRouter.get('/google_chat/channels', listGoogleChatChannelsHandler);
integrationsChatRouter.delete('/google_chat', disconnectGoogleChat);
