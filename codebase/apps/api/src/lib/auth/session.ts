import { createHash, randomBytes } from 'node:crypto';
import { AuthExchangeCode, AuthSession, User } from '@ai-crm/db';
import type { Response } from 'express';
import { signAccessToken, type JwtPayload, type UserRole } from './jwt.js';
import { setRefreshCookie } from './cookies.js';
import { acceptPendingWorkspaceInvite } from './invite.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const EXCHANGE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildJwtPayload(user: InstanceType<typeof User>): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    workspaceId: user.workspaceId?.toString(),
  };
}

export async function createAuthSession(
  user: InstanceType<typeof User>,
  res: Response,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<{ accessToken: string }> {
  const refreshToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await AuthSession.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });

  setRefreshCookie(res, refreshToken, expiresAt);
  return { accessToken: signAccessToken(buildJwtPayload(user)) };
}

export async function createExchangeCode(
  userId: string,
  needsWorkspace: boolean,
): Promise<string> {
  const code = randomBytes(24).toString('hex');
  await AuthExchangeCode.create({
    code,
    userId,
    needsWorkspace,
    expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS),
  });
  return code;
}

export async function exchangeCodeForTokens(
  code: string,
  res: Response,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<{ accessToken: string; needsWorkspace: boolean; user: InstanceType<typeof User> } | null> {
  const record = await AuthExchangeCode.findOne({ code, usedAt: null });
  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  record.usedAt = new Date();
  await record.save();

  const user = await User.findById(record.userId);
  if (!user || !user.isActive) {
    return null;
  }

  await acceptPendingWorkspaceInvite(user);

  const { accessToken } = await createAuthSession(user, res, meta);
  return { accessToken, needsWorkspace: !user.workspaceId, user };
}

export async function refreshAccessToken(
  refreshToken: string,
  res: Response,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<{ accessToken: string } | null> {
  const hash = hashToken(refreshToken);
  const session = await AuthSession.findOne({
    refreshTokenHash: hash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId);
  if (!user || !user.isActive) {
    await AuthSession.updateOne({ _id: session._id }, { revokedAt: new Date() });
    return null;
  }

  // Rotate refresh token
  session.revokedAt = new Date();
  await session.save();

  const { accessToken } = await createAuthSession(user, res, meta);
  return { accessToken };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const hash = hashToken(refreshToken);
  await AuthSession.updateOne(
    { refreshTokenHash: hash, revokedAt: null },
    { revokedAt: new Date() },
  );
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await AuthSession.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() },
  );
}
