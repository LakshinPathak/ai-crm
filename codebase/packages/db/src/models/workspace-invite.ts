import { Schema, model } from 'mongoose';

const WorkspaceInviteSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

WorkspaceInviteSchema.index(
  { workspaceId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export const WorkspaceInvite = model('WorkspaceInvite', WorkspaceInviteSchema);
