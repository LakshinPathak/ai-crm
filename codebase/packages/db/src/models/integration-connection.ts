import { Schema, model } from 'mongoose';

const IntegrationConnectionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    providerKey: { type: String, required: true },
    status: { type: String, enum: ['pending', 'connected', 'disconnected', 'error'], default: 'pending' },
    externalAccountId: String,
    encryptedAccessToken: String,
    encryptedRefreshToken: String,
    tokenExpiresAt: Date,
    lastSyncAt: Date,
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

IntegrationConnectionSchema.index({ workspaceId: 1, providerKey: 1 }, { unique: true });

export const IntegrationConnection = model('IntegrationConnection', IntegrationConnectionSchema);
