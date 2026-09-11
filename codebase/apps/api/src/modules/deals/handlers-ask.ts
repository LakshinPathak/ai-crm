import type { Response } from 'express';
import { Deal, Note } from '@ai-crm/db';
import { DealAskSchema } from '@ai-crm/shared';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { searchArtifactChunks } from '../../lib/artifact-chunk-search.js';
import { generateGeminiJson } from '../../lib/gemini-json.js';

const CITATION_EXCERPT_MAX = 280;
const NOTES_LIMIT = 20;

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function excerptFromText(text: string, max = CITATION_EXCERPT_MAX): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

type DealAskCitation = { chunkId: string; excerpt: string };

type GeminiDealAskResponse = {
  answer?: string;
  citations?: Array<{ chunkId?: string; excerpt?: string }>;
};

function normalizeCitations(
  raw: GeminiDealAskResponse['citations'],
  allowedChunkIds: Set<string>,
  chunkTextById: Map<string, string>,
): DealAskCitation[] {
  if (!raw?.length) return [];

  const out: DealAskCitation[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const chunkId = item.chunkId?.trim();
    if (!chunkId || !allowedChunkIds.has(chunkId) || seen.has(chunkId)) continue;
    seen.add(chunkId);
    const excerpt =
      item.excerpt?.trim() ||
      excerptFromText(chunkTextById.get(chunkId) ?? '');
    if (!excerpt) continue;
    out.push({ chunkId, excerpt: excerptFromText(excerpt) });
  }

  return out;
}

function fallbackAnswer(
  question: string,
  notes: Array<{ body: string }>,
  chunks: Array<{ _id: { toString(): string }; text: string }>,
): { answer: string; citations: DealAskCitation[] } {
  const citations = chunks.slice(0, 3).map((c) => ({
    chunkId: c._id.toString(),
    excerpt: excerptFromText(c.text),
  }));

  if (citations.length === 0 && notes.length === 0) {
    return {
      answer:
        'No deal notes or indexed call artifacts were found for this deal. Link calls and add notes to improve answers.',
      citations: [],
    };
  }

  const noteHint = notes.length
    ? `There are ${notes.length} note(s) on this deal.`
    : 'No deal notes yet.';
  const chunkHint = citations.length
    ? `Found ${chunks.length} relevant excerpt(s) for your question.`
    : 'No matching artifact excerpts.';

  return {
    answer: `${noteHint} ${chunkHint} Configure GEMINI_API_KEY for a synthesized answer to: "${question.trim()}"`,
    citations,
  };
}

export async function askDeal(req: AuthedRequest, res: Response) {
  const parsed = DealAskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const dealId = paramId(req.params.dealId);
  const question = parsed.data.question;

  const deal = await Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const [notes, chunks] = await Promise.all([
    Note.find({ workspaceId, dealId: deal._id, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(NOTES_LIMIT)
      .select('body createdAt')
      .lean(),
    searchArtifactChunks(workspaceId, dealId, question, 8),
  ]);

  const chunkTextById = new Map(chunks.map((c) => [c._id.toString(), c.text]));
  const allowedChunkIds = new Set(chunkTextById.keys());

  const notesBlock = notes
    .map((n, i) => `${i + 1}. ${n.body.trim()}`)
    .join('\n');

  const chunksBlock = chunks
    .map((c) => `[chunkId: ${c._id.toString()}]\n${c.text.trim()}`)
    .join('\n\n');

  const prompt = `You are a presales assistant answering questions about one deal. Use ONLY the deal notes and artifact excerpts below. If the context is insufficient, say so briefly.

Deal: ${deal.title}

Question:
${question}

Deal notes (newest first):
${notesBlock || '(none)'}

Artifact excerpts:
${chunksBlock || '(none)'}

Respond with JSON only:
{
  "answer": "concise answer in plain language",
  "citations": [{ "chunkId": "<id from chunkId labels>", "excerpt": "short supporting quote from that chunk" }]
}
Include citations only for artifact chunks you relied on. chunkId must match exactly.`;

  const gemini = await generateGeminiJson<GeminiDealAskResponse>(prompt, 'deal-ask');

  if (!gemini?.answer?.trim()) {
    const fallback = fallbackAnswer(question, notes, chunks);
    res.json(fallback);
    return;
  }

  const citations = normalizeCitations(gemini.citations, allowedChunkIds, chunkTextById);

  res.json({
    answer: gemini.answer.trim(),
    citations,
  });
}
