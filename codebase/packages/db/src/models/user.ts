import { Schema, model } from 'mongoose';

const UserSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'admin' },
    timezone: { type: String, default: 'America/New_York' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

UserSchema.index({ workspaceId: 1, email: 1 }, { unique: true, partialFilterExpression: { workspaceId: { $type: 'objectId' } } });
UserSchema.index({ workspaceId: 1, role: 1, isActive: 1 });

export const User = model('User', UserSchema);
