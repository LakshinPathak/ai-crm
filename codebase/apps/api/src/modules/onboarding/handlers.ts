import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { requireAdmin } from '../../lib/auth/index.js';
import { Workspace } from '@ai-crm/db';
import { OnboardingStepSchema } from '@ai-crm/shared';
import { seedWorkspaceData } from '../../lib/seed.js';

export async function getOnboardingStatus(req: AuthedRequest, res: Response) {
  const workspace = await Workspace.findById(req.tenant!.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    return;
  }

  res.json({
    completed: Boolean(workspace.onboardingCompletedAt),
    currentStep: workspace.onboardingStep ?? 1,
    selectedProvider: workspace.selectedCrmProvider ?? null,
  });
}

export async function updateOnboardingStep(req: AuthedRequest, res: Response) {
  const parsed = OnboardingStepSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspace = await Workspace.findById(req.tenant!.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    return;
  }

  workspace.onboardingStep = parsed.data.step;
  if (parsed.data.selectedProvider) {
    workspace.selectedCrmProvider = parsed.data.selectedProvider;
  }
  await workspace.save();

  res.json({
    currentStep: workspace.onboardingStep,
    selectedProvider: workspace.selectedCrmProvider,
  });
}

export async function completeOnboarding(req: AuthedRequest, res: Response) {
  const workspace = await Workspace.findById(req.tenant!.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    return;
  }

  workspace.onboardingCompletedAt = new Date();
  workspace.onboardingStep = 5;
  await workspace.save();

  const { Types } = await import('mongoose');
  await seedWorkspaceData(workspace._id, new Types.ObjectId(req.tenant!.userId));

  res.json({ completed: true, completedAt: workspace.onboardingCompletedAt });
}

export { requireAdmin };
