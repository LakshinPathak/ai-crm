import { Router } from 'express';
import { getCallDetail, listCalls, patchCall } from './handlers.js';

export const callsRouter = Router();

callsRouter.get('/', listCalls);
callsRouter.get('/:id', getCallDetail);
callsRouter.patch('/:id', patchCall);
