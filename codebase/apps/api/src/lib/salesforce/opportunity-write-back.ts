import { Deal, ExternalRecord, IntegrationConnection } from '@ai-crm/db';
import type { DealUpdatePatch } from '../../modules/approvals/write-back.js';
import { resolveWorkspaceAccessToken } from '../integrations/workspace-tokens.js';
import { log } from '../logger.js';
import { salesforceRequest } from './client.js';

type StageMapping = {
  stageExternalId: string;
  stageExternalLabel: string;
  pipelineExternalId?: string | null;
  internalStageId: string;
};

type ConnectionSettings = {
  instanceUrl?: string;
  stageMappings?: StageMapping[];
  lastWriteBackError?: string | null;
};

function resolveStageName(internalStageId: string, mappings: StageMapping[]): string | null {
  const match = mappings.find((m) => m.internalStageId === internalStageId);
  return match?.stageExternalLabel || match?.stageExternalId || null;
}

async function resolveSalesforceOpportunityId(
  workspaceId: string,
  dealId: string,
  deal: InstanceType<typeof Deal>,
): Promise<string | null> {
  if (deal.crmProvider === 'salesforce' && deal.crmExternalId) {
    return deal.crmExternalId;
  }
  const externalRecord = await ExternalRecord.findOne({
    workspaceId,
    providerKey: 'salesforce',
    entityType: 'deal',
    internalId: dealId,
  });
  return externalRecord?.externalId ?? (deal.crmProvider === 'salesforce' ? deal.crmExternalId : null) ?? null;
}

function buildOpportunityFields(
  patch: DealUpdatePatch,
  stageMappings: StageMapping[],
): Record<string, string | number> | null {
  const fields: Record<string, string | number> = {};
  if (patch.title) fields.Name = patch.title;
  if (patch.amount !== undefined) fields.Amount = patch.amount;
  if (patch.expectedCloseDate) fields.CloseDate = patch.expectedCloseDate.slice(0, 10);
  if (patch.stageId) {
    const stageName = resolveStageName(patch.stageId, stageMappings);
    if (stageName) fields.StageName = stageName;
    else {
      log('salesforce-write-back', 'stage not mapped — skipping StageName', {
        internalStageId: patch.stageId,
      });
    }
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

/** Push local deal field changes to Salesforce. Never throws — local apply already succeeded. */
export async function pushOpportunityUpdateToSalesforce(
  workspaceId: string,
  dealId: string,
  patch: DealUpdatePatch,
): Promise<void> {
  const connection = await IntegrationConnection.findOne({
    workspaceId,
    providerKey: 'salesforce',
    status: 'connected',
  });
  if (!connection) return;

  const settings = (connection.settings ?? {}) as ConnectionSettings;
  if (!settings.instanceUrl) return;

  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'salesforce');
  if (!accessToken) return;

  const deal = await Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
  if (!deal) return;

  const externalId = await resolveSalesforceOpportunityId(workspaceId, dealId, deal);
  if (!externalId) return;

  const fields = buildOpportunityFields(patch, settings.stageMappings ?? []);
  if (!fields) return;

  try {
    await salesforceRequest({
      instanceUrl: settings.instanceUrl,
      accessToken,
      method: 'PATCH',
      path: `/services/data/v59.0/sobjects/Opportunity/${encodeURIComponent(externalId)}`,
      body: fields,
    });

    const priorSettings = (connection.settings ?? {}) as ConnectionSettings;
    if (priorSettings.lastWriteBackError) {
      connection.set('settings', { ...priorSettings, lastWriteBackError: null });
      connection.markModified('settings');
      await connection.save();
    }

    log('salesforce-write-back', 'opportunity patched', {
      workspaceId,
      dealId,
      externalId,
      fields: Object.keys(fields),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Salesforce write-back failed';
    log('salesforce-write-back', 'Salesforce PATCH failed', {
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
