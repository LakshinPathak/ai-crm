import { Schema, model } from 'mongoose';

const DealEventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    title: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    type: { type: String, enum: ['meeting', 'call'], required: true },
    source: { type: String, required: true },
    externalId: { type: String },
  },
  { timestamps: true },
);

DealEventSchema.index({ workspaceId: 1, dealId: 1, startAt: -1 });
DealEventSchema.index(
  { workspaceId: 1, source: 1, externalId: 1 },
  { unique: true, sparse: true },
);

export const DealEvent = model('DealEvent', DealEventSchema);
