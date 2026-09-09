import { Schema, model } from 'mongoose';

const PipelineStageSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true },
    position: { type: Number, required: true },
    stageType: { type: String, enum: ['open', 'closed_won', 'closed_lost'], default: 'open' },
    slaDays: Number,
    color: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PipelineStageSchema.index({ workspaceId: 1, position: 1 }, { unique: true });

export const PipelineStage = model('PipelineStage', PipelineStageSchema);
