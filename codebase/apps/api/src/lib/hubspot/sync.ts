import type { Types } from 'mongoose';
import { ensurePipelineStages } from '../seed.js';
import { hubspotRequest, searchObjects } from './client.js';
import { Company, Deal, Note, PipelineStage, Task } from '@ai-crm/db';

type HsDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    hs_lastmodifieddate?: string;
  };
};

type HsCompany = {
  id: string;
  properties: { name?: string; domain?: string; industry?: string };
};

type HsNote = {
  id: string;
  properties: { hs_note_body?: string };
};

type HsTask = {
  id: string;
  properties: {
    hs_task_subject?: string;
    hs_task_status?: string;
    hs_timestamp?: string;
  };
};

const PROVIDER = 'hubspot';

function stageIndexFromHubSpot(stageId: string, stageMap: Map<string, number>): number {
  const idx = stageMap.get(stageId);
  return idx !== undefined ? idx : 0;
}

export type HubSpotSyncResult = {
  companiesCreated: number;
  companiesUpdated: number;
  dealsCreated: number;
  dealsUpdated: number;
  notesCreated: number;
  tasksCreated: number;
  skipped: number;
};

export async function syncHubSpotToWorkspace(params: {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
}): Promise<HubSpotSyncResult> {
  const { workspaceId, ownerId } = params;
  const workspaceIdStr = workspaceId.toString();
  const hsRequest = <T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: { isSearch?: boolean },
  ) => hubspotRequest<T>(method, path, body, { ...opts, workspaceId: workspaceIdStr });

  await ensurePipelineStages(workspaceId);

  const pipelines = await hsRequest<{
    results: Array<{ id: string; stages: Array<{ id: string; label: string; displayOrder: number }> }>;
  }>('GET', '/crm/v3/pipelines/deals');

  const hsStages = pipelines.results[0]?.stages ?? [];
  const localStages = await PipelineStage.find({ workspaceId }).sort({ position: 1 });
  const openStages = localStages.filter((s) => s.stageType === 'open');
  if (openStages.length === 0) {
    throw new Error('No open pipeline stages in workspace — run onboarding or seed first');
  }

  const stageMap = new Map<string, number>();
  const sortedHs = [...hsStages].sort((a, b) => a.displayOrder - b.displayOrder);
  sortedHs.forEach((s, i) => {
    stageMap.set(s.id, Math.min(i, openStages.length - 1));
  });

  const companiesRes = await searchObjects<HsCompany>(
    'companies',
    {
      properties: ['name', 'domain', 'industry'],
      limit: 100,
    },
    workspaceIdStr,
  );

  let companiesCreated = 0;
  let companiesUpdated = 0;
  const companyIdMap = new Map<string, Types.ObjectId>();

  for (const hs of companiesRes.results) {
    let company = await Company.findOne({
      workspaceId,
      crmProvider: PROVIDER,
      crmExternalId: hs.id,
      deletedAt: null,
    });
    if (!company && hs.properties.domain) {
      company = await Company.findOne({ workspaceId, domain: hs.properties.domain, deletedAt: null });
    }
    if (company) {
      company.name = hs.properties.name ?? company.name;
      company.domain = hs.properties.domain ?? company.domain;
      company.industry = hs.properties.industry ?? company.industry;
      company.crmExternalId = hs.id;
      company.crmProvider = PROVIDER;
      await company.save();
      companiesUpdated += 1;
    } else {
      company = await Company.create({
        workspaceId,
        name: hs.properties.name ?? 'Unknown Company',
        domain: hs.properties.domain,
        industry: hs.properties.industry,
        crmExternalId: hs.id,
        crmProvider: PROVIDER,
      });
      companiesCreated += 1;
    }
    companyIdMap.set(hs.id, company._id);
  }

  const dealsRes = await searchObjects<HsDeal>(
    'deals',
    {
      properties: ['dealname', 'amount', 'dealstage', 'closedate', 'hs_lastmodifieddate'],
      limit: 100,
    },
    workspaceIdStr,
  );

  let dealsCreated = 0;
  let dealsUpdated = 0;
  let skipped = 0;
  const dealIdMap = new Map<string, Types.ObjectId>();

  for (const hs of dealsRes.results) {
    const existing = await Deal.findOne({
      workspaceId,
      crmProvider: PROVIDER,
      crmExternalId: hs.id,
      deletedAt: null,
    });

    const assoc = await hsRequest<{
      results: Array<{ toObjectId: string }>;
    }>('GET', `/crm/v4/objects/deals/${hs.id}/associations/companies`).catch(() => ({ results: [] }));

    const hsCompanyId = assoc.results[0]?.toObjectId;
    let companyId = hsCompanyId ? companyIdMap.get(hsCompanyId) : undefined;
    if (!companyId) {
      const fallback = await Company.findOne({ workspaceId, deletedAt: null });
      if (!fallback) {
        skipped += 1;
        continue;
      }
      companyId = fallback._id;
    }

    const stageIdx = stageIndexFromHubSpot(hs.properties.dealstage ?? '', stageMap);
    const localStage = openStages[stageIdx] ?? openStages[0];
    const amount = Number(hs.properties.amount ?? 0);
    const winProbability = amount > 150000 ? 65 : amount > 80000 ? 55 : 40;

    if (existing) {
      existing.title = hs.properties.dealname ?? existing.title;
      existing.amount = amount;
      existing.stageId = localStage._id;
      existing.expectedCloseDate = hs.properties.closedate ? new Date(hs.properties.closedate) : existing.expectedCloseDate;
      existing.lastActivityAt = new Date();
      await existing.save();
      dealsUpdated += 1;
      dealIdMap.set(hs.id, existing._id);
    } else {
      const count = await Deal.countDocuments({ workspaceId, deletedAt: null });
      const deal = await Deal.create({
        workspaceId,
        companyId,
        title: hs.properties.dealname ?? 'Untitled Deal',
        amount,
        stageId: localStage._id,
        position: count,
        ownerId,
        winProbability,
        sentiment: winProbability >= 60 ? 'green' : winProbability >= 40 ? 'yellow' : 'red',
        lastActivityAt: new Date(),
        expectedCloseDate: hs.properties.closedate ? new Date(hs.properties.closedate) : undefined,
        crmExternalId: hs.id,
        crmProvider: PROVIDER,
      });
      dealsCreated += 1;
      dealIdMap.set(hs.id, deal._id);
    }
  }

  const notesRes = await searchObjects<HsNote>(
    'notes',
    {
      properties: ['hs_note_body'],
      limit: 100,
    },
    workspaceIdStr,
  );

  let notesCreated = 0;
  for (const hs of notesRes.results) {
    const exists = await Note.findOne({ workspaceId, crmProvider: PROVIDER, crmExternalId: hs.id });
    if (exists) continue;

    const assoc = await hsRequest<{
      results: Array<{ toObjectId: string }>;
    }>('GET', `/crm/v4/objects/notes/${hs.id}/associations/deals`).catch(() => ({ results: [] }));

    const dealMongoId = assoc.results[0] ? dealIdMap.get(assoc.results[0].toObjectId) : undefined;
    if (!dealMongoId) continue;

    await Note.create({
      workspaceId,
      dealId: dealMongoId,
      authorId: ownerId,
      body: hs.properties.hs_note_body ?? '',
      crmExternalId: hs.id,
      crmProvider: PROVIDER,
    });
    notesCreated += 1;
  }

  const tasksRes = await searchObjects<HsTask>(
    'tasks',
    {
      properties: ['hs_task_subject', 'hs_task_status', 'hs_timestamp'],
      limit: 100,
    },
    workspaceIdStr,
  );

  let tasksCreated = 0;
  for (const hs of tasksRes.results) {
    const exists = await Task.findOne({ workspaceId, crmProvider: PROVIDER, crmExternalId: hs.id });
    if (exists) continue;

    const assoc = await hsRequest<{
      results: Array<{ toObjectId: string }>;
    }>('GET', `/crm/v4/objects/tasks/${hs.id}/associations/deals`).catch(() => ({ results: [] }));

    const dealMongoId = assoc.results[0] ? dealIdMap.get(assoc.results[0].toObjectId) : undefined;
    if (!dealMongoId) continue;

    await Task.create({
      workspaceId,
      dealId: dealMongoId,
      title: hs.properties.hs_task_subject ?? 'Task',
      assigneeId: ownerId,
      status: hs.properties.hs_task_status === 'COMPLETED' ? 'done' : 'open',
      dueDate: hs.properties.hs_timestamp ? new Date(Number(hs.properties.hs_timestamp)) : undefined,
      crmExternalId: hs.id,
      crmProvider: PROVIDER,
    });
    tasksCreated += 1;
  }

  return {
    companiesCreated,
    companiesUpdated,
    dealsCreated,
    dealsUpdated,
    notesCreated,
    tasksCreated,
    skipped,
  };
}
