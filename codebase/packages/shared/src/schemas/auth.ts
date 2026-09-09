import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
  timezone: z.string().optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  timezone: z.string().optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'member']).default('member'),
});

export const DevLoginSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
});

export const ExchangeCodeSchema = z.object({
  code: z.string().min(16).max(128),
});
