import { Router } from 'express';
import { createMcpServer, deleteMcpServer, listMcpServers } from './handlers.js';

export const settingsRouter = Router();

settingsRouter.get('/mcp', listMcpServers);
settingsRouter.post('/mcp', createMcpServer);
settingsRouter.delete('/mcp/:id', deleteMcpServer);
