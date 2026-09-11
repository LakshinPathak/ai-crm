import { Schema, model } from 'mongoose';

const AgentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    templateSlug: String,
    name: { type: String, required: true },
    category: { type: String, enum: ['process', 'risk', 'signals', 'reporting'], default: 'process' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    triggerConfig: { type: Schema.Types.Mixed, default: {} },
    toolsConfig: { type: Schema.Types.Mixed, default: {} },
    deliveryConfig: { type: Schema.Types.Mixed, default: null },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const Agent = model('Agent', AgentSchema);
