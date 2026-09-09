import { Schema, model } from 'mongoose';

const AuthSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

AuthSessionSchema.index({ userId: 1, revokedAt: 1 });

export const AuthSession = model('AuthSession', AuthSessionSchema);
