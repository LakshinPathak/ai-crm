import { createHash } from 'node:crypto';
import { Artifact, ArtifactChunk } from '@ai-crm/db';
import { log } from '../logger.js';
import { enqueueJob } from './mongo-queue.js';

export const EMBED_ARTIFACT_QUEUE = 'embed-artifact';

const CHUNK_MAX_TOKENS = 512;
const CHUNK_OVERLAP_TOKENS = 64;
const CHARS_PER_TOKEN = 4;
const STUB_EMBED_DIMS = 384;

export interface EmbedArtifactJobData {
  workspaceId: string;
  artifactId: string;
}

export function isEmbedArtifactQueueEnabled(): boolean {
  return true;
}

export async function addEmbedArtifactJob(data: EmbedArtifactJobData): Promise<boolean> {
  await enqueueJob({
    queue: EMBED_ARTIFACT_QUEUE,
    name: 'embed',
    jobId: `${data.workspaceId}:${data.artifactId}`,
    payload: data,
    maxAttempts: 3,
  });
  return true;
}

/** ~512-token windows with 64-token overlap (character-based estimate). */
export function chunkRawText(rawText: string): string[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const maxChars = CHUNK_MAX_TOKENS * CHARS_PER_TOKEN;
  const stepChars = Math.max(1, (CHUNK_MAX_TOKENS - CHUNK_OVERLAP_TOKENS) * CHARS_PER_TOKEN);

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const slice = trimmed.slice(start, start + maxChars).trim();
    if (slice) chunks.push(slice);
    if (start + maxChars >= trimmed.length) break;
    start += stepChars;
  }
  return chunks;
}

export function hashEmbed(text: string, dimensions: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < dimensions; d++) {
    const hash = createHash('sha256').update(`${d}:${text}`).digest();
    out.push((hash.readUInt32BE(0) % 10_000) / 10_000 - 0.5);
  }
  const norm = Math.sqrt(out.reduce((sum, v) => sum + v * v, 0)) || 1;
  return out.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return hashEmbed(text, STUB_EMBED_DIMS);
  }

  const model = process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });

    if (!res.ok) {
      log('embed-artifact', 'gemini embed failed', { status: res.status });
      return hashEmbed(text, STUB_EMBED_DIMS);
    }

    const json = (await res.json()) as { embedding?: { values?: number[] } };
    const values = json.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      return hashEmbed(text, STUB_EMBED_DIMS);
    }
    return values;
  } catch (err) {
    log('embed-artifact', 'gemini embed error', { error: String(err) });
    return hashEmbed(text, STUB_EMBED_DIMS);
  }
}

export async function processEmbedArtifact(data: EmbedArtifactJobData): Promise<void> {
  const artifact = await Artifact.findOne({
    _id: data.artifactId,
    workspaceId: data.workspaceId,
  });

  if (!artifact?.rawText?.trim()) {
    log('embed-artifact', 'skip — no rawText', { artifactId: data.artifactId });
    return;
  }

  const chunks = chunkRawText(artifact.rawText);
  if (chunks.length === 0) {
    return;
  }

  await ArtifactChunk.deleteMany({
    workspaceId: artifact.workspaceId,
    artifactId: artifact._id,
  });

  const embeddedAt = new Date();

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const text = chunks[chunkIndex];
    const embedding = await embedText(text);

    await ArtifactChunk.create({
      workspaceId: artifact.workspaceId,
      artifactId: artifact._id,
      dealId: artifact.dealId ?? undefined,
      chunkIndex,
      text,
      embedding,
    });
  }

  await Artifact.findByIdAndUpdate(artifact._id, {
    $set: {
      chunkCount: chunks.length,
      embeddedAt,
    },
  });

  log('embed-artifact', 'chunks embedded', {
    artifactId: artifact.id,
    workspaceId: data.workspaceId,
    chunkCount: chunks.length,
  });
}
