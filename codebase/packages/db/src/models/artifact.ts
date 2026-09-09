import { Schema, model } from 'mongoose';

const ParticipantSchema = new Schema(
  {
    name: String,
    email: String,
    role: String,
  },
  { _id: false },
);

const ArtifactSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    type: {
      type: String,
      enum: ['call', 'email', 'slack_thread', 'teams_thread', 'google_chat_thread', 'document', 'crm_note'],
      required: true,
    },
    source: { type: String, required: true },
    sourceId: { type: String, required: true },
    title: String,
    occurredAt: { type: Date, index: true },
    durationSeconds: Number,
    participants: [ParticipantSchema],
    contentHash: { type: String, required: true },
    storageUrl: String,
    rawText: String,
    chunkCount: { type: Number, default: 0 },
    embeddedAt: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

ArtifactSchema.index({ workspaceId: 1, source: 1, sourceId: 1 }, { unique: true });
ArtifactSchema.index({ workspaceId: 1, dealId: 1, occurredAt: -1 });
ArtifactSchema.index({ workspaceId: 1, type: 1, occurredAt: -1 });

export const Artifact = model('Artifact', ArtifactSchema);
