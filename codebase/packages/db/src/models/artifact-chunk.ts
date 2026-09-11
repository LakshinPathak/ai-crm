import { Schema, model } from 'mongoose';

const ArtifactChunkSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    artifactId: { type: Schema.Types.ObjectId, ref: 'Artifact', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number] },
  },
  { timestamps: true },
);

ArtifactChunkSchema.index({ workspaceId: 1, artifactId: 1, chunkIndex: 1 }, { unique: true });
ArtifactChunkSchema.index({ workspaceId: 1, dealId: 1 });

export const ArtifactChunk = model('ArtifactChunk', ArtifactChunkSchema);
