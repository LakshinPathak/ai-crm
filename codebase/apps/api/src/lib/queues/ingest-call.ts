import { createHash } from 'node:crypto';
import { Artifact } from '@ai-crm/db';
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function extractCallFields(payload: Record<string, unknown>) {
  const callData = asRecord(payload.callData);
  const metaData = asRecord(callData?.metaData) ?? asRecord(payload.metaData);
  const callIds = Array.isArray(payload.callIds) ? payload.callIds : undefined;

  const callId =
    (typeof payload.callId === 'string' ? payload.callId : null) ??
    (typeof callIds?.[0] === 'string' ? callIds[0] : null) ??
    (typeof metaData?.id === 'string' ? metaData.id : null);

  const title =
    (typeof metaData?.title === 'string' ? metaData.title : null) ??
    (callId ? `Gong call ${callId}` : `Gong ${typeof payload.eventType === 'string' ? payload.eventType : 'event'}`);

  const occurredAtRaw = metaData?.scheduled ?? metaData?.started ?? metaData?.startedAt;
  const durationRaw = metaData?.duration;

  return {
    callId,
    title,
    metaData,
    occurredAt: occurredAtRaw,
    durationSeconds: typeof durationRaw === 'number' ? durationRaw : undefined,
  };
}

export async function processIngestCall(data: IngestCallJobData): Promise<void> {
  const { callId, title, metaData, occurredAt, durationSeconds } = extractCallFields(data.payload);
  const payloadJson = JSON.stringify(data.payload);
  const contentHash = createHash('sha256').update(payloadJson).digest('hex');
  const sourceId =
    callId ??
    data.callId ??
    `event:${data.eventType}:${createHash('sha256').update(payloadJson).digest('hex').slice(0, 16)}`;

  const occurredAtDate =
    occurredAt instanceof Date
      ? occurredAt
      : typeof occurredAt === 'string' || typeof occurredAt === 'number'
        ? new Date(occurredAt)
        : new Date();

  const artifact = await Artifact.findOneAndUpdate(
    {
      workspaceId: data.workspaceId,
      source: 'gong',
      sourceId,
    },
    {
      $setOnInsert: {
        workspaceId: data.workspaceId,
        type: 'call',
        source: 'gong',
        sourceId,
      },
      $set: {
        title,
        occurredAt: Number.isNaN(occurredAtDate.getTime()) ? new Date() : occurredAtDate,
        durationSeconds,
        contentHash,
        metadata: {
          eventType: data.eventType,
          connectionId: data.connectionId,
          callId,
          gong: metaData ?? data.payload,
        },
      },
    },
    { upsert: true, new: true },
  );

  log('ingest-call', 'artifact upserted', {
    artifactId: artifact.id,
    connectionId: data.connectionId,
    workspaceId: data.workspaceId,
    eventType: data.eventType,
    callId: sourceId,
  });
}
