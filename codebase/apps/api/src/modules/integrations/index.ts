import { Router } from 'express';
import {
  connectGong,
  connectGoogleCalendar,
  disconnectGong,
  disconnectGoogleCalendar,
  getGongStatus,
  getGoogleCalendarStatus,
  listPlatformIntegrations,
  syncGoogleCalendar,
} from './handlers.js';

export const integrationsRouter = Router();

integrationsRouter.get('/providers', listPlatformIntegrations);
integrationsRouter.post('/gong/connect', connectGong);
integrationsRouter.get('/gong/status', getGongStatus);
integrationsRouter.delete('/gong', disconnectGong);
integrationsRouter.post('/calendar/google_calendar/connect', connectGoogleCalendar);
integrationsRouter.get('/calendar/google_calendar/status', getGoogleCalendarStatus);
integrationsRouter.post('/calendar/google_calendar/sync', syncGoogleCalendar);
integrationsRouter.delete('/calendar/google_calendar', disconnectGoogleCalendar);
