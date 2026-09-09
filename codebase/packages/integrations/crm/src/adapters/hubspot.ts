import type {
  CanonicalCrmDeal,
  CrmConnectionContext,
  CrmConnector,
  CrmOwner,
  CrmPipeline,
  CrmStage,
  PageResult,
  SyncCursor,
} from '../types.js';

const BASE = 'https://api.hubapi.com';

type HubSpotPipeline = {
  id: string;
  label: string;
  stages: Array<{ id: string; label: string; displayOrder: number }>;
};

type HubSpotOwner = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type HubSpotDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    hs_lastmodifieddate?: string;
    hubspot_owner_id?: string;
    hs_deal_stage_probability?: string;
    hs_is_closed?: string;
    hs_is_closed_won?: string;
  };
};

function resolveAccessToken(ctx: CrmConnectionContext): string {
  const token =
    ctx.accessToken ??
    process.env.HUBSPOT_ACCESS_TOKEN ??
    process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    throw new Error(
      'HubSpot access token required — set HUBSPOT_ACCESS_TOKEN or connect with OAuth.',
    );
  }
  return token;
}

async function hubspotFetch<T>(
  ctx: CrmConnectionContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = resolveAccessToken(ctx);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: T & { message?: string };
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = data.message ?? text.slice(0, 300);
    throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

function mapDealStatus(properties: HubSpotDeal['properties']): CanonicalCrmDeal['status'] {
  if (properties.hs_is_closed_won === 'true') return 'won';
  if (properties.hs_is_closed === 'true') return 'lost';
  return 'open';
}

function toCanonicalDeal(deal: HubSpotDeal): CanonicalCrmDeal {
  const amount = Number.parseFloat(deal.properties.amount ?? '0');
  const probabilityRaw = deal.properties.hs_deal_stage_probability;
  const probability = probabilityRaw ? Number.parseFloat(probabilityRaw) : null;

  return {
    externalId: deal.id,
    provider: 'hubspot',
    pipelineExternalId: deal.properties.pipeline ?? null,
    stageExternalId: deal.properties.dealstage ?? '',
    title: deal.properties.dealname ?? 'Untitled deal',
    amount: Number.isFinite(amount) ? amount : 0,
    currency: 'USD',
    status: mapDealStatus(deal.properties),
    ownerExternalId: deal.properties.hubspot_owner_id ?? null,
    companyExternalId: null,
    companyName: null,
    expectedCloseDate: deal.properties.closedate ?? null,
    probability: probability !== null && Number.isFinite(probability) ? probability : null,
    updatedAt: deal.properties.hs_lastmodifieddate ?? new Date().toISOString(),
  };
}

export class HubSpotCrmConnector implements CrmConnector {
  readonly provider = 'hubspot' as const;
  readonly displayName = 'HubSpot';

  private async fetchPipelines(ctx: CrmConnectionContext): Promise<HubSpotPipeline[]> {
    const res = await hubspotFetch<{ results: HubSpotPipeline[] }>(
      ctx,
      'GET',
      '/crm/v3/pipelines/deals',
    );
    return res.results ?? [];
  }

  async listPipelines(ctx: CrmConnectionContext): Promise<CrmPipeline[]> {
    const pipelines = await this.fetchPipelines(ctx);
    return pipelines.map((p) => ({ externalId: p.id, label: p.label }));
  }

  async listStages(ctx: CrmConnectionContext, pipelineId: string): Promise<CrmStage[]> {
    const pipelines = await this.fetchPipelines(ctx);
    const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
    if (!pipeline) return [];

    return [...pipeline.stages]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((stage) => ({
        externalId: stage.id,
        label: stage.label,
        pipelineExternalId: pipeline.id,
        displayOrder: stage.displayOrder,
      }));
  }

  async listOwners(ctx: CrmConnectionContext): Promise<CrmOwner[]> {
    const res = await hubspotFetch<{ results: HubSpotOwner[] }>(ctx, 'GET', '/crm/v3/owners/?limit=100');
    return (res.results ?? []).map((owner) => ({
      externalId: owner.id,
      email: owner.email ?? '',
      name: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || owner.id,
    }));
  }

  async fetchDealsPage(ctx: CrmConnectionContext, cursor?: SyncCursor): Promise<PageResult<CanonicalCrmDeal>> {
    const res = await hubspotFetch<{
      results: HubSpotDeal[];
      paging?: { next?: { after: string } };
    }>(ctx, 'POST', '/crm/v3/objects/deals/search', {
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'closedate',
        'hs_lastmodifieddate',
        'hubspot_owner_id',
        'hs_deal_stage_probability',
        'hs_is_closed',
        'hs_is_closed_won',
      ],
      limit: 50,
      after: cursor?.after,
    });

    const after = res.paging?.next?.after;
    return {
      items: (res.results ?? []).map(toCanonicalDeal),
      hasMore: Boolean(after),
      nextCursor: after ? { after } : undefined,
    };
  }

  async healthCheck(ctx: CrmConnectionContext) {
    try {
      await hubspotFetch(ctx, 'GET', '/crm/v3/pipelines/deals');
      return { ok: true, message: 'HubSpot API reachable' };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'HubSpot health check failed',
      };
    }
  }
}
