import { Router } from 'express';
import { createLead } from './handlers.js';

export const marketingRouter = Router();
marketingRouter.post('/', createLead);
