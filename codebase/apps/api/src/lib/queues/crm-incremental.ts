import { createHash } from 'node:crypto';
import { BackgroundJob, Deal, ExternalRecord, IntegrationConnection } from '@ai-crm/db';
import type { HubSpotEvent } from '../../modules/webhooks/hubspot-events.js';
import { dispatchDealCreated } from '../agent-events.js';
import { log } from '../logger.js';
import { enqueueJob } from './mongo-queue.js';

export const CRM_INCREMENTAL_QUEUE = 'crm-incremental';

type StageMapping = {
  stageExternalId: string;
  stageExternalLabel: string;
  pipelineExternalId?: string | null;
  internalStageId: string;
};

type ConnectionSettings = {
  mode?: 'demo' | 'live';
  stageMappings?: StageMapping[];
  incrementalSyncErrorCount?: number;
};

export interface CrmIncrementalJobData {
  connectionId: string;
  workspaceId: string;
  providerKey: string;
  portalId: number | null;
  event: HubSpotEvent;
}

export function isCrmIncrementalQueueEnabled(): boolean {
  return true;
}

function buildJobId(data: CrmIncrementalJobData): string {
  const portalId = data.portalId ?? data.workspaceId;
  const objectId = data.event.objectId ?? 'unknown';
  const eventId =
    data.event.eventId ??
    createHash('sha256')
      .update(
        JSON.stringify({
          subscriptionType: data.event.subscriptionType,
          propertyName: data.event.propertyName,
          propertyValue: data.event.propertyValue,
          objectId: data.event.objectId,
        }),
      )
      .digest('hex')
      .slice(0, 16);

  return `${portalId}:${objectId}:${eventId}`;
}

export async function addCrmIncrementalJob(data: CrmIncrementalJobData): Promise<boolean> {
  const jobId = buildJobId(data);

  await enqueueJob({
    queue: CRM_INCREMENTAL_QUEUE,
    name: 'incremental',
    jobId,
    payload: data,
    maxAttempts: 3,
  });
  return true;
}

function isDealEvent(event: HubSpotEvent): boolean {
  return event.objectType === 'deal' || event.subscriptionType?.includes('deal') === true;
}

function isDealCreationEvent(event: HubSpotEvent): boolean {
  if (!isDealEvent(event)) return false;
  return event.subscriptionType?.includes('creation') === true;
}

function isDealPropertyChangeEvent(event: HubSpotEvent): boolean {
  if (!isDealEvent(event)) return false;
  return (
    event.subscriptionType?.includes('propertyChange') === true ||
    Boolean(event.propertyName)
  );
}

function resolveStageId(
  stageExternalId: string,
  mappings: StageMapping[],
): string | null {
  const match = mappings.find((m) => m.stageExternalId === stageExternalId);
  return match?.internalStageId ?? null;
}

async function findDealForExternalId(
  workspaceId: string,
  providerKey: string,
  externalId: string,
) {
  const externalRecord = await ExternalRecord.findOne({
    workspaceId,
    providerKey,
    entityType: 'deal',
    externalId,
  });

  if (externalRecord) {
    const deal = await Deal.findOne({
      _id: externalRecord.internalId,
      workspaceId,
      deletedAt: null,
    });
    if (deal) return { deal, externalRecord };
  }

  const deal = await Deal.findOne({
    workspaceId,
    crmProvider: providerKey,
    crmExternalId: externalId,
    deletedAt: null,
  });

  return { deal, externalRecord: externalRecord ?? null };
}

async function upsertExternalRecord(
  workspaceId: string,
  providerKey: string,
  externalId: string,
  dealId: string,
  metadata: Record<string, unknown>,
) {
  return ExternalRecord.findOneAndUpdate(
    {
      workspaceId,
      providerKey,
      entityType: 'deal',
      externalId,
    },
    {
      $setOnInsert: {
        workspaceId,
        providerKey,
        entityType: 'deal',
        externalId,
        internalId: dealId,
      },
      $set: {
        lastSyncedAt: new Date(),
        metadata,
      },
    },
    { upsert: true, new: true },
  );
}

export async function processCrmIncremental(data: CrmIncrementalJobData): Promise<void> {
  const { connectionId, workspaceId, providerKey, event } = data;

  if (providerKey !== 'hubspot') {
    log('crm-incremental', 'unsupported provider — skipped', { providerKey, connectionId });
    return;
  }

  const externalId = event.objectId != null ? String(event.objectId) : null;
  if (!externalId) {
    log('crm-incremental', 'missing objectId — skipped', { connectionId });
    return;
  }

  const connection = await IntegrationConnection.findById(connectionId);
  if (!connection || connection.status === 'disconnected') {
    log('crm-incremental', 'connection not found — skipped', { connectionId });
    return;
  }

  if (isDealCreationEvent(event)) {
    const { deal } = await findDealForExternalId(workspaceId, providerKey, externalId);
    if (!deal) {
      log('crm-incremental', 'deal.creation — not mapped locally', {
        connectionId,
        workspaceId,
        externalId,
      });
      return;
    }

    await upsertExternalRecord(workspaceId, providerKey, externalId, deal.id, {
      lastEvent: {
        subscriptionType: event.subscriptionType,
      },
    });

    void dispatchDealCreated({ workspaceId, dealId: deal.id });

    log('crm-incremental', 'deal.creation dispatched', {
      connectionId,
      workspaceId,
      dealId: deal.id,
      externalId,
    });
    return;
  }

  if (!isDealPropertyChangeEvent(event)) {
    log('crm-incremental', 'non-deal property event — skipped', {
      connectionId,
      subscriptionType: event.subscriptionType,
    });
    return;
  }

  const settings = (connection.settings ?? {}) as ConnectionSettings;
  const stageMappings = settings.stageMappings ?? [];

  const { deal } = await findDealForExternalId(workspaceId, providerKey, externalId);
  if (!deal) {
    log('crm-incremental', 'deal not mapped — no-op', {
      connectionId,
      workspaceId,
      externalId,
      propertyName: event.propertyName,
    });
    return;
  }

  const patch: Record<string, unknown> = { lastActivityAt: new Date() };
  const propertyName = event.propertyName;
  const propertyValue = event.propertyValue;

  if (propertyName === 'dealstage' && propertyValue) {
    const internalStageId = resolveStageId(propertyValue, stageMappings);
    if (!internalStageId) {
      log('crm-incremental', 'stage not mapped — no-op', {
        connectionId,
        externalId,
        stageExternalId: propertyValue,
      });
      return;
    }
    patch.stageId = internalStageId;
  } else if (propertyName === 'amount' && propertyValue != null) {
    const amount = Number(propertyValue);
    if (Number.isNaN(amount)) {
      log('crm-incremental', 'invalid amount — skipped', { connectionId, externalId, propertyValue });
      return;
    }
    patch.amount = amount;
  } else if (propertyName === 'dealname' && propertyValue) {
    patch.title = propertyValue;
  } else if (!propertyName) {
    log('crm-incremental', 'missing propertyName — skipped', { connectionId, externalId });
    return;
  } else {
    log('crm-incremental', 'unhandled property — skipped', {
      connectionId,
      externalId,
      propertyName,
    });
    return;
  }

  await Deal.findByIdAndUpdate(deal._id, { $set: patch });

  await upsertExternalRecord(workspaceId, providerKey, externalId, deal.id, {
    lastEvent: {
      subscriptionType: event.subscriptionType,
      propertyName: event.propertyName,
      propertyValue: event.propertyValue,
    },
  });

  connection.lastSyncAt = new Date();
  const priorSettings = (connection.settings ?? {}) as ConnectionSettings;
  connection.set('settings', {
    ...priorSettings,
    incrementalSyncErrorCount: 0,
  });
  connection.markModified('settings');
  await connection.save();

  log('crm-incremental', 'deal patched', {
    connectionId,
    workspaceId,
    dealId: deal.id,
    externalId,
    propertyName,
  });
}

export async function getCrmIncrementalQueueStats(workspaceId: string) {
  const [pendingJobs, errorCount] = await Promise.all([
    BackgroundJob.countDocuments({
      queue: CRM_INCREMENTAL_QUEUE,
      status: { $in: ['pending', 'processing'] },
      'payload.workspaceId': workspaceId,
    }),
    BackgroundJob.countDocuments({
      queue: CRM_INCREMENTAL_QUEUE,
      status: 'failed',
      'payload.workspaceId': workspaceId,
    }),
  ]);

  return { pendingJobs, errorCount };
}
