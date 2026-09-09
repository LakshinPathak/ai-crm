import { IntegrationConnection } from '@ai-crm/db';
import type { DeliveryConfigSchema } from '@ai-crm/shared';
import type { z } from 'zod';
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

/** Dev stub — logs structured delivery intent; real Slack/Teams SDK wiring ships later. */
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

  log('chat-delivery', 'deliver agent output (stub)', {
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
