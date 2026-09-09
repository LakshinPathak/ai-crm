import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Agent, AgentRun } from '@ai-crm/db';
import { cancelAgentRunJob } from '../../lib/queues/agent-runs.js';

function toRunDto(r: InstanceType<typeof AgentRun>, agentName?: string) {
  const scope = (r.scope ?? {}) as { output?: Record<string, unknown> };
  return {
    id: r.id,
    agentId: r.agentId.toString(),
    agentName: agentName ?? null,
    dealId: r.dealId?.toString() ?? null,
    status: r.status,
    creditsUsed: r.creditsUsed,
    output: scope.output ?? null,
    error: r.error ?? null,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    createdAt: r.createdAt,
  };
}

export async function getAgentRun(req: AuthedRequest, res: Response) {
  const run = await AgentRun.findOne({
    _id: req.params.runId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!run) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent run not found' } });
    return;
  }

  const agent = await Agent.findById(run.agentId);
  res.json({ run: toRunDto(run, agent?.name) });
}

export async function listAgentRuns(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const filter: { workspaceId: string; agentId?: string } = { workspaceId };
  const agentId = req.query.agentId;
  if (typeof agentId === 'string' && agentId) {
    filter.agentId = agentId;
  }

  const limitParam = req.query.limit;
  const limit =
    typeof limitParam === 'string' && limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 30, 1), 100)
      : 30;

  const runs = await AgentRun.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  const agents = await Agent.find({ workspaceId: req.tenant!.workspaceId });
  const agentMap = new Map(agents.map((a) => [a.id, a.name]));

  res.json({
    runs: runs.map((r) =>
      toRunDto(r, agentMap.get(r.agentId.toString()) ?? 'Agent'),
    ),
  });
}

const CANCELLABLE_STATUSES = ['queued', 'running'] as const;

export async function cancelAgentRun(req: AuthedRequest, res: Response) {
  const run = await AgentRun.findOneAndUpdate(
    {
      _id: req.params.runId,
      workspaceId: req.tenant!.workspaceId,
      status: { $in: CANCELLABLE_STATUSES },
    },
    {
      status: 'skipped',
      error: 'Cancelled by user',
      completedAt: new Date(),
    },
    { new: true },
  );

  if (!run) {
    const existing = await AgentRun.findOne({
      _id: req.params.runId,
      workspaceId: req.tenant!.workspaceId,
    });
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent run not found' } });
      return;
    }
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'Run cannot be cancelled in its current state' },
    });
    return;
  }

  await cancelAgentRunJob(run.id);

  const agent = await Agent.findById(run.agentId);
  res.json({ run: toRunDto(run, agent?.name) });
}
