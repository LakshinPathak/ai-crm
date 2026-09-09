import { Schema, model } from 'mongoose';

const DealStageChangeSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    fromStageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage' },
    toStageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage', required: true },
    changedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

DealStageChangeSchema.index({ workspaceId: 1, dealId: 1, createdAt: -1 });

export const DealStageChange = model('DealStageChange', DealStageChangeSchema);
