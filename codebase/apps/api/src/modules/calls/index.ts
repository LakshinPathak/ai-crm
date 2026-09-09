import { Router } from 'express';
import { listCalls } from './handlers.js';

export const callsRouter = Router();

callsRouter.get('/', listCalls);
