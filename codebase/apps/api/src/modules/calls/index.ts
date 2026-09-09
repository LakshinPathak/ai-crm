import { Router } from 'express';
import { getCallDetail, listCalls } from './handlers.js';

export const callsRouter = Router();

callsRouter.get('/', listCalls);
callsRouter.get('/:id', getCallDetail);
