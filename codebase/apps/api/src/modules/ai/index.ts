import { Router } from 'express';
import { postFitScore, postSentiment, postSuggestBlocker } from './handlers.js';

/** Module M06 — AI Scoring (sentiment, fit, blocker suggest) */
export const aiRouter = Router();

aiRouter.post('/sentiment', postSentiment);
aiRouter.post('/fit-score', postFitScore);
aiRouter.post('/suggest-blocker', postSuggestBlocker);
