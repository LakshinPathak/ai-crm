import { Schema, model } from 'mongoose';

const NoteSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    crmExternalId: String,
    crmProvider: String,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Note = model('Note', NoteSchema);
