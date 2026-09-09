import { log } from '../logger.js';
import { enqueueJob } from './mongo-queue.js';

export const INGEST_CALL_QUEUE = 'ingest-call';

export interface IngestCallJobData {
  connectionId: string;
  workspaceId: string;
  eventType: string;
  callId: string | null;
  payload: Record<string, unknown>;
}

export function isIngestCallQueueEnabled(): boolean {
  return true;
}

export async function addIngestCallJob(data: IngestCallJobData): Promise<boolean> {
  const jobId = data.callId ? `${data.workspaceId}:gong:${data.callId}` : undefined;

  await enqueueJob({
    queue: INGEST_CALL_QUEUE,
    name: 'ingest',
    jobId,
    payload: data,
    maxAttempts: 3,
  });
  return true;
}

export async function processIngestCall(data: IngestCallJobData): Promise<void> {
  log('ingest-call', 'processing call ingest', {
    connectionId: data.connectionId,
    workspaceId: data.workspaceId,
    eventType: data.eventType,
    callId: data.callId,
  });

  const stubArtifact = {
    workspaceId: data.workspaceId,
    type: 'call',
    source: 'gong',
    sourceId: data.callId ?? `event:${data.eventType}:${Date.now()}`,
    title: data.callId ? `Gong call ${data.callId}` : `Gong ${data.eventType}`,
    contentHash: 'stub',
  };

  log('ingest-call', 'stub artifact create', stubArtifact);
}
