import type { Response } from 'express';
import { Types } from 'mongoose';
import { resolveCrmConnector } from '@ai-crm/integrations-crm';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { buildCrmConnectionContext } from '../../lib/crm/connector-context.js';
import { getDemoCrmRecords } from '../../lib/crm-demo-data.js';
import { syncDemoCrmFromProvider } from '../../lib/crm-demo-sync.js';
import {
  getDemoCrmOwners,
  getDemoCrmStages,
  suggestInternalStageId,
} from '../../lib/crm-discovery-demo.js';
import { ensurePipelineStages } from '../../lib/seed.js';
import { IntegrationConnection, PipelineStage, User } from '@ai-crm/db';
import { getAccessToken } from '../../lib/integrations/tokens.js';
import { hubspotOAuthConfigured } from '../../lib/integrations/hubspot-oauth.js';
import { hasHubSpotAccessToken } from '../../lib/hubspot/client.js';
import { syncHubSpotToWorkspace } from '../../lib/hubspot/sync.js';
import { getCrmIncrementalQueueStats } from '../../lib/queues/crm-incremental.js';
import { ensureConnectionWebhookSecret } from '../../lib/webhook-hmac.js';
import { startCrmOAuth } from '../oauth/handlers.js';

type StageMapping = {
  stageExternalId: string;
  stageExternalLabel: string;
  pipelineExternalId?: string | null;
  internalStageId: string;
};

type UserMapping = {
  externalUserId: string;
  externalEmail?: string | null;
  internalUserId: string | null;
};

type ConnectionSettings = {
  mode?: 'demo' | 'live';
  webhookSecret?: string;
  imported?: Record<string, { companyId: string; dealId: string }>;
  stageMappings?: StageMapping[];
  userMappings?: UserMapping[];
  syncProgress?: {
    status: 'idle' | 'running' | 'completed' | 'failed';
    processed: number;
    total: number;
  };
  lastHubSpotSync?: unknown;
  incrementalSyncErrorCount?: number;
};

async function getConnectedConnection(req: AuthedRequest) {
  return IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    status: 'connected',
  });
}

function mergeSettings(existing: ConnectionSettings | undefined, patch: ConnectionSettings): ConnectionSettings {
  return {
    ...existing,
    ...patch,
    imported: patch.imported ?? existing?.imported,
    stageMappings: patch.stageMappings ?? existing?.stageMappings,
    userMappings: patch.userMappings ?? existing?.userMappings,
  };
}

const PROVIDERS = [
  { id: 'hubspot', name: 'HubSpot', status: 'available', mode: 'demo' },
  { id: 'salesforce', name: 'Salesforce', status: 'available', mode: 'demo' },
  { id: 'zoho', name: 'Zoho CRM', status: 'available', mode: 'demo' },
  { id: 'pipedrive', name: 'Pipedrive', status: 'available', mode: 'demo' },
];

export function listProviders(_req: AuthedRequest, res: Response) {
  res.json({ providers: PROVIDERS });
}

export async function getConnectionStatus(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    status: 'connected',
  });
  res.json({
    connected: Boolean(conn),
    provider: conn?.providerKey ?? null,
    lastSyncAt: conn?.lastSyncAt ?? null,
    mode: conn?.settings?.mode ?? null,
  });
}

export async function connectProvider(req: AuthedRequest, res: Response) {
  const providerKey = req.params.provider as string;
  const provider = PROVIDERS.find((p) => p.id === providerKey);
  if (!provider || provider.status !== 'available') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Provider not available' } });
    return;
  }

  await IntegrationConnection.updateMany(
    { workspaceId: req.tenant!.workspaceId, status: 'connected' },
    { status: 'disconnected' },
  );

  if (providerKey === 'hubspot' && hubspotOAuthConfigured()) {
    const pendingExisting = await IntegrationConnection.findOne({
      workspaceId: req.tenant!.workspaceId,
      providerKey,
    });
    const pendingSettings = ensureConnectionWebhookSecret(
      (pendingExisting?.settings ?? {}) as Record<string, unknown>,
    );
    await IntegrationConnection.findOneAndUpdate(
      { workspaceId: req.tenant!.workspaceId, providerKey },
      { status: 'pending', settings: { ...pendingSettings, mode: 'live' } },
      { upsert: true },
    );
    const authUrl = startCrmOAuth(res, req.tenant!.workspaceId, req.tenant!.userId, providerKey);
    if (authUrl) {
      res.json({ connected: false, provider: providerKey, mode: 'oauth', authUrl });
      return;
    }
  }

  const hasCredentials =
    providerKey === 'hubspot'
      ? hasHubSpotAccessToken() || Boolean(await getAccessToken(req.tenant!.workspaceId, 'hubspot'))
      : providerKey === 'salesforce'
        ? Boolean(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET)
        : providerKey === 'zoho'
          ? Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET)
          : false;

  const mode = hasCredentials ? 'live' : 'demo';

  const existing = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    providerKey,
  });
  const priorSettings = (existing?.settings ?? {}) as ConnectionSettings;
  const priorImported = priorSettings.imported ?? {};

  const settingsWithSecret = ensureConnectionWebhookSecret(
    mergeSettings(priorSettings, { mode, imported: priorImported }) as Record<string, unknown>,
  );

  const conn = await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey },
    {
      status: 'connected',
      externalAccountId: hasCredentials ? `live-${providerKey}` : `demo-${providerKey}`,
      settings: settingsWithSecret,
    },
    { upsert: true, new: true },
  );

  res.json({
    connected: true,
    provider: conn.providerKey,
    mode,
    message: mode === 'demo'
      ? `${provider.name} connected in demo mode — sync will import sample CRM data until OAuth credentials are configured.`
      : `${provider.name} connected — live sync enabled (HUBSPOT_ACCESS_TOKEN detected).`,
  });
}

export async function disconnectProvider(req: AuthedRequest, res: Response) {
  const providerKey = req.params.provider as string;
  const result = await IntegrationConnection.findOneAndUpdate(
    { workspaceId: req.tenant!.workspaceId, providerKey },
    { status: 'disconnected' },
    { new: true },
  );
  if (!result) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    return;
  }
  res.json({ disconnected: true, provider: providerKey });
}

export async function syncCrm(req: AuthedRequest, res: Response) {
  const conn = await IntegrationConnection.findOne({
    workspaceId: req.tenant!.workspaceId,
    status: 'connected',
  });
  if (!conn) {
    res.status(400).json({ error: { code: 'NOT_CONNECTED', message: 'Connect a CRM first' } });
    return;
  }

  const user = await User.findById(req.tenant!.userId);
  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  const hubspotToken =
    hasHubSpotAccessToken() || Boolean(await getAccessToken(req.tenant!.workspaceId, 'hubspot'));

  if (conn.providerKey === 'hubspot' && hubspotToken) {
    let result;
    try {
      result = await syncHubSpotToWorkspace({
        workspaceId: new Types.ObjectId(req.tenant!.workspaceId),
        ownerId: user._id,
      });
    } catch (err) {
      res.status(502).json({
        error: {
          code: 'HUBSPOT_SYNC_FAILED',
          message: err instanceof Error ? err.message : 'HubSpot sync failed',
        },
      });
      return;
    }
    const priorSettings = (conn.settings ?? {}) as ConnectionSettings;
    conn.set('settings', mergeSettings(priorSettings, {
      mode: 'live',
      lastHubSpotSync: result,
      syncProgress: {
        status: 'completed',
        processed: result.dealsCreated + result.dealsUpdated,
        total: result.dealsCreated + result.dealsUpdated + result.skipped,
      },
    }));
    conn.lastSyncAt = new Date();
    conn.markModified('settings');
    await conn.save();
    res.json({
      status: 'completed',
      provider: 'hubspot',
      mode: 'live',
      imported: {
        companies: result.companiesCreated + result.companiesUpdated,
        deals: result.dealsCreated + result.dealsUpdated,
        notes: result.notesCreated,
        tasks: result.tasksCreated,
        skipped: result.skipped,
      },
      lastSyncAt: conn.lastSyncAt,
    });
    return;
  }

  const priorSettings = JSON.parse(JSON.stringify(conn.settings ?? {})) as ConnectionSettings;
  const totalDeals = getDemoCrmRecords(conn.providerKey).length;

  conn.set('settings', mergeSettings(priorSettings, {
    syncProgress: { status: 'running', processed: 0, total: totalDeals },
  }));
  conn.markModified('settings');
  await conn.save();

  const result = await syncDemoCrmFromProvider({
    workspaceId: new Types.ObjectId(req.tenant!.workspaceId),
    ownerId: user._id,
    providerKey: conn.providerKey,
    settings: { imported: priorSettings.imported ?? {} },
  });

  conn.set('settings', mergeSettings(priorSettings, {
    mode: 'demo',
    imported: result.settings.imported ?? {},
    syncProgress: {
      status: 'completed',
      processed: result.dealsCreated + result.skipped,
      total: totalDeals,
    },
  }));
  conn.lastSyncAt = new Date();
  conn.markModified('settings');
  await conn.save();

  res.json({
    status: 'completed',
    provider: conn.providerKey,
    mode: 'demo',
    imported: {
      companies: result.companiesCreated,
      deals: result.dealsCreated,
      notes: result.notesCreated,
      skipped: result.skipped,
    },
    lastSyncAt: conn.lastSyncAt,
  });
}

export async function listCrmPipelines(req: AuthedRequest, res: Response) {
  const providerKey = req.params.provider as string;
  if (!PROVIDERS.some((p) => p.id === providerKey)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Unknown provider' } });
    return;
  }

  try {
    const conn = await IntegrationConnection.findOne({
      workspaceId: req.tenant!.workspaceId,
      providerKey,
    });
    const ctx = await buildCrmConnectionContext(req.tenant!.workspaceId, providerKey, conn);
    const connector = resolveCrmConnector(ctx);
    const pipelines = await connector.listPipelines(ctx);
    res.json({
      pipelines: pipelines.map((pipeline) => ({
        externalId: pipeline.externalId,
        name: pipeline.label,
      })),
    });
  } catch (err) {
    res.status(502).json({
      error: {
        code: 'CRM_DISCOVERY_FAILED',
        message: err instanceof Error ? err.message : 'Failed to list CRM pipelines',
      },
    });
  }
}

export async function listCrmStages(req: AuthedRequest, res: Response) {
  const providerKey = req.params.provider as string;
  if (!PROVIDERS.some((p) => p.id === providerKey)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Unknown provider' } });
    return;
  }
  const pipelineId = typeof req.query.pipelineId === 'string' ? req.query.pipelineId : 'default';

  try {
    const conn = await IntegrationConnection.findOne({
      workspaceId: req.tenant!.workspaceId,
      providerKey,
    });
    const ctx = await buildCrmConnectionContext(req.tenant!.workspaceId, providerKey, conn);
    const connector = resolveCrmConnector(ctx);
    const stages = await connector.listStages(ctx, pipelineId);
    res.json({ stages });
  } catch (err) {
    res.status(502).json({
      error: {
        code: 'CRM_DISCOVERY_FAILED',
        message: err instanceof Error ? err.message : 'Failed to list CRM stages',
      },
    });
  }
}

export async function listCrmOwners(req: AuthedRequest, res: Response) {
  const providerKey = req.params.provider as string;
  if (!PROVIDERS.some((p) => p.id === providerKey)) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Unknown provider' } });
    return;
  }
  res.json({ owners: getDemoCrmOwners(providerKey) });
}

export async function getStageMappings(req: AuthedRequest, res: Response) {
  const conn = await getConnectedConnection(req);
  if (!conn) {
    res.status(400).json({ error: { code: 'NOT_CONNECTED', message: 'Connect a CRM first' } });
    return;
  }

  await ensurePipelineStages(new Types.ObjectId(req.tenant!.workspaceId));
  const internalStages = await PipelineStage.find({ workspaceId: req.tenant!.workspaceId }).sort({ position: 1 });
  const pipelineId =
    typeof req.query.pipelineId === 'string' ? req.query.pipelineId : 'default';
  const crmStages = getDemoCrmStages(conn.providerKey, pipelineId);
  const settings = (conn.settings ?? {}) as ConnectionSettings;
  const saved = settings.stageMappings ?? [];

  const internal = internalStages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    stageType: s.stageType,
  }));

  const mappings = crmStages.map((crmStage) => {
    const existing = saved.find((m) => m.stageExternalId === crmStage.externalId);
    if (existing) return existing;
    const suggested = suggestInternalStageId(crmStage.label, internal);
    return {
      stageExternalId: crmStage.externalId,
      stageExternalLabel: crmStage.label,
      pipelineExternalId: crmStage.pipelineExternalId,
      internalStageId: suggested ?? internal[0]?.id ?? '',
    };
  });

  res.json({ crmStages, internalStages: internal, mappings });
}

export async function updateStageMappings(req: AuthedRequest, res: Response) {
  const conn = await getConnectedConnection(req);
  if (!conn) {
    res.status(400).json({ error: { code: 'NOT_CONNECTED', message: 'Connect a CRM first' } });
    return;
  }

  const body = req.body as { mappings?: StageMapping[] };
  if (!Array.isArray(body.mappings) || body.mappings.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'mappings array required' } });
    return;
  }

  const priorSettings = (conn.settings ?? {}) as ConnectionSettings;
  conn.set('settings', mergeSettings(priorSettings, { stageMappings: body.mappings }));
  conn.markModified('settings');
  await conn.save();

  res.json({ saved: true, mappings: body.mappings });
}

export async function getUserMappings(req: AuthedRequest, res: Response) {
  const conn = await getConnectedConnection(req);
  if (!conn) {
    res.status(400).json({ error: { code: 'NOT_CONNECTED', message: 'Connect a CRM first' } });
    return;
  }

  const crmOwners = getDemoCrmOwners(conn.providerKey);
  const members = await User.find({ workspaceId: req.tenant!.workspaceId, isActive: true }).sort({ createdAt: 1 });
  const settings = (conn.settings ?? {}) as ConnectionSettings;
  const saved = settings.userMappings ?? [];

  const mappings = crmOwners.map((owner) => {
    const existing = saved.find((m) => m.externalUserId === owner.externalId);
    if (existing) return existing;
    const matched = members.find(
      (m) => m.email.toLowerCase() === owner.email.toLowerCase(),
    );
    return {
      externalUserId: owner.externalId,
      externalEmail: owner.email,
      internalUserId: matched?.id ?? null,
    };
  });

  res.json({
    crmOwners,
    workspaceMembers: members.map((m) => ({
      id: m.id,
      email: m.email,
      displayName: m.displayName,
    })),
    mappings,
  });
}

export async function updateUserMappings(req: AuthedRequest, res: Response) {
  const conn = await getConnectedConnection(req);
  if (!conn) {
    res.status(400).json({ error: { code: 'NOT_CONNECTED', message: 'Connect a CRM first' } });
    return;
  }

  const body = req.body as { mappings?: UserMapping[] };
  if (!Array.isArray(body.mappings)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'mappings array required' } });
    return;
  }

  const priorSettings = (conn.settings ?? {}) as ConnectionSettings;
  conn.set('settings', mergeSettings(priorSettings, { userMappings: body.mappings }));
  conn.markModified('settings');
  await conn.save();

  res.json({ saved: true, mappings: body.mappings });
}

export async function getIncrementalSyncStatus(req: AuthedRequest, res: Response) {
  const conn = await getConnectedConnection(req);
  if (!conn) {
    res.json({
      connected: false,
      lastSyncAt: null,
      errorCount: 0,
      pendingJobs: 0,
    });
    return;
  }

  const settings = (conn.settings ?? {}) as ConnectionSettings;
  const queueStats = await getCrmIncrementalQueueStats(req.tenant!.workspaceId);
  const settingsErrorCount = settings.incrementalSyncErrorCount ?? 0;

  res.json({
    connected: true,
    provider: conn.providerKey,
    lastSyncAt: conn.lastSyncAt ?? null,
    errorCount: Math.max(queueStats.errorCount, settingsErrorCount),
    pendingJobs: queueStats.pendingJobs,
  });
}

export async function getSyncStatus(req: AuthedRequest, res: Response) {
  const conn = await getConnectedConnection(req);
  if (!conn) {
    res.json({
      status: 'idle' as const,
      processed: 0,
      total: 0,
      connected: false,
    });
    return;
  }

  const settings = (conn.settings ?? {}) as ConnectionSettings;
  const total = getDemoCrmRecords(conn.providerKey).length;
  const progress = settings.syncProgress ?? { status: 'idle' as const, processed: 0, total };

  res.json({
    connected: true,
    provider: conn.providerKey,
    status: progress.status,
    processed: progress.processed,
    total: progress.total || total,
    lastSyncAt: conn.lastSyncAt ?? null,
  });
}
