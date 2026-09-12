export type MeResponse = {
  user: { id: string; email: string; displayName: string; role: string; avatarUrl?: string | null };
  workspace: { id: string; name: string; slug: string; onboardingCompletedAt?: string | null } | null;
};

export type OnboardingStatus = {
  completed: boolean;
  currentStep: number;
  selectedProvider: string | null;
};

export type CrmConnectResult = {
  connected: boolean;
  provider: string;
  mode: 'demo' | 'live' | 'oauth';
  message?: string;
  authUrl?: string;
};

export type CrmStageMappingRow = {
  stageExternalId: string;
  stageExternalLabel: string;
  pipelineExternalId?: string | null;
  internalStageId: string;
};

export type StageMappingsResponse = {
  crmStages: Array<{ externalId: string; label: string; pipelineExternalId: string }>;
  internalStages: Array<{ id: string; name: string; color?: string; stageType: string }>;
  mappings: CrmStageMappingRow[];
};

export type UserMappingRow = {
  externalUserId: string;
  externalEmail?: string | null;
  internalUserId: string | null;
};

export type UserMappingsResponse = {
  crmOwners: Array<{ externalId: string; email: string; name: string }>;
  workspaceMembers: Array<{ id: string; email: string; displayName: string }>;
  mappings: UserMappingRow[];
};

export type SyncStatusResponse = {
  connected: boolean;
  provider?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  processed: number;
  total: number;
  lastSyncAt?: string | null;
};

/** GET /integrations/crm/sync-status — incremental queue + connection health */
export type CrmIncrementalSyncStatusResponse = {
  connected: boolean;
  provider?: string;
  lastSyncAt?: string | null;
  errorCount: number;
  pendingJobs: number;
};

export type DealCard = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  companyName: string;
  sentiment: 'green' | 'yellow' | 'red';
  isHot: boolean;
  winProbability: number;
  blockerCount?: number;
  meddpiccCompleteness?: number;
};

export type BoardResponse = {
  stages: Array<{
    id: string;
    name: string;
    color: string;
    deals: DealCard[];
  }>;
  metrics: { dealCount: number; totalAmount: number; hotCount: number };
};

export type DealMetricsResponse = {
  metrics: {
    openCount: number;
    totalValue: number;
    wonCount: number;
    lostCount: number;
  };
};

export type DealSearchResult = DealCard & { stageId: string };

export type DealSearchResponse = {
  deals: DealSearchResult[];
  page: number;
  limit: number;
  total: number;
  q: string;
};

export type HomeDealCard = DealCard & { riskReason?: 'stalled' | 'red_sentiment' };

export type ForecastInsightsResponse = {
  stub: boolean;
  message: string;
  kpis: Array<{
    id: string;
    label: string;
    value: number;
    format?: 'percent' | 'currency' | 'number';
    changePct?: number;
    sub?: string;
  }>;
  winRateTrend: Array<{ period: string; winRate: number }>;
};

/** POST /insights/sql — read-only SELECT stub (workspace overview metrics). */
export type InsightsSqlResponse = {
  stub: boolean;
  message: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  rowCount: number;
};

export type HomeResponse = {
  focusDeals: HomeDealCard[];
  atRiskDeals: HomeDealCard[];
  approvalCount: number;
  pipelineSnapshot: {
    dealCount: number;
    totalAmount: number;
    hotCount: number;
    atRiskCount: number;
    stages: Array<{ id: string; name: string; color: string; dealCount: number }>;
  };
  recentActivity: Array<{
    type: string;
    dealId: string;
    title: string;
    at: string;
    description?: string;
  }>;
};

export type CompanySummary = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
};

export type CompanyDetail = CompanySummary & {
  logoUrl: string | null;
  employeeCount: number | null;
};

export type CompanyDeal = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  sentiment: DealCard['sentiment'];
  isHot: boolean;
  winProbability: number;
  status: string;
  blockerCount: number;
};

export type CompaniesListResponse = { companies: CompanySummary[] };

export type CompanyDetailResponse = {
  company: CompanyDetail;
  deals: CompanyDeal[];
};

/** GET /deals/:dealId/meddpicc letter section */
export type MeddpiccLetter = {
  label: string;
  summary: string;
  confidence: number;
  chunkId?: string;
  artifactId?: string;
  excerpt?: string;
  /** Present only when the API includes a call id; used to link `/calls/[id]`. */
  callId?: string;
};
