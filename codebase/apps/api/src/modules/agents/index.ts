import { Router } from 'express';
import {
  createFromTemplate,
  deleteAgent,
  getAgent,
  getAgentStats,
  listAgents,
  listTemplates,
  runAgent,
  updateAgent,
} from './handlers.js';

export const agentsRouter = Router();

agentsRouter.get('/stats', getAgentStats);
agentsRouter.get('/templates', listTemplates);
agentsRouter.get('/', listAgents);
agentsRouter.post('/from-template/:slug', createFromTemplate);
agentsRouter.get('/:agentId', getAgent);
agentsRouter.patch('/:agentId', updateAgent);
agentsRouter.delete('/:agentId', deleteAgent);
agentsRouter.post('/:agentId/run', runAgent);

export const agentTemplatesRouter = Router();
agentTemplatesRouter.get('/', listTemplates);
