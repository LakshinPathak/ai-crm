import { Router } from 'express';
import { approveItem, countApprovals, getApproval, listApprovals, rejectItem } from './handlers.js';

export const approvalsRouter = Router();

approvalsRouter.get('/', listApprovals);
approvalsRouter.get('/count', countApprovals);
approvalsRouter.get('/:approvalId', getApproval);
approvalsRouter.post('/:approvalId/approve', approveItem);
approvalsRouter.post('/:approvalId/reject', rejectItem);
