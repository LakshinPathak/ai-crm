import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(253).optional(),
  industry: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  employeeCount: z.number().int().min(0).optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().max(253).optional(),
  industry: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  employeeCount: z.number().int().min(0).optional(),
});
