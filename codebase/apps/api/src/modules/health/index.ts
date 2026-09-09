import { Router } from 'express';

/** Module M01 — implement per docs/api-routes.md */
export const healthRouter = Router();

healthRouter.get('/_stub', (_req, res) => {
  res.json({ module: 'health', apiModule: 'M01', status: 'scaffold' });
});
