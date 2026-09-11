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

export const DeliveryConfigSchema = z.object({
  provider: z.enum(['slack', 'google_chat', 'teams']).optional(),
  mode: z.enum(['dm', 'channel', 'deal_channel']).optional(),
  channelId: z.string().max(200).optional(),
  mentionUser: z.boolean().optional(),
  includeApproveButtons: z.boolean().optional(),
});

export const AgentSettingsSchema = z.object({
  webhookSecret: z.string().max(200).optional(),
});

export const AgentConfigSchema = z.object({
  triggerConfig: TriggerConfigSchema.optional(),
  toolsConfig: ToolsConfigSchema.optional(),
  deliveryConfig: DeliveryConfigSchema.optional(),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(200),
  templateSlug: z.string().max(100).optional(),
  category: AgentCategorySchema.optional(),
  config: AgentConfigSchema.optional(),
  settings: AgentSettingsSchema.optional(),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: AgentCategorySchema.optional(),
  enabled: z.boolean().optional(),
  config: AgentConfigSchema.optional(),
  settings: AgentSettingsSchema.optional(),
});

export const RunAgentSchema = z.object({
  scope: z
    .object({
      dealId: z.string().optional(),
    })
    .optional(),
});

export const DraftFromNlRequestSchema = z.object({
  description: z.string().min(10).max(2000),
});

export const DraftAgentSchema = z.object({
  name: z.string().min(1).max(200),
  templateSlug: z.string().max(100),
  category: AgentCategorySchema,
  triggerType: TriggerTypeSchema,
  schedule: z.string().max(200).nullable(),
  event: z.string().max(200).nullable(),
  systemPrompt: z.string().max(10000),
  tools: z.array(z.string().max(100)),
  skills: z.array(z.string().max(100)),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().max(500).optional(),
});

export type DraftFromNlRequest = z.infer<typeof DraftFromNlRequestSchema>;
export type DraftAgent = z.infer<typeof DraftAgentSchema>;
