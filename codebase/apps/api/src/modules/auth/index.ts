import { Router } from 'express';
import { jwtMiddleware } from '../../lib/auth/index.js';
import {
  createWorkspace,
  devLogin,
  exchangeAuthCode,
  getMe,
  googleCallback,
  inviteMember,
  listInvites,
  listMembers,
  logout,
  refreshToken,
  requireAdmin,
  requireWorkspace,
  startGoogleAuth,
  updateWorkspace,
} from './handlers.js';

export const authPublicRouter = Router();
authPublicRouter.get('/google', startGoogleAuth);
authPublicRouter.get('/google/callback', googleCallback);
authPublicRouter.post('/exchange', exchangeAuthCode);
authPublicRouter.post('/refresh', refreshToken);
authPublicRouter.post('/logout', logout);
authPublicRouter.post('/dev-login', devLogin);

export const authProtectedRouter = Router();
authProtectedRouter.use(jwtMiddleware);
authProtectedRouter.get('/me', getMe);
authProtectedRouter.post('/onboarding/workspace', createWorkspace);
authProtectedRouter.patch('/workspace', requireWorkspace, requireAdmin, updateWorkspace);
authProtectedRouter.get('/workspace/members', requireWorkspace, listMembers);
authProtectedRouter.get('/workspace/invites', requireWorkspace, requireAdmin, listInvites);
authProtectedRouter.post('/workspace/members/invite', requireWorkspace, requireAdmin, inviteMember);
