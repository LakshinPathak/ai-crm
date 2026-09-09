import { Schema, model } from 'mongoose';

const DealProductRequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ['open', 'submitted', 'in_progress', 'done'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { timestamps: true },
);

DealProductRequestSchema.index({ workspaceId: 1, dealId: 1 });

export const DealProductRequest = model('DealProductRequest', DealProductRequestSchema);
