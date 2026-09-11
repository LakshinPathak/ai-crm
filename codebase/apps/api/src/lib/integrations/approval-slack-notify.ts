import { Approval, IntegrationConnection } from '@ai-crm/db';
import type { DeliveryConfigSchema } from '@ai-crm/shared';
import type { z } from 'zod';
import { log } from '../logger.js';
import { openSlackDmChannel, postSlackMessage, type SlackBlock } from './slack-api.js';

type DeliveryConfig = z.infer<typeof DeliveryConfigSchema>;

function webBaseUrl(): string {
  return (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function approvalReviewUrl(approvalId: string): string {
  return `${webBaseUrl()}/approvals?id=${encodeURIComponent(approvalId)}`;
}

export function buildApprovalSlackBlocks(
  approvals: Array<{ id: string; title: string; preview?: string }>,
  agentName?: string | null,
): SlackBlock[] {
  const header = agentName ? `Approval needed — ${agentName}` : 'Approval needed';
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: header, emoji: true },
    },
  ];

  for (const item of approvals.slice(0, 5)) {
    const preview = item.preview ? `\n${item.preview}` : '';
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${item.title}*${preview}`,
      },
    });
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Approve', emoji: true },
          action_id: 'approve',
          value: item.id,
          style: 'primary',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reject', emoji: true },
          action_id: 'reject',
          value: item.id,
          style: 'danger',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open in app', emoji: true },
          url: approvalReviewUrl(item.id),
        },
      ],
    });
  }

  if (approvals.length > 5) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_+${approvals.length - 5} more pending — open the approvals queue._`,
        },
      ],
    });
  }

  return blocks;
}

async function isSlackConnected(workspaceId: string): Promise<boolean> {
  const conn = await IntegrationConnection.findOne({ workspaceId, providerKey: 'slack' });
  return conn?.status === 'connected';
}

async function resolveSlackChannelId(
  workspaceId: string,
  deliveryConfig?: DeliveryConfig | null,
): Promise<string | null> {
  const envChannel = process.env.SLACK_APPROVALS_CHANNEL_ID?.trim();
  if (envChannel) return envChannel;

  if (deliveryConfig?.provider !== 'slack') return null;
  if (deliveryConfig.channelId?.trim()) return deliveryConfig.channelId.trim();

  const dmUserId = deliveryConfig.dmUserId?.trim();
  if (dmUserId) {
    return openSlackDmChannel(workspaceId, dmUserId);
  }

  return null;
}

function previewText(contentPreview: unknown): string | undefined {
  if (!contentPreview || typeof contentPreview !== 'object') return undefined;
  const summary = (contentPreview as { summary?: string }).summary;
  return typeof summary === 'string' && summary.trim() ? summary.trim() : undefined;
}

export async function notifyPendingApprovalsSlack(params: {
  workspaceId: string;
  agentRunId: string;
  agentName?: string | null;
  deliveryConfig?: DeliveryConfig | null;
}): Promise<void> {
  const { workspaceId, agentRunId, agentName, deliveryConfig } = params;

  if (deliveryConfig?.includeApproveButtons === false) {
    log('approval-slack', 'skip: includeApproveButtons disabled', { workspaceId, agentRunId });
    return;
  }

  const connected = await isSlackConnected(workspaceId);
  if (!connected) {
    log('approval-slack', 'skip: Slack not connected', { workspaceId, agentRunId });
    return;
  }

  const channelId = await resolveSlackChannelId(workspaceId, deliveryConfig);
  if (!channelId) {
    log('approval-slack', 'skip: no Slack channel for approvals', { workspaceId, agentRunId });
    return;
  }

  const pending = await Approval.find({
    workspaceId,
    agentRunId,
    status: 'pending',
  }).sort({ createdAt: 1 });

  if (pending.length === 0) {
    return;
  }

  const items = pending.map((a) => ({
    id: a.id,
    title: a.title,
    preview: previewText(a.contentPreview),
  }));

  const fallbackText =
    pending.length === 1
      ? `${agentName ?? 'Agent'}: approval needed — ${pending[0].title}`
      : `${agentName ?? 'Agent'}: ${pending.length} approvals needed`;

  const blocks = buildApprovalSlackBlocks(items, agentName);
  const posted = await postSlackMessage(workspaceId, channelId, fallbackText, blocks);
  if (posted) {
    log('approval-slack', 'posted approval notification', {
      workspaceId,
      agentRunId,
      channelId,
      count: pending.length,
    });
  } else {
    log('approval-slack', 'post failed', { workspaceId, agentRunId, channelId });
  }
}
