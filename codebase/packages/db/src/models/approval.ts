import { Schema, model } from 'mongoose';

const ApprovalSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    agentRunId: { type: Schema.Types.ObjectId, ref: 'AgentRun', required: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired', 'conflict'], default: 'pending' },
    contentType: {
      type: String,
      enum: ['crm_update', 'email', 'slack_message', 'task_batch', 'jira_issue', 'post_call_bundle'],
      required: true,
    },
    contentPreview: { type: Schema.Types.Mixed },
    contentFull: { type: Schema.Types.Mixed, required: true },
    proposedChange: { type: Schema.Types.Mixed },
    title: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    rejectionNote: String,
  },
  { timestamps: true },
);

ApprovalSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });

export const Approval = model('Approval', ApprovalSchema);
