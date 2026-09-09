import { processAgentRun } from '../../modules/agents/executor.js';
import type { AgentRunContext } from '../../modules/agents/executors/types.js';
import { AGENT_RUNS_QUEUE } from './agent-runs.js';
import {
  CRM_INCREMENTAL_QUEUE,
  processCrmIncremental,
  type CrmIncrementalJobData,
} from './crm-incremental.js';
import { INGEST_CALL_QUEUE, processIngestCall, type IngestCallJobData } from './ingest-call.js';
import { startQueuePoller } from './mongo-queue.js';
import { startScheduledAgentTicker } from './scheduled-agents.js';
import { log } from '../logger.js';

let stopPollers: (() => void) | null = null;

/** Start MongoDB-backed background job processors (monolith or dedicated worker). */
export function startBackgroundJobProcessors(): void {
  if (stopPollers) return;

  const stopAgent = startQueuePoller(
    AGENT_RUNS_QUEUE,
    async (payload) => {
      await processAgentRun(payload as AgentRunContext);
    },
    { concurrency: 3 },
  );

  const stopIngest = startQueuePoller(
    INGEST_CALL_QUEUE,
    async (payload) => {
      await processIngestCall(payload as IngestCallJobData);
    },
    { concurrency: 3 },
  );

  const stopCrmIncremental = startQueuePoller(
    CRM_INCREMENTAL_QUEUE,
    async (payload) => {
      await processCrmIncremental(payload as CrmIncrementalJobData);
    },
    { concurrency: 3 },
  );

  const stopScheduled = startScheduledAgentTicker();

  stopPollers = () => {
    stopAgent();
    stopIngest();
    stopCrmIncremental();
    stopScheduled();
    stopPollers = null;
  };

  log('mongo-queue', 'background processors started', {
    queues: [AGENT_RUNS_QUEUE, INGEST_CALL_QUEUE, CRM_INCREMENTAL_QUEUE],
  });
}

export function stopBackgroundJobProcessors(): void {
  stopPollers?.();
}
