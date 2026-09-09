export type {
  CanonicalCrmDeal,
  CrmConnectionContext,
  CrmConnectionMode,
  CrmConnector,
  CrmOwner,
  CrmPipeline,
  CrmProvider,
  CrmStage,
  PageResult,
  SyncCursor,
} from './types.js';

export { DemoCrmConnector } from './adapters/demo.js';
export { HubSpotCrmConnector } from './adapters/hubspot.js';
export { crmConnectorRegistry, resolveCrmConnector } from './registry.js';
