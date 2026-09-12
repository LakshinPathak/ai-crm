import type { Types } from 'mongoose';
import { Company, Deal, IntegrationConnection, PipelineStage } from '@ai-crm/db';
import { ensurePipelineStages } from '../seed.js';
import { resolveWorkspaceAccessToken } from '../integrations/workspace-tokens.js';
import { salesforceQueryPath, salesforceRequest } from './client.js';

const PROVIDER = 'salesforce';

const OPPORTUNITY_SOQL =
  'SELECT Id, Name, Amount, StageName, Probability, CloseDate, IsClosed, IsWon, AccountId, Account.Name, LastModifiedDate FROM Opportunity LIMIT 200';

type SfAccount = {
  Name?: string | null;
};

export type SfOpportunity = {
  Id: string;
  Name?: string | null;
  Amount?: number | null;
  StageName?: string | null;
  Probability?: number | null;
  CloseDate?: string | null;
  IsClosed?: boolean | null;
  IsWon?: boolean | null;
  AccountId?: string | null;
  Account?: SfAccount | null;
  LastModifiedDate?: string | null;
};

type SfQueryResponse = {
  records?: SfOpportunity[];
};

type ConnectionSettings = {
  instanceUrl?: string;
};

export type SalesforceSyncResult = {
  companiesCreated: number;
  companiesUpdated: number;
  dealsCreated: number;
  dealsUpdated: number;
  skipped: number;
};

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function mapDealStatus(opp: SfOpportunity): 'open' | 'won' | 'lost' {
  if (opp.IsWon) return 'won';
  if (opp.IsClosed) return 'lost';
  return 'open';
}

function pickStage(
  opp: SfOpportunity,
  openStages: Array<{ _id: Types.ObjectId; stageType: string }>,
  closedWon?: { _id: Types.ObjectId },
  closedLost?: { _id: Types.ObjectId },
): { _id: Types.ObjectId } {
  if (opp.IsWon && closedWon) return closedWon;
  if (opp.IsClosed && !opp.IsWon && closedLost) return closedLost;

  const probability = Number(opp.Probability ?? 0);
  const clamped = Number.isFinite(probability) ? Math.min(100, Math.max(0, probability)) : 0;
  const idx =
    openStages.length <= 1
      ? 0
      : Math.min(openStages.length - 1, Math.floor((clamped / 100) * openStages.length));
  return openStages[idx] ?? openStages[0];
}

async function upsertCompany(params: {
  workspaceId: Types.ObjectId;
  accountId: string | null | undefined;
  accountName: string;
}): Promise<{ companyId: Types.ObjectId; created: boolean; updated: boolean }> {
  const { workspaceId, accountId, accountName } = params;

  let company = accountId
    ? await Company.findOne({
        workspaceId,
        crmProvider: PROVIDER,
        crmExternalId: accountId,
        deletedAt: null,
      })
    : null;

  if (!company) {
    company = await Company.findOne({
      workspaceId,
      name: accountName,
      deletedAt: null,
    });
  }

  if (company) {
    company.name = accountName || company.name;
    if (accountId) {
      company.crmExternalId = accountId;
      company.crmProvider = PROVIDER;
    }
    await company.save();
    return { companyId: company._id, created: false, updated: true };
  }

  company = await Company.create({
    workspaceId,
    name: accountName || 'Unknown Company',
    crmExternalId: accountId ?? undefined,
    crmProvider: PROVIDER,
  });
  return { companyId: company._id, created: true, updated: false };
}

export async function syncSalesforceToWorkspace(params: {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
}): Promise<SalesforceSyncResult> {
  const { workspaceId, ownerId } = params;
  const workspaceIdStr = workspaceId.toString();

  const accessToken = await resolveWorkspaceAccessToken(workspaceIdStr, PROVIDER);
  if (!accessToken) {
    throw new Error('Salesforce access token is not available for this workspace');
  }

  const conn = await IntegrationConnection.findOne({
    workspaceId,
    providerKey: PROVIDER,
  });
  const instanceUrl = (conn?.settings as ConnectionSettings | undefined)?.instanceUrl;
  if (!instanceUrl) {
    throw new Error('Salesforce instance URL is missing on the integration connection');
  }

  await ensurePipelineStages(workspaceId);

  const localStages = await PipelineStage.find({ workspaceId }).sort({ position: 1 });
  const openStages = localStages.filter((s) => s.stageType === 'open');
  if (openStages.length === 0) {
    throw new Error('No open pipeline stages in workspace — run onboarding or seed first');
  }
  const closedWon = localStages.find((s) => s.stageType === 'closed_won');
  const closedLost = localStages.find((s) => s.stageType === 'closed_lost');

  const query = await salesforceRequest<SfQueryResponse>({
    instanceUrl,
    accessToken,
    path: salesforceQueryPath(OPPORTUNITY_SOQL),
  });

  const records = query.records ?? [];
  let companiesCreated = 0;
  let companiesUpdated = 0;
  let dealsCreated = 0;
  let dealsUpdated = 0;
  let skipped = 0;
  const countedAccounts = new Set<string>();
  let positionOffset = await Deal.countDocuments({ workspaceId, deletedAt: null });

  for (const opp of records) {
    if (!opp?.Id) {
      skipped += 1;
      continue;
    }

    const accountName = opp.Account?.Name?.trim() || 'Unknown Company';
    const { companyId, created } = await upsertCompany({
      workspaceId,
      accountId: opp.AccountId,
      accountName,
    });
    const accountKey = opp.AccountId || `name:${accountName}`;
    if (!countedAccounts.has(accountKey)) {
      countedAccounts.add(accountKey);
      if (created) companiesCreated += 1;
      else companiesUpdated += 1;
    }

    const existing = await Deal.findOne({
      workspaceId,
      crmProvider: PROVIDER,
      crmExternalId: opp.Id,
      deletedAt: null,
    });

    const amount = Number(opp.Amount ?? 0);
    const winProbability = Number.isFinite(Number(opp.Probability))
      ? Math.min(100, Math.max(0, Number(opp.Probability)))
      : amount > 150000
        ? 65
        : amount > 80000
          ? 55
          : 40;
    const localStage = pickStage(opp, openStages, closedWon, closedLost);
    const status = mapDealStatus(opp);
    const expectedCloseDate = parseDate(opp.CloseDate);
    const lastActivityAt = parseDate(opp.LastModifiedDate) ?? new Date();
    const closedAt = status === 'open' ? undefined : expectedCloseDate ?? lastActivityAt;

    if (existing) {
      existing.title = opp.Name ?? existing.title;
      existing.amount = Number.isFinite(amount) ? amount : existing.amount;
      existing.stageId = localStage._id;
      existing.companyId = companyId;
      existing.status = status;
      existing.winProbability = winProbability;
      existing.sentiment = winProbability >= 60 ? 'green' : winProbability >= 40 ? 'yellow' : 'red';
      existing.expectedCloseDate = expectedCloseDate ?? existing.expectedCloseDate;
      existing.lastActivityAt = lastActivityAt;
      if (closedAt) existing.closedAt = closedAt;
      await existing.save();
      dealsUpdated += 1;
    } else {
      await Deal.create({
        workspaceId,
        companyId,
        title: opp.Name ?? 'Untitled Opportunity',
        amount: Number.isFinite(amount) ? amount : 0,
        stageId: localStage._id,
        position: positionOffset,
        ownerId,
        status,
        winProbability,
        sentiment: winProbability >= 60 ? 'green' : winProbability >= 40 ? 'yellow' : 'red',
        lastActivityAt,
        expectedCloseDate,
        closedAt,
        crmExternalId: opp.Id,
        crmProvider: PROVIDER,
      });
      positionOffset += 1;
      dealsCreated += 1;
    }
  }

  return {
    companiesCreated,
    companiesUpdated,
    dealsCreated,
    dealsUpdated,
    skipped,
  };
}
