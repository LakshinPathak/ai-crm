import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { Artifact, Company, Deal, DealParticipant, User } from '@ai-crm/db';
import { fetchGongCallTranscript } from '../integrations/gong-api.js';
import { log } from '../logger.js';
import { dispatchActivityIngested } from '../agent-events.js';
import { addEmbedArtifactJob } from './embed-artifact.js';
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isGenericGongTitle(title: string): boolean {
  return /^Gong call /i.test(title.trim());
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : null;
}

function partyEmail(party: Record<string, unknown>): string | null {
  const raw =
    (typeof party.emailAddress === 'string' ? party.emailAddress : null) ??
    (typeof party.email === 'string' ? party.email : null);
  if (!raw?.trim()) return null;
  return normalizeEmail(raw);
}

function extractGongParticipantEmails(
  metaData: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
): string[] {
  const emails = new Set<string>();
  const callData = asRecord(payload.callData);
  const partyLists = [metaData?.parties, callData?.metaData && asRecord(callData.metaData)?.parties, payload.parties];

  for (const parties of partyLists) {
    if (!Array.isArray(parties)) continue;
    for (const party of parties) {
      const record = asRecord(party);
      if (!record) continue;
      const email = partyEmail(record);
      if (email) emails.add(email);
    }
  }

  return [...emails];
}

async function pickBestDeal(
  workspaceId: string,
  dealIds: Types.ObjectId[],
): Promise<Types.ObjectId | null> {
  const unique = [...new Map(dealIds.map((id) => [id.toString(), id])).values()];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];

  const deals = await Deal.find({
    workspaceId,
    _id: { $in: unique },
    deletedAt: null,
  }).select('_id status lastActivityAt updatedAt');

  deals.sort((a, b) => {
    const openRank = (status: string) => (status === 'open' ? 0 : 1);
    const byOpen = openRank(a.status) - openRank(b.status);
    if (byOpen !== 0) return byOpen;
    const aTime = (a.lastActivityAt ?? a.updatedAt)?.getTime() ?? 0;
    const bTime = (b.lastActivityAt ?? b.updatedAt)?.getTime() ?? 0;
    return bTime - aTime;
  });

  return deals[0]?._id ?? unique[0];
}

async function resolveDealIdFromGongTitle(
  workspaceId: string,
  title: string,
): Promise<Types.ObjectId | null> {
  const trimmed = title.trim();
  if (trimmed.length < 3 || isGenericGongTitle(trimmed)) return null;

  const escaped = escapeRegex(trimmed.slice(0, 120));
  const wsId = new Types.ObjectId(workspaceId);

  const companies = await Company.find({
    workspaceId: wsId,
    deletedAt: null,
    name: { $regex: escaped, $options: 'i' },
  })
    .select('_id')
    .limit(10);

  const companyIds = companies.map((c) => c._id);
  const orFilter = [
    { title: { $regex: escaped, $options: 'i' } },
    ...(companyIds.length ? [{ companyId: { $in: companyIds } }] : []),
  ];

  const base = { workspaceId: wsId, deletedAt: null, $or: orFilter };
  let matches = await Deal.find({ ...base, status: 'open' }).select('_id').limit(10);
  if (matches.length === 0) {
    matches = await Deal.find(base).select('_id').limit(10);
  }

  return pickBestDeal(
    workspaceId,
    matches.map((d) => d._id),
  );
}

async function resolveDealIdFromGongParticipants(
  workspaceId: string,
  metaData: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
): Promise<Types.ObjectId | null> {
  const emails = extractGongParticipantEmails(metaData, payload);
  if (emails.length === 0) return null;

  const wsId = new Types.ObjectId(workspaceId);

  const participantMatches = await DealParticipant.find({
    workspaceId: wsId,
    $expr: { $in: [{ $toLower: '$email' }, emails] },
  }).select('dealId');

  if (participantMatches.length > 0) {
    return pickBestDeal(
      workspaceId,
      participantMatches.map((p) => p.dealId),
    );
  }

  const domains = [...new Set(emails.map(emailDomain).filter(Boolean) as string[])];
  if (domains.length > 0) {
    const companies = await Company.find({
      workspaceId: wsId,
      domain: { $in: domains },
      deletedAt: null,
    }).select('_id');

    if (companies.length > 0) {
      const domainDeals = await Deal.find({
        workspaceId: wsId,
        companyId: { $in: companies.map((c) => c._id) },
        deletedAt: null,
      }).select('_id');

      if (domainDeals.length > 0) {
        return pickBestDeal(
          workspaceId,
          domainDeals.map((d) => d._id),
        );
      }
    }
  }

  const ownerMatches = await User.find({
    workspaceId: wsId,
    $expr: { $in: [{ $toLower: '$email' }, emails] },
  }).select('_id');

  if (ownerMatches.length > 0) {
    const ownerDeals = await Deal.find({
      workspaceId: wsId,
      ownerId: { $in: ownerMatches.map((u) => u._id) },
      deletedAt: null,
    }).select('_id');

    if (ownerDeals.length > 0) {
      return pickBestDeal(
        workspaceId,
        ownerDeals.map((d) => d._id),
      );
    }
  }

  return null;
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

  let resolvedDealId = await resolveDealIdFromGongParticipants(
    data.workspaceId,
    metaData,
    data.payload,
  );
  if (!resolvedDealId) {
    resolvedDealId = await resolveDealIdFromGongTitle(data.workspaceId, title);
  }

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

  if (resolvedDealId && !artifact.dealId) {
    await Artifact.findByIdAndUpdate(artifact._id, { $set: { dealId: resolvedDealId } });
    artifact.dealId = resolvedDealId;
  }

  let rawText: string | undefined;
  if (callId) {
    const transcript = await fetchGongCallTranscript(data.workspaceId, callId);
    if (transcript) {
      rawText = transcript;
      await Artifact.findByIdAndUpdate(artifact._id, { $set: { rawText } });
      await addEmbedArtifactJob({
        workspaceId: data.workspaceId,
        artifactId: artifact.id,
      });
    }
  }

  log('ingest-call', 'artifact upserted', {
    artifactId: artifact.id,
    connectionId: data.connectionId,
    workspaceId: data.workspaceId,
    eventType: data.eventType,
    callId: sourceId,
    hasTranscript: Boolean(rawText),
  });

  void dispatchActivityIngested({
    workspaceId: data.workspaceId,
    artifactId: artifact.id,
    dealId: artifact.dealId?.toString() ?? null,
    source: 'gong',
  }).catch((err) => {
    log('ingest-call', 'activity.ingested dispatch failed', { error: String(err) });
  });
}
