import { Schema, model } from 'mongoose';

const DealProjectSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'on_hold'],
      default: 'planning',
    },
  },
  { timestamps: true },
);

DealProjectSchema.index({ workspaceId: 1, dealId: 1 });

export const DealProject = model('DealProject', DealProjectSchema);
