import { Schema, model } from 'mongoose';

const DealMeddpiccSchema = new Schema(
  {
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, unique: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    letters: { type: Schema.Types.Mixed, default: {} },
    narrative: { type: Schema.Types.Mixed, default: {} },
    lockedFields: { type: [String], default: [] },
    humanEdits: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['idle', 'regenerating', 'stale'], default: 'idle' },
    overallConfidence: Number,
    inputHash: String,
    generatedAt: Date,
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const DealMeddpicc = model('DealMeddpicc', DealMeddpiccSchema);
