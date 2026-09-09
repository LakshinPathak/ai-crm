import { User, Workspace, WorkspaceInvite } from '@ai-crm/db';

export async function acceptPendingWorkspaceInvite(
  user: InstanceType<typeof User>,
): Promise<boolean> {
  if (user.workspaceId) {
    return false;
  }

  const invite = await WorkspaceInvite.findOne({
    email: user.email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!invite) {
    return false;
  }

  const workspaceExists = await Workspace.exists({ _id: invite.workspaceId });
  if (!workspaceExists) {
    return false;
  }

  user.workspaceId = invite.workspaceId;
  user.role = invite.role;
  await user.save();

  invite.status = 'accepted';
  await invite.save();

  return true;
}
