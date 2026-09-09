import { IntegrationConnection } from '@ai-crm/db';
import type { DeliveryConfigSchema } from '@ai-crm/shared';
import type { z } from 'zod';
import {
  openSlackDmChannel,
  postSlackMessage,
  type SlackBlock,
} from './integrations/slack-api.js';
import { log } from './logger.js';

export type DeliveryConfig = z.infer<typeof DeliveryConfigSchema>;

export interface DeliverAgentOutputParams {
  workspaceId: string;
  userId: string;
  agent: {
    id: string;
    name: string;
    templateSlug?: string | null;
    deliveryConfig?: DeliveryConfig | null;
  };
  result: {
    status: string;
    output: Record<string, unknown>;
  };
}

async function isChatIntegrationConnected(
  workspaceId: string,
  provider: DeliveryConfig['provider'],
): Promise<boolean> {
  if (!provider) return false;
  const conn = await IntegrationConnection.findOne({
    workspaceId,
    providerKey: provider,
  });
  return conn?.status === 'connected';
}

function extractOutputSummary(output: Record<string, unknown>): string {
  const preferredKeys = ['chatSummary', 'summary', 'message', 'digestText', 'emailSubject'];
  for (const key of preferredKeys) {
    const value = output[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(output)) {
    if (key === 'dealId' || key === 'approvalIds' || key === 'dealIds') continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`• *${key}:* ${value}`);
    }
  }

  return lines.length > 0 ? lines.slice(0, 8).join('\n') : 'Agent run completed.';
}

function buildSlackBlocks(
  agentName: string,
  status: string,
  summary: string,
  dealId?: string,
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: agentName, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Status:* ${status}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: summary },
    },
  ];

  if (dealId) {
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `<${webUrl}/deals/${dealId}|View deal>` },
    });
  }

  return blocks;
}

function readDmUserId(deliveryConfig: DeliveryConfig): string | undefined {
  const raw = deliveryConfig as DeliveryConfig & { dmUserId?: string };
  const dmUserId = raw.dmUserId;
  return typeof dmUserId === 'string' && dmUserId.trim() ? dmUserId.trim() : undefined;
}

async function resolveSlackChannelId(
  workspaceId: string,
  deliveryConfig: DeliveryConfig,
): Promise<string | null> {
  if (deliveryConfig.channelId?.trim()) {
    return deliveryConfig.channelId.trim();
  }

  const dmUserId = readDmUserId(deliveryConfig);
  if (dmUserId) {
    return openSlackDmChannel(workspaceId, dmUserId);
  }

  return null;
}

export async function deliverAgentOutput(params: DeliverAgentOutputParams): Promise<void> {
  const { workspaceId, userId, agent, result } = params;
  const deliveryConfig = agent.deliveryConfig;

  if (!deliveryConfig) {
    log('chat-delivery', 'skip: no deliveryConfig', { agentId: agent.id, workspaceId });
    return;
  }

  const connected = await isChatIntegrationConnected(workspaceId, deliveryConfig.provider);
  if (!connected) {
    log('chat-delivery', 'skip: chat integration not connected', {
      agentId: agent.id,
      workspaceId,
      provider: deliveryConfig.provider ?? null,
    });
    return;
  }

  if (deliveryConfig.provider === 'slack') {
    const channelId = await resolveSlackChannelId(workspaceId, deliveryConfig);
    if (!channelId) {
      log('chat-delivery', 'skip: no Slack channel or DM target', {
        agentId: agent.id,
        workspaceId,
        mode: deliveryConfig.mode ?? null,
      });
      return;
    }

    const summary = extractOutputSummary(result.output);
    const dealId =
      typeof result.output.dealId === 'string' && result.output.dealId.trim()
        ? result.output.dealId.trim()
        : undefined;
    const fallbackText = `${agent.name} — ${result.status}: ${summary}`;
    const blocks = buildSlackBlocks(agent.name, result.status, summary, dealId);

    const posted = await postSlackMessage(workspaceId, channelId, fallbackText, blocks);
    if (posted) {
      log('chat-delivery', 'delivered agent output to Slack', {
        workspaceId,
        userId,
        agentId: agent.id,
        channelId,
        runStatus: result.status,
      });
      return;
    }

    log('chat-delivery', 'Slack post failed — log-only fallback', {
      workspaceId,
      userId,
      agentId: agent.id,
      agentName: agent.name,
      templateSlug: agent.templateSlug ?? null,
      runStatus: result.status,
      deliveryConfig,
      outputKeys: Object.keys(result.output),
    });
    return;
  }

  log('chat-delivery', 'deliver agent output (provider not wired)', {
    workspaceId,
    userId,
    agentId: agent.id,
    agentName: agent.name,
    templateSlug: agent.templateSlug ?? null,
    runStatus: result.status,
    deliveryConfig,
    outputKeys: Object.keys(result.output),
  });
}
