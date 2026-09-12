import { Router } from 'express';
import {
  getActivityAnalytics,
  getFunnelInsights,
  getInsightsSummary,
  exportLossInsights,
  getLossInsights,
  getPerformanceAnalytics,
  getUsersInsights,
  getForecastInsights,
} from './handlers.js';
import { postInsightsSql } from './sql.js';

export const insightsRouter = Router();

insightsRouter.get('/summary', getInsightsSummary);
insightsRouter.get('/performance', getPerformanceAnalytics);
insightsRouter.get('/activity', getActivityAnalytics);
insightsRouter.get('/users', getUsersInsights);
insightsRouter.get('/funnel', getFunnelInsights);
insightsRouter.get('/loss/export', exportLossInsights);
insightsRouter.get('/loss', getLossInsights);
insightsRouter.get('/forecast', getForecastInsights);
insightsRouter.post('/sql', postInsightsSql);
