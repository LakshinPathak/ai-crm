import { Router } from 'express';
import { getFocus, getHome } from './handlers.js';

export const homeRouter = Router();
homeRouter.get('/', getHome);

export const focusRouter = Router();
focusRouter.get('/', getFocus);
