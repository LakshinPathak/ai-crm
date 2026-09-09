import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Company, Deal, DealBlocker, Note } from '@ai-crm/db';
import { log } from './logger.js';

export type Sentiment = 'green' | 'yellow' | 'red';
export type ScoringSource = 'gemini' | 'heuristic';

export type DealScoringContext = {
  dealTitle: string;
  companyName?: string;
  amount?: number;
  winProbability?: number;
  sentiment?: string;
  technicalFitScore?: number;
  meddpiccCompleteness?: number;
  blockerCount?: number;
  noteSnippets?: string[];
  openBlockers?: string[];
  extraText?: string;
};

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
  });
}

function contextBlock(context: DealScoringContext): string {
  const lines = [
    `Deal: ${context.dealTitle}`,
    `Company: ${context.companyName ?? 'Unknown'}`,
    `Amount: $${context.amount ?? 0}`,
    `Win probability: ${context.winProbability ?? 0}%`,
    `Current sentiment: ${context.sentiment ?? 'unknown'}`,
    `Technical fit score: ${context.technicalFitScore ?? 'unknown'}`,
    `MEDDPICC completeness: ${context.meddpiccCompleteness ?? 0}%`,
    `Open blockers: ${context.blockerCount ?? 0}`,
  ];

  if (context.openBlockers?.length) {
    lines.push(`Blocker titles:\n${context.openBlockers.join('\n')}`);
  }
  if (context.noteSnippets?.length) {
    lines.push(`Notes:\n${context.noteSnippets.join('\n')}`);
  }
  if (context.extraText) {
    lines.push(`Additional context:\n${context.extraText}`);
  }

  return lines.join('\n');
}

function heuristicSentiment(context: DealScoringContext): { sentiment: Sentiment; confidence: number } {
  const text = [
    ...(context.noteSnippets ?? []),
    context.extraText ?? '',
  ]
    .join(' ')
    .toLowerCase();

  const positive = ['excited', 'great', 'love', 'approved', 'moving forward', 'committed', 'positive', 'win'];
  const negative = ['concern', 'delay', 'competitor', 'budget', 'no response', 'stalled', 'risk', 'blocked', 'lost'];

  let score = 0;
  for (const word of positive) {
    if (text.includes(word)) score += 1;
  }
  for (const word of negative) {
    if (text.includes(word)) score -= 1;
  }

  if ((context.blockerCount ?? 0) >= 2) score -= 1;
  if ((context.winProbability ?? 0) >= 70) score += 1;
  if ((context.winProbability ?? 0) <= 30) score -= 1;

  if (score >= 1) return { sentiment: 'green', confidence: 0.65 };
  if (score <= -1) return { sentiment: 'red', confidence: 0.65 };
  return { sentiment: 'yellow', confidence: 0.55 };
}

function heuristicFitScore(context: DealScoringContext): number {
  let score = 3;
  if ((context.meddpiccCompleteness ?? 0) >= 70) score += 1;
  if ((context.winProbability ?? 0) >= 60) score += 1;
  if ((context.blockerCount ?? 0) >= 2) score -= 1;
  if ((context.sentiment ?? '') === 'red') score -= 1;
  return Math.max(1, Math.min(5, score));
}

function heuristicBlockerTitle(context: DealScoringContext): { title: string; reasoning: string } {
  if (context.openBlockers?.length) {
    return {
      title: `Resolve: ${context.openBlockers[0]}`,
      reasoning: 'An open blocker is already tracked on this deal.',
    };
  }
  if ((context.blockerCount ?? 0) > 0) {
    return {
      title: 'Follow up on outstanding deal blockers',
      reasoning: 'The deal has open blockers that need attention.',
    };
  }
  if ((context.meddpiccCompleteness ?? 0) < 50) {
    return {
      title: 'Complete MEDDPICC qualification gaps',
      reasoning: 'Low MEDDPICC completeness suggests missing discovery work.',
    };
  }
  if ((context.winProbability ?? 0) < 40) {
    return {
      title: 'Re-validate technical requirements with stakeholders',
      reasoning: 'Low win probability may indicate unclear fit or stalled momentum.',
    };
  }
  return {
    title: 'Confirm integration requirements with customer',
    reasoning: 'Default technical discovery blocker for active deals.',
  };
}

export function buildDealScoringContext(
  deal: InstanceType<typeof Deal>,
  company: InstanceType<typeof Company> | null,
  notes: InstanceType<typeof Note>[],
  blockers: InstanceType<typeof DealBlocker>[],
  extraText?: string,
): DealScoringContext {
  return {
    dealTitle: deal.title,
    companyName: company?.name,
    amount: deal.amount,
    winProbability: deal.winProbability,
    sentiment: deal.sentiment,
    technicalFitScore: deal.technicalFitScore ?? undefined,
    meddpiccCompleteness: deal.meddpiccCompleteness,
    blockerCount: deal.blockerCount,
    noteSnippets: notes.map((n) => n.body),
    openBlockers: blockers.map((b) => b.title),
    extraText,
  };
}

export async function scoreSentiment(
  context: DealScoringContext,
): Promise<{ sentiment: Sentiment; confidence: number; source: ScoringSource }> {
  const model = getGeminiModel();
  if (!model) {
    const result = heuristicSentiment(context);
    return { ...result, source: 'heuristic' };
  }

  const prompt = `You are a B2B sales analyst. Score deal sentiment from the context below.

${contextBlock(context)}

Return ONLY valid JSON: {"sentiment":"green"|"yellow"|"red","confidence":number 0-1}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { sentiment?: string; confidence?: number };
    if (parsed.sentiment === 'green' || parsed.sentiment === 'yellow' || parsed.sentiment === 'red') {
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7;
      return { sentiment: parsed.sentiment, confidence, source: 'gemini' };
    }
  } catch (err) {
    log('ai-scoring', 'sentiment gemini failed', { error: String(err) });
  }

  const result = heuristicSentiment(context);
  return { ...result, source: 'heuristic' };
}

export async function scoreTechnicalFit(
  context: DealScoringContext,
): Promise<{ technicalFitScore: number; source: ScoringSource }> {
  const model = getGeminiModel();
  if (!model) {
    return { technicalFitScore: heuristicFitScore(context), source: 'heuristic' };
  }

  const prompt = `You are a B2B solutions engineer. Score technical fit from 1 (poor) to 5 (excellent).

${contextBlock(context)}

Return ONLY valid JSON: {"technicalFitScore": integer 1-5}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { technicalFitScore?: number };
    if (typeof parsed.technicalFitScore === 'number') {
      const score = Math.max(1, Math.min(5, Math.round(parsed.technicalFitScore)));
      return { technicalFitScore: score, source: 'gemini' };
    }
  } catch (err) {
    log('ai-scoring', 'fit-score gemini failed', { error: String(err) });
  }

  return { technicalFitScore: heuristicFitScore(context), source: 'heuristic' };
}

export async function suggestBlockerTitle(
  context: DealScoringContext,
): Promise<{ title: string; reasoning: string; source: ScoringSource }> {
  const model = getGeminiModel();
  if (!model) {
    const result = heuristicBlockerTitle(context);
    return { ...result, source: 'heuristic' };
  }

  const prompt = `You are a B2B deal coach. Suggest one concise blocker title (max 80 chars) for this deal.

${contextBlock(context)}

Return ONLY valid JSON: {"title": string, "reasoning": string}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { title?: string; reasoning?: string };
    if (parsed.title?.trim()) {
      return {
        title: parsed.title.trim().slice(0, 120),
        reasoning: parsed.reasoning?.trim() ?? 'Suggested from deal context.',
        source: 'gemini',
      };
    }
  } catch (err) {
    log('ai-scoring', 'suggest-blocker gemini failed', { error: String(err) });
  }

  const result = heuristicBlockerTitle(context);
  return { ...result, source: 'heuristic' };
}
