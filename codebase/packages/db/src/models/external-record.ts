import { Schema, model } from 'mongoose';

const ExternalRecordSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    providerKey: { type: String, required: true },
    entityType: { type: String, enum: ['deal', 'company', 'contact', 'user'], required: true },
    externalId: { type: String, required: true },
    internalId: { type: Schema.Types.ObjectId, required: true },
    externalRevision: { type: String },
    lastSyncedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

ExternalRecordSchema.index(
  { workspaceId: 1, providerKey: 1, entityType: 1, externalId: 1 },
  { unique: true },
);
ExternalRecordSchema.index({ workspaceId: 1, entityType: 1, internalId: 1 });

export const ExternalRecord = model('ExternalRecord', ExternalRecordSchema);
