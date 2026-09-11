import { Company, Deal, DealMeddpicc, Note } from '@ai-crm/db';
import { generateMeddpiccWithGemini } from '../../../lib/gemini.js';
import { buildDefaultMeddpicc, MEDDPICC_LETTERS } from '../../../lib/meddpicc-defaults.js';
import {
  attachChunkCitationsToLetters,
  fetchMeddpiccArtifactChunksByLetter,
} from '../../../lib/meddpicc-artifact-citations.js';
import { upsertMeddpiccCitations } from '../../../lib/meddpicc-citations.js';
import type { AgentRunContext, AgentRunResult } from '../executor.js';

type MeddpiccLetters = ReturnType<typeof buildDefaultMeddpicc>;

function deriveSentiment(overallConfidence: number): 'green' | 'yellow' | 'red' {
  if (overallConfidence >= 0.7) return 'green';
  if (overallConfidence >= 0.5) return 'yellow';
  return 'red';
}

function deriveTechnicalFitScore(letters: MeddpiccLetters): number {
  const scores = [letters.D1?.confidence ?? 0, letters.I?.confidence ?? 0, letters.P?.confidence ?? 0];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(5, Math.max(1, Math.round(avg * 4 + 1)));
}

function mergeLetters(
  newLetters: MeddpiccLetters,
  existing: { letters?: MeddpiccLetters; lockedFields?: string[] } | null,
): { letters: MeddpiccLetters; sectionsUpdated: string[] } {
  const locked = new Set(existing?.lockedFields ?? []);
  const sectionsUpdated: string[] = [];

  if (!existing?.letters) {
    return { letters: newLetters, sectionsUpdated: [...MEDDPICC_LETTERS] };
  }

  const merged = { ...newLetters };
  for (const letter of MEDDPICC_LETTERS) {
    if (locked.has(letter)) {
      merged[letter] = existing.letters[letter];
    } else {
      sectionsUpdated.push(letter);
    }
  }
  return { letters: merged, sectionsUpdated };
}

export async function runMeddpiccSynth(ctx: AgentRunContext): Promise<AgentRunResult> {
  if (!ctx.dealId) {
    return {
      status: 'failed',
      creditsUsed: 0,
      output: {},
      error: 'dealId is required for meddpicc-synth',
    };
  }

  const useGemini = Boolean(process.env.GEMINI_API_KEY);

  const deal = await Deal.findOne({
    _id: ctx.dealId,
    workspaceId: ctx.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    return {
      status: 'failed',
      creditsUsed: 0,
      output: {},
      error: 'Deal not found',
    };
  }

  const [company, notes, existingDoc, artifactChunksByLetter] = await Promise.all([
    Company.findById(deal.companyId),
    Note.find({ dealId: deal._id, workspaceId: ctx.workspaceId })
      .sort({ createdAt: -1 })
      .limit(5),
    DealMeddpicc.findOne({ dealId: deal._id, workspaceId: ctx.workspaceId }),
    fetchMeddpiccArtifactChunksByLetter(ctx.workspaceId, ctx.dealId),
  ]);

  const context = {
    dealTitle: deal.title,
    companyName: company?.name,
    amount: deal.amount,
    winProbability: deal.winProbability,
    sentiment: deal.sentiment,
    noteSnippets: notes.map((n) => n.body),
    artifactChunksByLetter,
  };

  const rawLetters = useGemini
    ? await generateMeddpiccWithGemini(context)
    : buildDefaultMeddpicc(deal.title);

  const citedLetters = attachChunkCitationsToLetters(rawLetters, artifactChunksByLetter);
  const { letters, sectionsUpdated } = mergeLetters(citedLetters, existingDoc);

  const confidences = MEDDPICC_LETTERS.map((l) => letters[l]?.confidence ?? 0);
  const overallConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const completeness = Math.round(overallConfidence * 100);

  await DealMeddpicc.findOneAndUpdate(
    { dealId: deal._id, workspaceId: ctx.workspaceId },
    {
      letters,
      status: 'idle',
      overallConfidence,
      generatedAt: new Date(),
      inputHash: useGemini ? `gemini-${Date.now()}` : `mock-${Date.now()}`,
      $inc: { version: 1 },
    },
    { upsert: true },
  );

  await Deal.updateOne(
    { _id: deal._id },
    {
      meddpiccCompleteness: completeness,
      sentiment: deriveSentiment(overallConfidence),
      technicalFitScore: deriveTechnicalFitScore(letters),
    },
  );

  await upsertMeddpiccCitations({
    workspaceId: ctx.workspaceId,
    dealId: deal._id,
    letters,
  });

  return {
    status: 'completed',
    creditsUsed: useGemini ? 1.0 : 0.2,
    output: {
      dealId: deal.id,
      confidence: overallConfidence,
      sectionsUpdated,
    },
  };
}
