import { Router } from 'express';
import {
  getMeddpicc,
  getMeddpiccCitation,
  patchMeddpicc,
  refreshMeddpicc,
  streamMeddpicc,
} from './handlers.js';

export const meddpiccRouter = Router();

meddpiccRouter.get('/deals/:dealId/meddpicc', getMeddpicc);
meddpiccRouter.post('/deals/:dealId/meddpicc/refresh', refreshMeddpicc);
meddpiccRouter.get('/deals/:dealId/meddpicc/stream', streamMeddpicc);
meddpiccRouter.patch('/deals/:dealId/meddpicc', patchMeddpicc);
meddpiccRouter.get('/deals/:dealId/meddpicc/citations/:citationId', getMeddpiccCitation);
