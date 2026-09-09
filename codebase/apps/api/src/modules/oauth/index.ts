import { Router } from 'express';
import {
  handleCrmOAuthCallback,
  handleGongOAuthCallback,
  handleSlackOAuthCallback,
} from './handlers.js';

export const oauthRouter = Router();

oauthRouter.get('/callback/crm/:provider', (req, res) => {
  void handleCrmOAuthCallback(req, res);
});

oauthRouter.get('/callback/chat/slack', (req, res) => {
  void handleSlackOAuthCallback(req, res);
});

oauthRouter.get('/callback/gong', (req, res) => {
  void handleGongOAuthCallback(req, res);
});
