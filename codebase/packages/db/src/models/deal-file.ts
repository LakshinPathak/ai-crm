import { Schema, model } from 'mongoose';

const DealFileSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String },
    sizeBytes: { type: Number, min: 0 },
  },
  { timestamps: true },
);

DealFileSchema.index({ workspaceId: 1, dealId: 1 });

export const DealFile = model('DealFile', DealFileSchema);
