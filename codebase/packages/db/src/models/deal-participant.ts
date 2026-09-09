import { Schema, model } from 'mongoose';

const DealParticipantSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: String,
    company: String,
  },
  { timestamps: true },
);

DealParticipantSchema.index({ workspaceId: 1, dealId: 1 });

export const DealParticipant = model('DealParticipant', DealParticipantSchema);
