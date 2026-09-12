import { Router } from 'express';
import {
  connectProvider,
  disconnectProvider,
  getConnectionStatus,
  getSalesforceStatus,
  getStageMappings,
  getIncrementalSyncStatus,
  getSyncStatus,
  getUserMappings,
  listCrmOwners,
  listCrmPipelines,
  listCrmStages,
  listProviders,
  syncCrm,
  updateStageMappings,
  updateUserMappings,
} from './handlers.js';

export const integrationsCrmRouter = Router();
integrationsCrmRouter.get('/providers', listProviders);
integrationsCrmRouter.get('/status', getConnectionStatus);
integrationsCrmRouter.get('/salesforce/status', getSalesforceStatus);
integrationsCrmRouter.get('/mappings/stages', getStageMappings);
integrationsCrmRouter.patch('/mappings/stages', updateStageMappings);
integrationsCrmRouter.get('/mappings/users', getUserMappings);
integrationsCrmRouter.patch('/mappings/users', updateUserMappings);
integrationsCrmRouter.get('/sync-status', getIncrementalSyncStatus);
integrationsCrmRouter.get('/sync/status', getSyncStatus);
integrationsCrmRouter.post('/sync', syncCrm);
integrationsCrmRouter.post('/connect/:provider', connectProvider);
integrationsCrmRouter.delete('/connect/:provider', disconnectProvider);
integrationsCrmRouter.get('/:provider/pipelines', listCrmPipelines);
integrationsCrmRouter.get('/:provider/stages', listCrmStages);
integrationsCrmRouter.get('/:provider/owners', listCrmOwners);
