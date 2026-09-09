import type { Request, Response } from 'express';
import { z } from 'zod';
import { Agent, AgentRun } from '@ai-crm/db';
import { enqueueAgentRun } from '../agents/executor.js';

const ExecuteAgentSchema = z.object({
  agentId: z.string().min(1),
  workspaceId: z.string().min(1),
  dealId: z.string().optional(),
  input: z.record(z.unknown()).optional(),
});

export async function executeAgent(req: Request, res: Response) {
  const parsed = ExecuteAgentSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const { agentId, workspaceId, dealId, input } = parsed.data;

  const agent = await Agent.findOne({ _id: agentId, workspaceId });
  if (!agent) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  const scope = { ...(input ?? {}), ...(dealId ? { dealId } : {}) };

  const run = await AgentRun.create({
    workspaceId,
    agentId: agent._id,
    dealId,
    status: 'running',
    triggerType: 'event',
    startedAt: new Date(),
    scope,
  });

  enqueueAgentRun({
    runId: run.id,
    workspaceId,
    agentId: agent.id,
    templateSlug: agent.templateSlug ?? 'unknown',
    dealId,
    userId: agent.ownerId?.toString() ?? '',
  });

  res.status(202).json({ run: { id: run.id, status: run.status, agentId: agent.id } });
}
