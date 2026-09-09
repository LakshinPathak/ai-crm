import { Schema, model } from 'mongoose';

const MeddpiccCitationSchema = new Schema(
  {
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    letter: { type: String, required: true },
    claimKey: { type: String, required: true },
    text: String,
    artifactId: { type: Schema.Types.ObjectId, ref: 'Artifact' },
    chunkId: { type: Schema.Types.ObjectId, ref: 'ArtifactChunk' },
    excerpt: String,
    speaker: String,
    occurredAt: Date,
    confidence: Number,
  },
  { timestamps: true, collection: 'meddpicc_citations' },
);

MeddpiccCitationSchema.index({ workspaceId: 1, dealId: 1, letter: 1 });

export const MeddpiccCitation = model('MeddpiccCitation', MeddpiccCitationSchema);
