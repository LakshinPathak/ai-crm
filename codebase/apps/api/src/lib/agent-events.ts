import { Agent, AgentRun } from '@ai-crm/db';
import { enqueueAgentRun } from '../modules/agents/executor.js';
import { log } from './logger.js';

/** Fire agents subscribed to activity.ingested (post-call, buying-signals, etc.). */
export async function dispatchActivityIngested(payload: {
  workspaceId: string;
  artifactId: string;
  dealId: string | null;
  source: string;
}): Promise<void> {
  const agents = await Agent.find({
    workspaceId: payload.workspaceId,
    isActive: true,
    'triggerConfig.type': 'event',
    'triggerConfig.event': 'activity.ingested',
  });

  if (agents.length === 0) return;

  for (const agent of agents) {
    if (!agent.ownerId || !agent.templateSlug) continue;
    if (payload.dealId === null) continue;

    const run = await AgentRun.create({
      workspaceId: agent.workspaceId,
      agentId: agent._id,
      status: 'running',
      triggerType: 'event',
      dealId: payload.dealId,
      startedAt: new Date(),
      scope: { artifactId: payload.artifactId, source: payload.source },
    });

    enqueueAgentRun({
      runId: run.id,
      workspaceId: payload.workspaceId,
      userId: agent.ownerId.toString(),
      agentId: agent.id,
      templateSlug: agent.templateSlug,
      dealId: payload.dealId,
    });
  }

  log('agent-events', 'activity.ingested dispatched', {
    workspaceId: payload.workspaceId,
    agentCount: agents.length,
    artifactId: payload.artifactId,
  });
}

/** Fire agents subscribed to deal.stage_changed (POC kickoff, stage automations, etc.). */
export async function dispatchDealStageChanged(payload: {
  workspaceId: string;
  dealId: string;
  fromStageId: string;
  toStageId: string;
}): Promise<void> {
  const agents = await Agent.find({
    workspaceId: payload.workspaceId,
    isActive: true,
    'triggerConfig.type': 'event',
    'triggerConfig.event': 'deal.stage_changed',
  });

  if (agents.length === 0) return;

  for (const agent of agents) {
    if (!agent.ownerId || !agent.templateSlug) continue;

    const run = await AgentRun.create({
      workspaceId: agent.workspaceId,
      agentId: agent._id,
      status: 'running',
      triggerType: 'event',
      dealId: payload.dealId,
      startedAt: new Date(),
      scope: {
        fromStageId: payload.fromStageId,
        toStageId: payload.toStageId,
      },
    });

    enqueueAgentRun({
      runId: run.id,
      workspaceId: payload.workspaceId,
      userId: agent.ownerId.toString(),
      agentId: agent.id,
      templateSlug: agent.templateSlug,
      dealId: payload.dealId,
    });
  }

  log('agent-events', 'deal.stage_changed dispatched', {
    workspaceId: payload.workspaceId,
    agentCount: agents.length,
    dealId: payload.dealId,
    fromStageId: payload.fromStageId,
    toStageId: payload.toStageId,
  });
}

/** Fire agents subscribed to deal.closed (win/loss analysis, handoff, etc.). */
export async function dispatchDealClosed(payload: {
  workspaceId: string;
  dealId: string;
  outcome: 'won' | 'lost';
}): Promise<void> {
  const agents = await Agent.find({
    workspaceId: payload.workspaceId,
    isActive: true,
    'triggerConfig.type': 'event',
    'triggerConfig.event': 'deal.closed',
  });

  if (agents.length === 0) return;

  for (const agent of agents) {
    if (!agent.ownerId || !agent.templateSlug) continue;

    const run = await AgentRun.create({
      workspaceId: agent.workspaceId,
      agentId: agent._id,
      status: 'running',
      triggerType: 'event',
      dealId: payload.dealId,
      startedAt: new Date(),
      scope: { outcome: payload.outcome },
    });

    enqueueAgentRun({
      runId: run.id,
      workspaceId: payload.workspaceId,
      userId: agent.ownerId.toString(),
      agentId: agent.id,
      templateSlug: agent.templateSlug,
      dealId: payload.dealId,
    });
  }

  log('agent-events', 'deal.closed dispatched', {
    workspaceId: payload.workspaceId,
    agentCount: agents.length,
    dealId: payload.dealId,
    outcome: payload.outcome,
  });
}
