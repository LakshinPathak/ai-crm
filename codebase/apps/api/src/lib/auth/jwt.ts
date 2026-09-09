import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { User } from '@ai-crm/db';

export type UserRole = 'admin' | 'manager' | 'member';

export type TenantContext = {
  userId: string;
  workspaceId: string;
  role: UserRole;
  email: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId?: string;
};

export type AuthedRequest = Request & { tenant?: TenantContext; auth?: JwtPayload };

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'development') {
    return 'dev-jwt-secret-change-me';
  }
  throw new Error('JWT_SECRET is required');
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export async function jwtMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User inactive or not found' } });
      return;
    }

    // Reconcile JWT with DB (role/workspace may have changed)
    const auth: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      workspaceId: user.workspaceId?.toString(),
    };
    req.auth = auth;

    if (auth.workspaceId) {
      req.tenant = {
        userId: auth.sub,
        workspaceId: auth.workspaceId,
        role: auth.role,
        email: auth.email,
      };
    }
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

export function requireWorkspace(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.tenant?.workspaceId) {
    res.status(403).json({ error: { code: 'WORKSPACE_REQUIRED', message: 'Create a workspace first' } });
    return;
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.tenant?.role !== 'admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin role required' } });
    return;
  }
  next();
}
