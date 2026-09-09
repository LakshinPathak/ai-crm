import type { Response } from 'express';
import {
  type AuthedRequest,
  buildJwtPayload,
  createAuthSession,
  createExchangeCode,
  exchangeCodeForTokens,
  exchangeGoogleCode,
  getGoogleAuthUrl,
  getRefreshTokenFromCookie,
  issueOAuthState,
  refreshAccessToken,
  requireAdmin,
  requireWorkspace,
  revokeRefreshToken,
  signAccessToken,
  validateOAuthState,
  acceptPendingWorkspaceInvite,
} from '../../lib/auth/index.js';
import { User, Workspace, WorkspaceInvite } from '@ai-crm/db';
import {
  CreateWorkspaceSchema,
  DevLoginSchema,
  ExchangeCodeSchema,
  InviteMemberSchema,
  UpdateWorkspaceSchema,
} from '@ai-crm/shared';
import { seedWorkspaceData } from '../../lib/seed.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || 'workspace';
  let attempt = 0;
  while (await Workspace.exists({ slug })) {
    attempt += 1;
    slug = `${slugify(base)}-${attempt}`;
  }
  return slug;
}

function toUserDto(user: InstanceType<typeof User>) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    timezone: user.timezone,
    role: user.role,
  };
}

function toWorkspaceDto(workspace: InstanceType<typeof Workspace> | null) {
  if (!workspace) return null;
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    onboardingCompletedAt: workspace.onboardingCompletedAt ?? null,
  };
}

function requestMeta(req: AuthedRequest) {
  return {
    userAgent: req.header('user-agent'),
    ipAddress: req.ip,
  };
}

function webCallbackUrl(exchangeCode: string, needsWorkspace: boolean): string {
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
  const params = new URLSearchParams({ code: exchangeCode });
  if (needsWorkspace) params.set('needsWorkspace', '1');
  return `${webUrl}/auth/callback?${params.toString()}`;
}

export function startGoogleAuth(_req: AuthedRequest, res: Response) {
  try {
    const state = issueOAuthState(res);
    res.redirect(getGoogleAuthUrl(state));
  } catch (err) {
    res.status(503).json({
      error: {
        code: 'OAUTH_NOT_CONFIGURED',
        message: err instanceof Error ? err.message : 'Google OAuth not configured',
      },
    });
  }
}

export async function googleCallback(req: AuthedRequest, res: Response) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  if (!code) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing OAuth code' } });
    return;
  }

  if (!validateOAuthState(res, req.header('cookie'), state)) {
    res.status(400).json({ error: { code: 'INVALID_STATE', message: 'OAuth state mismatch — try signing in again' } });
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code);
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.email,
        displayName: profile.name,
        avatarUrl: profile.picture,
        role: 'admin',
      });
    } else if (!user.isActive) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Account deactivated' } });
      return;
    } else {
      user.email = profile.email;
      user.displayName = profile.name;
      user.avatarUrl = profile.picture;
      await user.save();
    }

    await acceptPendingWorkspaceInvite(user);

    const exchangeCode = await createExchangeCode(user.id, !user.workspaceId);
    res.redirect(webCallbackUrl(exchangeCode, !user.workspaceId));
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'OAUTH_FAILED',
        message: err instanceof Error ? err.message : 'Google OAuth failed',
      },
    });
  }
}

export async function exchangeAuthCode(req: AuthedRequest, res: Response) {
  const parsed = ExchangeCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const result = await exchangeCodeForTokens(parsed.data.code, res, requestMeta(req));
  if (!result) {
    res.status(400).json({ error: { code: 'INVALID_CODE', message: 'Exchange code invalid or expired' } });
    return;
  }

  const workspace = result.user.workspaceId
    ? await Workspace.findById(result.user.workspaceId)
    : null;

  res.json({
    accessToken: result.accessToken,
    needsWorkspace: result.needsWorkspace,
    user: toUserDto(result.user),
    workspace: toWorkspaceDto(workspace),
  });
}

export async function refreshToken(req: AuthedRequest, res: Response) {
  const refresh = getRefreshTokenFromCookie(req.header('cookie'));
  if (!refresh) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
    return;
  }

  const result = await refreshAccessToken(refresh, res, requestMeta(req));
  if (!result) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } });
    return;
  }

  res.json({ accessToken: result.accessToken });
}

export async function logout(req: AuthedRequest, res: Response) {
  const refresh = getRefreshTokenFromCookie(req.header('cookie'));
  if (refresh) {
    await revokeRefreshToken(refresh);
  }
  res.clearCookie('ai_crm_refresh', { httpOnly: true, path: '/' });
  res.json({ ok: true });
}

export async function devLogin(req: AuthedRequest, res: Response) {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not available' } });
    return;
  }

  const parsed = DevLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const googleId = `dev-${parsed.data.email}`;
  let user = await User.findOne({ googleId });
  if (!user) {
    user = await User.create({
      googleId,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      role: 'admin',
    });
  }

  await acceptPendingWorkspaceInvite(user);

  const workspace = user.workspaceId ? await Workspace.findById(user.workspaceId) : null;
  const { accessToken } = await createAuthSession(user, res, requestMeta(req));
  res.json({
    accessToken,
    token: accessToken,
    needsWorkspace: !user.workspaceId,
    user: toUserDto(user),
    workspace: toWorkspaceDto(workspace),
  });
}

export async function getMe(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  const workspace = user.workspaceId ? await Workspace.findById(user.workspaceId) : null;
  res.json({
    user: toUserDto(user),
    workspace: toWorkspaceDto(workspace),
  });
}

export async function createWorkspace(req: AuthedRequest, res: Response) {
  const parsed = CreateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const user = await User.findById(req.auth!.sub);
  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }
  if (user.workspaceId) {
    res.status(409).json({ error: { code: 'WORKSPACE_EXISTS', message: 'User already has a workspace' } });
    return;
  }

  const slug = await uniqueSlug(parsed.data.name);
  const workspace = await Workspace.create({
    name: parsed.data.name,
    slug,
    timezone: parsed.data.timezone ?? user.timezone,
  });

  user.workspaceId = workspace._id;
  user.role = 'admin';
  await user.save();

  await seedWorkspaceData(workspace._id, user._id);

  const accessToken = signAccessToken(buildJwtPayload(user));
  res.status(201).json({
    accessToken,
    token: accessToken,
    workspace: toWorkspaceDto(workspace),
    user: toUserDto(user),
  });
}

export async function updateWorkspace(req: AuthedRequest, res: Response) {
  const parsed = UpdateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspace = await Workspace.findById(req.tenant!.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    return;
  }

  if (parsed.data.name) workspace.name = parsed.data.name;
  if (parsed.data.timezone) workspace.timezone = parsed.data.timezone;
  await workspace.save();

  res.json({ workspace: toWorkspaceDto(workspace) });
}

export async function listMembers(req: AuthedRequest, res: Response) {
  const members = await User.find({ workspaceId: req.tenant!.workspaceId, isActive: true }).sort({ createdAt: 1 });
  res.json({ members: members.map((m) => toUserDto(m)) });
}

function toInviteDto(invite: InstanceType<typeof WorkspaceInvite>) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function inviteMember(req: AuthedRequest, res: Response) {
  const parsed = InviteMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const workspaceId = req.tenant!.workspaceId;

  const existingMember = await User.findOne({ workspaceId, email });
  if (existingMember) {
    res.status(409).json({ error: { code: 'ALREADY_MEMBER', message: 'User already in workspace' } });
    return;
  }

  const userElsewhere = await User.findOne({
    email,
    workspaceId: { $ne: null, $nin: [workspaceId] },
  });
  if (userElsewhere) {
    res.status(409).json({
      error: { code: 'USER_IN_OTHER_WORKSPACE', message: 'User already belongs to another workspace' },
    });
    return;
  }

  const pendingInvite = await WorkspaceInvite.findOne({
    workspaceId,
    email,
    status: 'pending',
  });
  if (pendingInvite) {
    res.status(409).json({ error: { code: 'INVITE_PENDING', message: 'An invite is already pending for this email' } });
    return;
  }

  const invite = await WorkspaceInvite.create({
    workspaceId,
    email,
    role: parsed.data.role,
    invitedBy: req.auth!.sub,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  res.status(201).json({ invite: toInviteDto(invite) });
}

export async function listInvites(req: AuthedRequest, res: Response) {
  const invites = await WorkspaceInvite.find({
    workspaceId: req.tenant!.workspaceId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  res.json({ invites: invites.map((invite) => toInviteDto(invite)) });
}

export { requireAdmin, requireWorkspace };
