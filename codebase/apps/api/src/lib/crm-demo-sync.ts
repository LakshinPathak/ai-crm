import { Types } from 'mongoose';
import { Company, Deal, Note, PipelineStage } from '@ai-crm/db';
import { getDemoCrmRecords } from './crm-demo-data.js';
import { DEFAULT_PIPELINE_STAGES, ensurePipelineStages } from './seed.js';

type SyncSettings = {
  imported?: Record<string, { companyId: string; dealId: string }>;
};

export type CrmSyncResult = {
  companiesCreated: number;
  dealsCreated: number;
  notesCreated: number;
  skipped: number;
  settings: SyncSettings;
};

export async function syncDemoCrmFromProvider(params: {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  providerKey: string;
  settings?: SyncSettings;
}): Promise<CrmSyncResult> {
  const { workspaceId, ownerId, providerKey } = params;
  const settings: SyncSettings = params.settings ?? { imported: {} };
  if (!settings.imported) settings.imported = {};

  await ensurePipelineStages(workspaceId);
  const stages = await PipelineStage.find({ workspaceId }).sort({ position: 1 });
  const openStages = stages.filter((s) => s.stageType === 'open');
  if (openStages.length === 0) {
    throw new Error('No pipeline stages found');
  }

  const records = getDemoCrmRecords(providerKey);
  let companiesCreated = 0;
  let dealsCreated = 0;
  let notesCreated = 0;
  let skipped = 0;

  const existingDeals = await Deal.countDocuments({ workspaceId, deletedAt: null });
  let positionOffset = existingDeals;

  for (const record of records) {
    const key = `${providerKey}:${record.externalId}`;
    if (settings.imported[key]) {
      skipped += 1;
      continue;
    }

    let company = await Company.findOne({
      workspaceId,
      domain: record.company.domain,
      deletedAt: null,
    });
    if (!company) {
      company = await Company.create({
        workspaceId,
        name: record.company.name,
        domain: record.company.domain,
        industry: record.company.industry,
      });
      companiesCreated += 1;
    }

    const stageIdx = Math.min(record.deal.stageIndex, openStages.length - 1);
    const stage = openStages[stageIdx] ?? openStages[0];
    const now = new Date();

    const deal = await Deal.create({
      workspaceId,
      companyId: company._id,
      title: record.deal.title,
      amount: record.deal.amount,
      stageId: stage._id,
      position: positionOffset,
      ownerId,
      sentiment: record.deal.sentiment,
      isHot: record.deal.isHot ?? false,
      winProbability: record.deal.winProbability,
      lastActivityAt: now,
      expectedCloseDate: new Date(now.getTime() + (30 + stageIdx * 14) * 86400000),
    });
    positionOffset += 1;
    dealsCreated += 1;

    if (record.deal.note) {
      await Note.create({
        workspaceId,
        dealId: deal._id,
        authorId: ownerId,
        body: record.deal.note,
      });
      notesCreated += 1;
    }

    settings.imported[key] = {
      companyId: company.id,
      dealId: deal.id,
    };
  }

  return { companiesCreated, dealsCreated, notesCreated, skipped, settings };
}

export { DEFAULT_PIPELINE_STAGES };
