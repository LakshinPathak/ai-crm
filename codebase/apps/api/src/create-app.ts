import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDb } from '@ai-crm/db';
import { correlationIdMiddleware } from './lib/logger.js';
import { jwtMiddleware, requireWorkspace } from './lib/auth/index.js';
import { handleHubSpotWebhook } from './modules/webhooks/hubspot.js';
import { handleGongWebhook } from './modules/webhooks/gong.js';
import { handleSlackInteractions } from './modules/webhooks/slack-interactions.js';
import { handleSlackCommands } from './modules/webhooks/slack-commands.js';
import { handleAgentWebhook } from './modules/agents/webhook.js';
import {
  authPublicRouter,
  authProtectedRouter,
  onboardingRouter,
  dealsRouter,
  meddpiccRouter,
  aiRouter,
  homeRouter,
  focusRouter,
  approvalsRouter,
  agentsRouter,
  agentTemplatesRouter,
  agentRunsRouter,
  integrationsCrmRouter,
  integrationsChatRouter,
  integrationsRouter,
  oauthRouter,
  webhooksRouter,
  companiesRouter,
  pipelineRouter,
  insightsRouter,
  marketingRouter,
  internalRouter,
  callsRouter,
  settingsRouter,
} from './routers.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true }));
  app.use(cookieParser());
  app.use(correlationIdMiddleware());

  app.post(
    '/api/v1/webhooks/hubspot',
    express.raw({ type: 'application/json' }),
    handleHubSpotWebhook,
  );

  app.post(
    '/api/v1/webhooks/gong/:connectionId',
    express.raw({ type: 'application/json' }),
    handleGongWebhook,
  );

  app.post(
    '/api/v1/agents/:agentId/webhook',
    express.raw({ type: 'application/json' }),
    handleAgentWebhook,
  );

  app.post(
    '/api/v1/webhooks/slack/interactions',
    express.raw({ type: 'application/x-www-form-urlencoded' }),
    (req, res) => {
      void handleSlackInteractions(req, res);
    },
  );

  app.post(
    '/api/v1/webhooks/slack/commands',
    express.raw({ type: 'application/x-www-form-urlencoded' }),
    (req, res) => {
      void handleSlackCommands(req, res);
    },
  );

  app.use('/api/v1/webhooks', webhooksRouter);

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    let mongo = 'disconnected';
    try {
      const conn = await connectDb();
      mongo = conn.readyState === 1 ? 'connected' : 'connecting';
    } catch {
      mongo = 'error';
    }
    res.json({ status: 'ok', service: 'api', mongo });
  });

  app.use('/api/v1/auth', authPublicRouter);
  app.use('/api/v1', authProtectedRouter);
  app.use('/api/v1/leads', marketingRouter);
  app.use('/api/v1/oauth', oauthRouter);
  app.use('/api/v1/internal', internalRouter);

  const protectedApi = express.Router();
  protectedApi.use(jwtMiddleware);
  protectedApi.use(requireWorkspace);
  protectedApi.use('/onboarding', onboardingRouter);
  protectedApi.use('/deals', dealsRouter);
  protectedApi.use('/companies', companiesRouter);
  protectedApi.use('/pipeline', pipelineRouter);
  protectedApi.use(meddpiccRouter);
  protectedApi.use('/ai', aiRouter);
  protectedApi.use('/home', homeRouter);
  protectedApi.use('/focus', focusRouter);
  protectedApi.use('/approvals', approvalsRouter);
  protectedApi.use('/agent-templates', agentTemplatesRouter);
  protectedApi.use('/agents', agentsRouter);
  protectedApi.use('/agent-runs', agentRunsRouter);
  protectedApi.use('/integrations/crm', integrationsCrmRouter);
  protectedApi.use('/integrations/chat', integrationsChatRouter);
  protectedApi.use('/integrations', integrationsRouter);
  protectedApi.use('/insights', insightsRouter);
  protectedApi.use('/calls', callsRouter);
  protectedApi.use('/settings', settingsRouter);
  app.use('/api/v1', protectedApi);

  return app;
}
