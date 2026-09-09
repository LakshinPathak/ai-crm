import { Router } from 'express';
import { requireAdmin } from '../../lib/auth/index.js';
import { completeOnboarding, getOnboardingStatus, updateOnboardingStep } from './handlers.js';

export const onboardingRouter = Router();

onboardingRouter.get('/status', getOnboardingStatus);
onboardingRouter.patch('/step', requireAdmin, updateOnboardingStep);
onboardingRouter.post('/complete', requireAdmin, completeOnboarding);
