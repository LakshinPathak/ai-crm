import { Router } from 'express';
import { cancelAgentRun, getAgentRun, listAgentRuns } from './handlers.js';

export const agentRunsRouter = Router();
agentRunsRouter.get('/', listAgentRuns);
agentRunsRouter.get('/:runId', getAgentRun);
agentRunsRouter.post('/:runId/cancel', cancelAgentRun);
