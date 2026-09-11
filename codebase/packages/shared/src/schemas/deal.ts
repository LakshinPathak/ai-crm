import { z } from 'zod';

export const CreateDealSchema = z.object({
  title: z.string().min(1).max(200),
  companyId: z.string(),
  amount: z.number().min(0).optional(),
  stageId: z.string(),
  ownerId: z.string().optional(),
});

export const UpdateDealSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().min(0).optional(),
  isHot: z.boolean().optional(),
  expectedCloseDate: z.string().datetime().optional(),
});

export const MoveDealStageSchema = z.object({
  stageId: z.string(),
  position: z.number().int().min(0),
});

export const CloseDealSchema = z
  .object({
    outcome: z.enum(['won', 'lost']),
    lostReason: z.string().min(1).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.outcome === 'lost' && !data.lostReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lostReason is required when outcome is lost',
        path: ['lostReason'],
      });
    }
  });

export const CreateNoteSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(300),
  dueDate: z.string().datetime().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  status: z.enum(['open', 'done']).optional(),
});

export const CreateBlockerSchema = z.object({
  title: z.string().min(1).max(300),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  description: z.string().max(2000).optional(),
});

export const ResolveBlockerSchema = z.object({
  status: z.enum(['resolved']).default('resolved'),
});

export const CreateParticipantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  role: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
});

export const CreateDealProjectSchema = z.object({
  title: z.string().min(1).max(300),
  status: z.enum(['planning', 'active', 'completed', 'on_hold']).optional(),
});

export const CreateProductRequestSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  status: z.enum(['open', 'submitted', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const CreateDealTeamRequestSchema = z.object({
  title: z.string().min(1).max(300),
  department: z.string().min(1).max(100),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  assigneeName: z.string().max(200).optional(),
});

export const CreateDealFileSchema = z.object({
  name: z.string().min(1).max(500),
  url: z.string().url().max(2048),
  mimeType: z.string().max(200).optional(),
  sizeBytes: z.number().int().min(0).optional(),
});

export const OnboardingStepSchema = z.object({
  step: z.number().int().min(1).max(5),
  selectedProvider: z.string().optional(),
});

export const DealAskSchema = z.object({
  question: z.string().min(1).max(2000),
});
