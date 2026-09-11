import type { Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { googleChatOAuthConfigured } from '../../lib/integrations/google-chat-oauth.js';
import { listGoogleChatSpaces } from '../../lib/integrations/google-chat-api.js';
import { slackOAuthConfigured } from '../../lib/integrations/slack-oauth.js';
import { listTeamsChannels } from '../../lib/integrations/teams-api.js';
import { teamsOAuthConfigured } from '../../lib/integrations/teams-oauth.js';
import {
  startGoogleChatOAuth,
  startSlackOAuth,
  startTeamsOAuth,
} from '../oauth/handlers.js';

type ChatProviderKey = 'slack' | 'teams' | 'google_chat';

const CHAT_PROVIDER_CONFIG: Record<
  ChatProviderKey,
  {
    name: string;
    configured: () => boolean;
    envMessage: string;
    startOAuth: (res: Response, workspaceId: string, userId: string) => string | null;
  }
> = {
  slack: {
    name: 'Slack',
    configured: slackOAuthConfigured,
    envMessage: 'Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to enable Slack OAuth.',
    startOAuth: startSlackOAuth,
  },
  teams: {
    name: 'Microsoft Teams',
    configured: teamsOAuthConfigured,
    envMessage: 'Set TEAMS_CLIENT_ID and TEAMS_CLIENT_SECRET to enable Teams OAuth.',
    startOAuth: startTeamsOAuth,
  },
  google_chat: {
    name: 'Google Chat',
    configured: googleChatOAuthConfigured,
    envMessage:
      'Set GOOGLE_CHAT_CLIENT_ID and GOOGLE_CHAT_CLIENT_SECRET (or reuse GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) to enable Google Chat OAuth.',
    startOAuth: startGoogleChatOAuth,
  },
};

export async function listChatProviders(_req: AuthedRequest, res: Response) {
  res.json({
    providers: (Object.entries(CHAT_PROVIDER_CONFIG) as Array<[ChatProviderKey, (typeof CHAT_PROVIDER_CONFIG)[ChatProviderKey]]>).map(
      ([id, cfg]) => ({
        id,
        name: cfg.name,
        status: cfg.configured() ? 'available' : 'needs_config',
      }),
    ),
  });
}

async function connectChatProvider(req: AuthedRequest, res: Response, providerKey: ChatProviderKey) {
  const cfg = CHAT_PROVIDER_CONFIG[providerKey];
  if (!cfg.configured()) {
    res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: cfg.envMessage,
      },
    });
    return;
  }

  await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey },
    { status: 'pending', settings: { provider: providerKey } },
    { upsert: true },
  );

  const authUrl = cfg.startOAuth(res, req.tenant!.workspaceId, req.tenant!.userId);
  if (!authUrl) {
    res.status(500).json({
      error: { code: 'OAUTH_START_FAILED', message: `Could not start ${cfg.name} OAuth` },
    });
    return;
  }

  res.json({ authUrl, provider: providerKey });
}

async function getChatProviderStatus(req: AuthedRequest, res: Response, providerKey: ChatProviderKey) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey,
  });
  res.json({
    connected: conn?.status === 'connected',
    provider: providerKey,
    externalAccountId: conn?.externalAccountId ?? null,
    lastSyncAt: conn?.lastSyncAt ?? null,
  });
}

async function disconnectChatProvider(req: AuthedRequest, res: Response, providerKey: ChatProviderKey) {
  const cfg = CHAT_PROVIDER_CONFIG[providerKey];
  const conn = await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey },
    { status: 'disconnected', encryptedAccessToken: null, encryptedRefreshToken: null },
    { new: true },
  );
  if (!conn) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `${cfg.name} connection not found` },
    });
    return;
  }
  res.json({ disconnected: true, provider: providerKey });
}

export async function connectSlack(req: AuthedRequest, res: Response) {
  await connectChatProvider(req, res, 'slack');
}

export async function connectTeams(req: AuthedRequest, res: Response) {
  await connectChatProvider(req, res, 'teams');
}

export async function connectGoogleChat(req: AuthedRequest, res: Response) {
  await connectChatProvider(req, res, 'google_chat');
}

export async function getSlackStatus(req: AuthedRequest, res: Response) {
  await getChatProviderStatus(req, res, 'slack');
}

export async function getTeamsStatus(req: AuthedRequest, res: Response) {
  await getChatProviderStatus(req, res, 'teams');
}

export async function getGoogleChatStatus(req: AuthedRequest, res: Response) {
  await getChatProviderStatus(req, res, 'google_chat');
}

export async function disconnectSlack(req: AuthedRequest, res: Response) {
  await disconnectChatProvider(req, res, 'slack');
}

export async function disconnectTeams(req: AuthedRequest, res: Response) {
  await disconnectChatProvider(req, res, 'teams');
}

export async function disconnectGoogleChat(req: AuthedRequest, res: Response) {
  await disconnectChatProvider(req, res, 'google_chat');
}

export async function listTeamsChannelsHandler(req: AuthedRequest, res: Response) {
  if (!teamsOAuthConfigured()) {
    res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: CHAT_PROVIDER_CONFIG.teams.envMessage,
      },
    });
    return;
  }
  const channels = await listTeamsChannels(req.tenant!.workspaceId);
  res.json({ channels });
}

export async function listGoogleChatChannelsHandler(req: AuthedRequest, res: Response) {
  if (!googleChatOAuthConfigured()) {
    res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: CHAT_PROVIDER_CONFIG.google_chat.envMessage,
      },
    });
    return;
  }
  const channels = await listGoogleChatSpaces(req.tenant!.workspaceId);
  res.json({ channels });
}
