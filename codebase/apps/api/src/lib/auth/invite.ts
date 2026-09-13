import { isValidObjectId } from 'mongoose';
import { User, Workspace, WorkspaceInvite } from '@ai-crm/db';

export async function acceptPendingWorkspaceInvite(
  user: InstanceType<typeof User>,
  inviteId?: string,
): Promise<boolean> {
  if (user.workspaceId) {
    return false;
  }

  const pending = { status: 'pending', expiresAt: { $gt: new Date() } } as const;
  const invite = inviteId && isValidObjectId(inviteId)
    ? await WorkspaceInvite.findOne({ _id: inviteId, ...pending })
    : await WorkspaceInvite.findOne({
        email: user.email.toLowerCase(),
        ...pending,
      }).sort({ createdAt: -1 });

  if (!invite) {
    return false;
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return false;
  }

  const workspaceExists = await Workspace.exists({ _id: invite.workspaceId });
  if (!workspaceExists) {
    return false;
  }

  user.workspaceId = invite.workspaceId;
  user.role = invite.role;
  user.isActive = true;
  await user.save();

  invite.status = 'accepted';
  await invite.save();

  return true;
}
