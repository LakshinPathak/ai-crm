import { Router } from 'express';
import {
  getActivityAnalytics,
  getFunnelInsights,
  getInsightsSummary,
  getLossInsights,
  getPerformanceAnalytics,
  getUsersInsights,
} from './handlers.js';

export const insightsRouter = Router();

insightsRouter.get('/summary', getInsightsSummary);
insightsRouter.get('/performance', getPerformanceAnalytics);
insightsRouter.get('/activity', getActivityAnalytics);
insightsRouter.get('/users', getUsersInsights);
insightsRouter.get('/funnel', getFunnelInsights);
insightsRouter.get('/loss', getLossInsights);
