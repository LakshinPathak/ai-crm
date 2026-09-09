import { Router } from 'express';
import {
  handleCrmOAuthCallback,
  handleGongOAuthCallback,
  handleGoogleChatOAuthCallback,
  handleSlackOAuthCallback,
  handleTeamsOAuthCallback,
} from './handlers.js';

export const oauthRouter = Router();

oauthRouter.get('/callback/crm/:provider', (req, res) => {
  void handleCrmOAuthCallback(req, res);
});

oauthRouter.get('/callback/chat/slack', (req, res) => {
  void handleSlackOAuthCallback(req, res);
});

oauthRouter.get('/callback/chat/teams', (req, res) => {
  void handleTeamsOAuthCallback(req, res);
});

oauthRouter.get('/callback/chat/google_chat', (req, res) => {
  void handleGoogleChatOAuthCallback(req, res);
});

oauthRouter.get('/callback/gong', (req, res) => {
  void handleGongOAuthCallback(req, res);
});
