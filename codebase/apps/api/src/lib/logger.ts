import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function correlationIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) ?? randomUUID();
    res.setHeader('x-request-id', id);
    next();
  };
}

export function log(service: string, message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', service, message, ...meta, ts: new Date().toISOString() }));
}
