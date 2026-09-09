import { Artifact } from '@ai-crm/db';
import type { Types } from 'mongoose';

export interface DealTranscript {
  artifactId: string;
  title: string;
  occurredAt: Date;
  text: string;
  source: string;
}

const MAX_TRANSCRIPT_CHARS = 80_000;

export function truncateTranscript(text: string, maxChars = MAX_TRANSCRIPT_CHARS): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[truncated]`;
}

export async function loadDealTranscripts(
  workspaceId: string | Types.ObjectId,
  dealId: string | Types.ObjectId,
  limit = 3,
): Promise<DealTranscript[]> {
  const artifacts = await Artifact.find({
    workspaceId,
    dealId,
    type: 'call',
    rawText: { $exists: true, $nin: [null, ''] },
  })
    .sort({ occurredAt: -1 })
    .limit(limit);

  return artifacts.map((a) => ({
    artifactId: a.id,
    title: a.title ?? 'Call',
    occurredAt: a.occurredAt ?? a.createdAt,
    text: truncateTranscript(a.rawText ?? ''),
    source: a.source,
  }));
}

export async function loadLatestCallTranscript(
  workspaceId: string | Types.ObjectId,
  dealId: string | Types.ObjectId,
): Promise<DealTranscript | null> {
  const list = await loadDealTranscripts(workspaceId, dealId, 1);
  return list[0] ?? null;
}

export function formatTranscriptsForPrompt(transcripts: DealTranscript[]): string {
  if (transcripts.length === 0) return '(no call transcripts)';
  return transcripts
    .map(
      (t, i) =>
        `### Call ${i + 1}: ${t.title} (${t.source}, ${t.occurredAt.toISOString().slice(0, 10)})\n${t.text}`,
    )
    .join('\n\n');
}
