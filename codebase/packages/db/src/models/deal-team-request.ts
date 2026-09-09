import { Schema, model } from 'mongoose';

const DealTeamRequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    title: { type: String, required: true },
    department: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    assigneeName: String,
  },
  { timestamps: true },
);

DealTeamRequestSchema.index({ workspaceId: 1, dealId: 1 });

export const DealTeamRequest = model('DealTeamRequest', DealTeamRequestSchema);
