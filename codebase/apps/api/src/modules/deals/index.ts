import { Router } from 'express';
import { closeDeal } from './handlers-close.js';
import { getDealMetrics, searchDeals } from './handlers-search.js';
import {
  createDeal,
  createDealBlocker,
  createDealNote,
  createDealTask,
  deleteDeal,
  deleteDealNote,
  deleteDealTask,
  getBoard,
  getDeal,
  getDealBlockers,
  getDealNotes,
  getDealOverview,
  getDealTasks,
  listDeals,
  moveDealStage,
  resolveDealBlocker,
  updateDeal,
  updateDealTask,
} from './handlers.js';
import { getDealActivity } from './handlers-activity.js';
import { getDealPlan } from './handlers-plan.js';
import { createDealParticipant, listDealParticipants } from './handlers-participants.js';
import {
  createDealProductRequest,
  listDealProductRequests,
} from './handlers-product-requests.js';
import { createDealFile, deleteDealFile, listDealFiles } from './handlers-files.js';
import { listDealEvents } from './handlers-events.js';
import { createDealProject, listDealProjects } from './handlers-projects.js';
import { createDealTeamRequest, listDealTeamRequests } from './handlers-team-requests.js';
import { askDeal } from './handlers-ask.js';

export const dealsRouter = Router();

dealsRouter.get('/board', getBoard);
dealsRouter.get('/search', searchDeals);
dealsRouter.get('/metrics', getDealMetrics);
dealsRouter.get('/', listDeals);
dealsRouter.get('/:dealId/overview-header', getDealOverview);
dealsRouter.get('/:dealId/plan', getDealPlan);
dealsRouter.get('/:dealId/activity', getDealActivity);
dealsRouter.get('/:dealId/events', listDealEvents);
dealsRouter.get('/:dealId/participants', listDealParticipants);
dealsRouter.get('/:dealId/product-requests', listDealProductRequests);
dealsRouter.post('/:dealId/product-requests', createDealProductRequest);
dealsRouter.get('/:dealId/projects', listDealProjects);
dealsRouter.post('/:dealId/projects', createDealProject);
dealsRouter.get('/:dealId/files', listDealFiles);
dealsRouter.post('/:dealId/files', createDealFile);
dealsRouter.delete('/:dealId/files/:fileId', deleteDealFile);
dealsRouter.post('/:dealId/participants', createDealParticipant);
dealsRouter.get('/:dealId/team-requests', listDealTeamRequests);
dealsRouter.post('/:dealId/team-requests', createDealTeamRequest);
dealsRouter.post('/:dealId/ask', askDeal);
dealsRouter.get('/:dealId/blockers', getDealBlockers);
dealsRouter.get('/:dealId/notes', getDealNotes);
dealsRouter.get('/:dealId/tasks', getDealTasks);
dealsRouter.post('/:dealId/notes', createDealNote);
dealsRouter.post('/:dealId/tasks', createDealTask);
dealsRouter.post('/:dealId/blockers', createDealBlocker);
dealsRouter.patch('/:dealId/tasks/:taskId', updateDealTask);
dealsRouter.delete('/:dealId/notes/:noteId', deleteDealNote);
dealsRouter.delete('/:dealId/tasks/:taskId', deleteDealTask);
dealsRouter.patch('/:dealId/blockers/:blockerId', resolveDealBlocker);
dealsRouter.get('/:dealId', getDeal);
dealsRouter.post('/', createDeal);
dealsRouter.patch('/:dealId/stage', moveDealStage);
dealsRouter.post('/:dealId/close', closeDeal);
dealsRouter.patch('/:dealId', updateDeal);
dealsRouter.delete('/:dealId', deleteDeal);
