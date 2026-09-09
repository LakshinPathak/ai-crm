export type CrmProvider = 'hubspot' | 'pipedrive' | 'zoho' | 'salesforce';

export type CrmConnectionMode = 'demo' | 'live';

export interface CrmConnectionContext {
  workspaceId: string;
  providerKey: CrmProvider;
  mode: CrmConnectionMode;
  accessToken?: string;
  externalAccountId?: string;
}

export interface CrmPipeline {
  externalId: string;
  label: string;
}

export interface CrmStage {
  externalId: string;
  label: string;
  pipelineExternalId: string;
  displayOrder: number;
}

export interface CrmOwner {
  externalId: string;
  email: string;
  name: string;
}

export interface CanonicalCrmDeal {
  externalId: string;
  provider: CrmProvider;
  pipelineExternalId: string | null;
  stageExternalId: string;
  title: string;
  amount: number;
  currency: string;
  status: 'open' | 'won' | 'lost';
  ownerExternalId: string | null;
  companyExternalId: string | null;
  companyName: string | null;
  expectedCloseDate: string | null;
  probability: number | null;
  updatedAt: string;
}

export interface SyncCursor {
  after?: string;
  page?: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor?: SyncCursor;
  hasMore: boolean;
}

export interface CrmConnector {
  readonly provider: CrmProvider;
  readonly displayName: string;

  listPipelines(ctx: CrmConnectionContext): Promise<CrmPipeline[]>;
  listStages(ctx: CrmConnectionContext, pipelineId: string): Promise<CrmStage[]>;
  listOwners(ctx: CrmConnectionContext): Promise<CrmOwner[]>;
  fetchDealsPage(ctx: CrmConnectionContext, cursor?: SyncCursor): Promise<PageResult<CanonicalCrmDeal>>;
  healthCheck(ctx: CrmConnectionContext): Promise<{ ok: boolean; message?: string }>;
}
