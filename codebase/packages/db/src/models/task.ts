import { Schema, model } from 'mongoose';

const TaskSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    title: { type: String, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    completedAt: Date,
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    crmExternalId: String,
    crmProvider: String,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Task = model('Task', TaskSchema);
