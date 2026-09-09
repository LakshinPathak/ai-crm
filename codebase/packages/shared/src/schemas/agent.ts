import { z } from 'zod';

export const AgentConfigSchema = z.object({
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  toolsConfig: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  config: AgentConfigSchema.optional(),
});

export const RunAgentSchema = z.object({
  scope: z
    .object({
      dealId: z.string().optional(),
    })
    .optional(),
});
