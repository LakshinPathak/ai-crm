import { z } from 'zod';

export const AgentCategorySchema = z.enum(['process', 'risk', 'signals', 'reporting']);

export const TriggerTypeSchema = z.enum(['schedule', 'event', 'manual', 'webhook']);

export const TriggerConfigSchema = z.object({
  type: TriggerTypeSchema,
  schedule: z.string().max(200).optional(),
  event: z.string().max(200).optional(),
  webhookSecret: z.string().max(200).optional(),
});

export const ToolsConfigSchema = z.object({
  systemPrompt: z.string().max(10000).optional(),
  tools: z.array(z.string().max(100)).optional(),
  skills: z.array(z.string().max(100)).optional(),
});

export const AgentConfigSchema = z.object({
  triggerConfig: TriggerConfigSchema.optional(),
  toolsConfig: ToolsConfigSchema.optional(),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(200),
  templateSlug: z.string().max(100).optional(),
  category: AgentCategorySchema.optional(),
  config: AgentConfigSchema.optional(),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: AgentCategorySchema.optional(),
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
