import { Deal, ExternalRecord, IntegrationConnection } from '@ai-crm/db';
import type { DealUpdatePatch } from '../../modules/approvals/write-back.js';
import { hubspotRequest } from './client.js';
import { resolveWorkspaceAccessToken } from '../integrations/workspace-tokens.js';
import { log } from '../logger.js';

type StageMapping = {
  stageExternalId: string;
  stageExternalLabel: string;
  pipelineExternalId?: string | null;
  internalStageId: string;
};

type ConnectionSettings = {
  mode?: 'demo' | 'live';
  stageMappings?: StageMapping[];
  lastWriteBackError?: string | null;
};

function resolveHubSpotEnvToken(): string | undefined {
  return process.env.HUBSPOT_ACCESS_TOKEN ?? process.env.HUBSPOT_PRIVATE_APP_TOKEN;
}

function resolveStageExternalId(internalStageId: string, mappings: StageMapping[]): string | null {
  const match = mappings.find((m) => m.internalStageId === internalStageId);
  return match?.stageExternalId ?? null;
}

async function resolveHubSpotDealExternalId(
  workspaceId: string,
  dealId: string,
  deal: InstanceType<typeof Deal>,
): Promise<string | null> {
  if (deal.crmProvider === 'hubspot' && deal.crmExternalId) {
    return deal.crmExternalId;
  }
  if (deal.crmExternalId && !deal.crmProvider) {
    return deal.crmExternalId;
  }

  const externalRecord = await ExternalRecord.findOne({
    workspaceId,
    providerKey: 'hubspot',
    entityType: 'deal',
    internalId: dealId,
  });
  return externalRecord?.externalId ?? deal.crmExternalId ?? null;
}

function buildHubSpotProperties(
  patch: DealUpdatePatch,
  stageMappings: StageMapping[],
): Record<string, string> | null {
  const properties: Record<string, string> = {};

  if (patch.title) {
    properties.dealname = patch.title;
  }
  if (patch.amount !== undefined) {
    properties.amount = String(patch.amount);
  }
  if (patch.stageId) {
    const stageExternalId = resolveStageExternalId(patch.stageId, stageMappings);
    if (!stageExternalId) {
      log('hubspot-write-back', 'stage not mapped — skipping dealstage', {
        internalStageId: patch.stageId,
      });
    } else {
      properties.dealstage = stageExternalId;
    }
  }

  return Object.keys(properties).length > 0 ? properties : null;
}

/** Push approved crm_field_update fields to HubSpot. Never throws — local apply already succeeded. */
export async function pushCrmFieldUpdateToHubSpot(
  workspaceId: string,
  dealId: string,
  patch: DealUpdatePatch,
): Promise<void> {
  const connection = await IntegrationConnection.findOne({
    workspaceId,
    providerKey: 'hubspot',
    status: 'connected',
  });
  if (!connection) {
    return;
  }

  const workspaceToken = await resolveWorkspaceAccessToken(workspaceId, 'hubspot');
  const token = workspaceToken ?? resolveHubSpotEnvToken();
  if (!token) {
    return;
  }

  const deal = await Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
  if (!deal) {
    log('hubspot-write-back', 'deal not found after local apply', { workspaceId, dealId });
    return;
  }

  const externalId = await resolveHubSpotDealExternalId(workspaceId, dealId, deal);
  if (!externalId) {
    log('hubspot-write-back', 'no HubSpot external id — skipped', { workspaceId, dealId });
    return;
  }

  const settings = (connection.settings ?? {}) as ConnectionSettings;
  const properties = buildHubSpotProperties(patch, settings.stageMappings ?? []);
  if (!properties) {
    return;
  }

  try {
    await hubspotRequest(
      'PATCH',
      `/crm/v3/objects/deals/${externalId}`,
      { properties },
      { accessToken: token, workspaceId },
    );

    const priorSettings = (connection.settings ?? {}) as ConnectionSettings;
    if (priorSettings.lastWriteBackError) {
      connection.set('settings', { ...priorSettings, lastWriteBackError: null });
      connection.markModified('settings');
      await connection.save();
    }

    log('hubspot-write-back', 'deal patched', {
      workspaceId,
      dealId,
      externalId,
      properties: Object.keys(properties),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HubSpot write-back failed';
    log('hubspot-write-back', 'HubSpot PATCH failed', {
      workspaceId,
      dealId,
      externalId,
      error: message,
    });

    const priorSettings = (connection.settings ?? {}) as ConnectionSettings;
    connection.set('settings', { ...priorSettings, lastWriteBackError: message });
    connection.markModified('settings');
    await connection.save();
  }
}
