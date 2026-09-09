import { Deal } from '@ai-crm/db';
import { log } from '../../../lib/logger.js';
import type { AgentRunContext, AgentRunResult } from '../executor.js';

const MS_PER_DAY = 86400000;
const STALLED_MS = 14 * MS_PER_DAY;
const LOOKBACK_DAYS = 7;

export interface PipelineMetrics {
  openDealCount: number;
  totalPipelineAmount: number;
  currency: string;
  atRiskCount: number;
  closedLast7Days: {
    count: number;
    won: number;
    lost: number;
    totalAmount: number;
  };
}

function isStalled(lastActivityAt: Date | null | undefined, updatedAt: Date): boolean {
  const ref = lastActivityAt ?? updatedAt;
  return ref.getTime() < Date.now() - STALLED_MS;
}

function isAtRisk(sentiment: string, lastActivityAt: Date | null | undefined, updatedAt: Date): boolean {
  return sentiment === 'red' || isStalled(lastActivityAt, updatedAt);
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDigestDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function aggregatePipelineMetrics(workspaceId: string): Promise<PipelineMetrics> {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY);

  const [openDeals, closedDeals] = await Promise.all([
    Deal.find({ workspaceId, deletedAt: null, status: 'open' }),
    Deal.find({
      workspaceId,
      deletedAt: null,
      status: { $in: ['won', 'lost'] },
      updatedAt: { $gte: cutoff },
    }),
  ]);

  const totalPipelineAmount = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const atRiskCount = openDeals.filter((d) => isAtRisk(d.sentiment, d.lastActivityAt, d.updatedAt)).length;
  const currency = openDeals.find((d) => d.currency)?.currency ?? 'USD';

  const won = closedDeals.filter((d) => d.status === 'won');
  const lost = closedDeals.filter((d) => d.status === 'lost');

  return {
    openDealCount: openDeals.length,
    totalPipelineAmount,
    currency,
    atRiskCount,
    closedLast7Days: {
      count: closedDeals.length,
      won: won.length,
      lost: lost.length,
      totalAmount: won.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    },
  };
}

function buildTemplateDigest(metrics: PipelineMetrics, date: Date): { digestText: string; chatSummary: string } {
  const pipeline = formatCurrency(metrics.totalPipelineAmount, metrics.currency);
  const closedAmount = formatCurrency(metrics.closedLast7Days.totalAmount, metrics.currency);
  const weekLabel = formatDigestDate(date);

  const digestText = [
    `Weekly Pipeline Digest — ${weekLabel}`,
    '',
    `Open pipeline: ${metrics.openDealCount} deals totaling ${pipeline}.`,
    `At-risk deals: ${metrics.atRiskCount} (stalled activity or red sentiment).`,
    `Closed in the last 7 days: ${metrics.closedLast7Days.count} deals (${metrics.closedLast7Days.won} won, ${metrics.closedLast7Days.lost} lost) worth ${closedAmount}.`,
    '',
    metrics.atRiskCount > 0
      ? `Action: Review ${metrics.atRiskCount} at-risk deal${metrics.atRiskCount === 1 ? '' : 's'} with owners this week.`
      : 'Pipeline health looks stable — no at-risk deals flagged.',
  ].join('\n');

  const chatSummary = `${metrics.openDealCount} open (${pipeline}) · ${metrics.atRiskCount} at-risk · ${metrics.closedLast7Days.won}W/${metrics.closedLast7Days.lost}L closed (7d)`;

  return { digestText, chatSummary };
}

async function generateDigestWithGemini(metrics: PipelineMetrics, date: Date): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
  const pipeline = formatCurrency(metrics.totalPipelineAmount, metrics.currency);
  const closedAmount = formatCurrency(metrics.closedLast7Days.totalAmount, metrics.currency);

  const prompt = `Write a concise weekly leadership pipeline digest for sales managers.

Data:
- Open deals: ${metrics.openDealCount}
- Open pipeline value: ${pipeline}
- At-risk deals: ${metrics.atRiskCount}
- Closed last 7 days: ${metrics.closedLast7Days.count} (${metrics.closedLast7Days.won} won, ${metrics.closedLast7Days.lost} lost), ${closedAmount} won ARR
- Week ending: ${formatDigestDate(date)}

Return 3 short paragraphs: (1) pipeline snapshot, (2) risks/concerns, (3) wins and recommended focus. Plain text only, no markdown.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5 },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      log('weekly-digest', 'Gemini API error', { status: res.status, body: errText.slice(0, 200) });
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    log('weekly-digest', 'Gemini generate failed', { error: String(err) });
    return null;
  }
}

export async function runWeeklyDigest(ctx: AgentRunContext): Promise<AgentRunResult> {
  const metrics = await aggregatePipelineMetrics(ctx.workspaceId);
  const now = new Date();
  const pipelineLabel = formatCurrency(metrics.totalPipelineAmount, metrics.currency);
  const emailSubject = `Weekly Pipeline Digest — ${formatDigestDate(now)} | ${pipelineLabel}`;

  const geminiText = await generateDigestWithGemini(metrics, now);
  const template = buildTemplateDigest(metrics, now);

  const digestText = geminiText ?? template.digestText;
  const chatSummary = geminiText
    ? `${metrics.openDealCount} open (${pipelineLabel}) · ${metrics.atRiskCount} at-risk · ${metrics.closedLast7Days.won}W/${metrics.closedLast7Days.lost}L (7d)`
    : template.chatSummary;

  return {
    status: 'completed',
    creditsUsed: geminiText ? 0.8 : 0,
    output: {
      metrics,
      digestText,
      chatSummary,
      emailSubject,
      generatedWith: geminiText ? 'gemini' : 'template',
      periodDays: LOOKBACK_DAYS,
      generatedAt: now.toISOString(),
    },
  };
}
