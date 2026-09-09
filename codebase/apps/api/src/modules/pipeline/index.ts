import { Router } from 'express';
import { requireAdmin } from '../../lib/auth/index.js';
import { listSalesProcesses, listStages, updateStage } from './handlers.js';

export const pipelineRouter = Router();
pipelineRouter.get('/stages', listStages);
pipelineRouter.get('/sales-processes', listSalesProcesses);
pipelineRouter.patch('/stages/:stageId', requireAdmin, updateStage);
