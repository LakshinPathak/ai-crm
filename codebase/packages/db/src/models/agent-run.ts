import { Schema, model } from 'mongoose';

const AgentRunSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'awaiting_approval', 'completed', 'failed', 'skipped'],
      default: 'queued',
    },
    triggerType: { type: String, enum: ['event', 'cron', 'manual', 'stage_change'], default: 'manual' },
    scope: { type: Schema.Types.Mixed, default: {} },
    creditsUsed: { type: Number, default: 0 },
    error: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

export const AgentRun = model('AgentRun', AgentRunSchema);
