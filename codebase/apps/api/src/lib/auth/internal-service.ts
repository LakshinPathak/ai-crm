import type { Request, Response, NextFunction } from 'express';

function getInternalServiceToken(): string {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (token) return token;
  if (process.env.NODE_ENV === 'development') {
    return 'dev-internal-token-change-in-prod';
  }
  throw new Error('INTERNAL_SERVICE_TOKEN is required');
}

function extractServiceToken(req: Request): string | undefined {
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.header('x-internal-token') ?? undefined;
}

export function internalServiceMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractServiceToken(req);
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing service token' } });
    return;
  }

  try {
    if (token !== getInternalServiceToken()) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid service token' } });
      return;
    }
  } catch (err) {
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: err instanceof Error ? err.message : 'Internal auth not configured',
      },
    });
    return;
  }

  next();
}
