import { buildDefaultMeddpicc, MEDDPICC_LETTERS } from './meddpicc-defaults.js';
import {
  formatMeddpiccArtifactPromptBlock,
  type MeddpiccLetters,
} from './meddpicc-artifact-citations.js';
import type { ArtifactChunkSearchHit } from './artifact-chunk-search.js';
import { log } from './logger.js';

export async function generateMeddpiccWithGemini(context: {
  dealTitle: string;
  companyName?: string;
  amount?: number;
  winProbability?: number;
  sentiment?: string;
  noteSnippets?: string[];
  artifactChunksByLetter?: Map<string, ArtifactChunkSearchHit[]>;
}): Promise<MeddpiccLetters> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildDefaultMeddpicc(context.dealTitle);
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
  const defaultLetters = buildDefaultMeddpicc(context.dealTitle);
  const artifactBlock = context.artifactChunksByLetter
    ? formatMeddpiccArtifactPromptBlock(context.artifactChunksByLetter, defaultLetters)
    : '';

  const prompt = `You are a B2B sales analyst. Generate a MEDDPICC qualification summary for this deal.

Deal: ${context.dealTitle}
Company: ${context.companyName ?? 'Unknown'}
Amount: $${context.amount ?? 0}
Win probability: ${context.winProbability ?? 0}%
Sentiment: ${context.sentiment ?? 'unknown'}
${context.noteSnippets?.length ? `Notes:\n${context.noteSnippets.join('\n')}` : ''}${artifactBlock}

Return ONLY valid JSON with keys M, E, D1, D2, P, I, C1, C2. Each value must be:
{"label": string, "summary": string (1-2 sentences), "confidence": number 0-1${artifactBlock ? ', "chunkId": string optional (must match a chunkId from excerpts), "excerpt": string optional (short quote from that chunk)' : ''}}

Keys meaning: M=Metrics, E=Economic Buyer, D1=Decision Criteria, D2=Decision Process, P=Paper Process, I=Identify Pain, C1=Champion, C2=Competition`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      log('gemini', 'API error', { status: res.status, body: errText.slice(0, 200) });
      return buildDefaultMeddpicc(context.dealTitle);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return buildDefaultMeddpicc(context.dealTitle);

    const parsed = JSON.parse(text) as MeddpiccLetters;
    for (const letter of MEDDPICC_LETTERS) {
      if (!parsed[letter]?.summary) {
        return buildDefaultMeddpicc(context.dealTitle);
      }
    }
    return parsed;
  } catch (err) {
    log('gemini', 'generate failed', { error: String(err) });
    return buildDefaultMeddpicc(context.dealTitle);
  }
}
