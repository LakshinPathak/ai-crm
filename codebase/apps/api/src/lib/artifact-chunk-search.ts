import { Types } from 'mongoose';
import { ArtifactChunk } from '@ai-crm/db';
import { embedText } from './queues/embed-artifact.js';

export interface ArtifactChunkSearchHit {
  _id: Types.ObjectId;
  artifactId: Types.ObjectId;
  dealId?: Types.ObjectId;
  chunkIndex: number;
  text: string;
  score?: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retrieve artifact chunks for a deal/workspace query.
 * Uses Atlas vector search when available; otherwise case-insensitive text match.
 */
export async function searchArtifactChunks(
  workspaceId: string,
  dealId: string | null,
  query: string,
  limit = 8,
): Promise<ArtifactChunkSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const wsId = new Types.ObjectId(workspaceId);
  const dealFilter = dealId ? { dealId: new Types.ObjectId(dealId) } : {};

  if (process.env.GEMINI_API_KEY) {
    try {
      const queryVector = await embedText(trimmed);
      const filter: Record<string, Types.ObjectId> = { workspaceId: wsId };
      if (dealId) {
        filter.dealId = new Types.ObjectId(dealId);
      }

      const vectorHits = await ArtifactChunk.aggregate<ArtifactChunkSearchHit>([
        {
          $vectorSearch: {
            index: 'artifact_chunks_vector',
            path: 'embedding',
            queryVector,
            numCandidates: Math.max(limit * 10, 80),
            limit,
            filter,
          },
        },
        {
          $project: {
            artifactId: 1,
            dealId: 1,
            chunkIndex: 1,
            text: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ]);

      if (vectorHits.length > 0) {
        return vectorHits;
      }
    } catch {
      // Atlas vector index not configured — fall through to text match
    }
  }

  const docs = await ArtifactChunk.find({
    workspaceId: wsId,
    ...dealFilter,
    text: { $regex: escapeRegex(trimmed), $options: 'i' },
  })
    .sort({ chunkIndex: 1 })
    .limit(limit)
    .select('artifactId dealId chunkIndex text')
    .lean();

  return docs.map((doc) => {
    const hit: ArtifactChunkSearchHit = {
      _id: doc._id,
      artifactId: doc.artifactId,
      chunkIndex: doc.chunkIndex,
      text: doc.text,
    };
    if (doc.dealId != null) {
      hit.dealId = doc.dealId;
    }
    return hit;
  });
}
