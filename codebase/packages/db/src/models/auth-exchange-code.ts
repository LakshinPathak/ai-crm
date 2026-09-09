import { Schema, model } from 'mongoose';

/** One-time code exchanged for tokens after OAuth (avoids JWT in URL). */
const AuthExchangeCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    needsWorkspace: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const AuthExchangeCode = model('AuthExchangeCode', AuthExchangeCodeSchema);
