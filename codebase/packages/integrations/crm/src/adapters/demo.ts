import { getDemoDeals, getDemoOwners, getDemoPipelines, getDemoStages } from '../demo-data.js';
import type {
  CrmConnectionContext,
  CrmConnector,
  CrmProvider,
  PageResult,
  SyncCursor,
} from '../types.js';

export class DemoCrmConnector implements CrmConnector {
  readonly provider: CrmProvider;
  readonly displayName: string;

  constructor(provider: CrmProvider, displayName: string) {
    this.provider = provider;
    this.displayName = displayName;
  }

  async listPipelines(_ctx: CrmConnectionContext) {
    return getDemoPipelines(this.provider);
  }

  async listStages(_ctx: CrmConnectionContext, pipelineId: string) {
    return getDemoStages(this.provider, pipelineId);
  }

  async listOwners(_ctx: CrmConnectionContext) {
    return getDemoOwners(this.provider);
  }

  async fetchDealsPage(_ctx: CrmConnectionContext, cursor?: SyncCursor): Promise<PageResult<import('../types.js').CanonicalCrmDeal>> {
    const all = getDemoDeals(this.provider);
    const page = cursor?.page ?? 0;
    const pageSize = 50;
    const slice = all.slice(page * pageSize, (page + 1) * pageSize);
    return {
      items: slice,
      hasMore: (page + 1) * pageSize < all.length,
      nextCursor: (page + 1) * pageSize < all.length ? { page: page + 1 } : undefined,
    };
  }

  async healthCheck(_ctx: CrmConnectionContext) {
    return { ok: true, message: 'Demo mode' };
  }
}
