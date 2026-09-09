import type { AgentRunContext } from '../../modules/agents/executors/types.js';
import { enqueueJob, removeJobByJobId } from './mongo-queue.js';

export const AGENT_RUNS_QUEUE = 'agent-runs';

export function isAgentQueueEnabled(): boolean {
  return true;
}

export async function addAgentRunJob(ctx: AgentRunContext): Promise<boolean> {
  await enqueueJob({
    queue: AGENT_RUNS_QUEUE,
    name: 'run',
    jobId: ctx.runId,
    payload: ctx,
    maxAttempts: 3,
  });
  return true;
}

export async function cancelAgentRunJob(runId: string): Promise<void> {
  await removeJobByJobId(AGENT_RUNS_QUEUE, runId);
}
