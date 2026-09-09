import { Approval, Deal, Note, User } from '@ai-crm/db';
import type { Types } from 'mongoose';
import type { AgentRunContext, AgentRunResult } from '../executor.js';

const ANALYSIS_DAYS = 90;
const MS_PER_DAY = 86400000;
const APPROVAL_EXPIRY_DAYS = 14;

const LOSS_THEME_KEYWORDS: Record<string, string[]> = {
  Pricing: ['price', 'pricing', 'cost', 'expensive', 'budget', 'cheaper', 'discount'],
  Competition: ['competitor', 'competitive', 'alternative', 'incumbent', 'vendor'],
  Timing: ['timing', 'postpone', 'delay', 'next quarter', 'not ready', 'paused', 'deferred'],
  Authority: ['approval', 'executive', 'stakeholder', 'sponsor', 'decision maker', 'buy-in'],
  'Technical Fit': ['integration', 'technical', 'compatibility', 'architecture', 'api', 'feature gap'],
  'ROI / Value': ['roi', 'value', 'business case', 'justification', 'payback'],
  'Security / Compliance': ['security', 'compliance', 'soc2', 'gdpr', 'legal', 'privacy'],
  Implementation: ['implementation', 'onboarding', 'migration', 'rollout', 'resources', 'timeline'],
};

export interface WinLossTheme {
  theme: string;
  count: number;
  dealIds: string[];
}

export interface WinLossReport {
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  totalClosed: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  wonArr: number;
  lostArr: number;
  lossThemes: WinLossTheme[];
  dealSummaries: Array<{
    dealId: string;
    title: string;
    status: 'won' | 'lost';
    amount: number;
    themes: string[];
  }>;
  summary: string;
  recommendations: string[];
}

function classifyNoteText(text: string): string[] {
  const lower = text.toLowerCase();
  const themes: string[] = [];
  for (const [theme, keywords] of Object.entries(LOSS_THEME_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      themes.push(theme);
    }
  }
  return themes;
}

function buildLeadershipSummary(report: WinLossReport): string {
  const topThemes = report.lossThemes
    .slice(0, 3)
    .map((t) => `${t.theme} (${t.count})`)
    .join(', ');
  const themeLine = topThemes.length > 0 ? ` Top loss themes: ${topThemes}.` : '';
  return (
    `Win/Loss Analysis (${report.periodDays}d): ${report.wonCount} won, ${report.lostCount} lost ` +
    `(${report.winRate}% win rate). Won ARR: $${report.wonArr.toLocaleString()}; ` +
    `lost ARR: $${report.lostArr.toLocaleString()}.${themeLine}`
  );
}

function buildRecommendations(report: WinLossReport): string[] {
  const recs: string[] = [];
  if (report.lostCount === 0 && report.wonCount === 0) {
    return ['No closed deals in the analysis window — rerun after more deals close.'];
  }
  if (report.winRate < 40 && report.totalClosed >= 3) {
    recs.push('Win rate is below 40% — review qualification criteria and early-stage discovery.');
  }
  for (const theme of report.lossThemes.slice(0, 3)) {
    if (theme.theme === 'Pricing') {
      recs.push('Pricing objections are common — prepare ROI calculators and flexible packaging.');
    } else if (theme.theme === 'Competition') {
      recs.push('Competitive losses detected — refresh battlecards and differentiation talk tracks.');
    } else if (theme.theme === 'Timing') {
      recs.push('Timing-related losses — improve pipeline hygiene and re-engagement cadence.');
    } else {
      recs.push(`Address recurring "${theme.theme}" objections in enablement materials.`);
    }
  }
  if (recs.length === 0) {
    recs.push('Continue monitoring closed-deal notes for emerging patterns.');
  }
  return recs.slice(0, 5);
}

export async function runWinLossAnalysis(ctx: AgentRunContext): Promise<AgentRunResult> {
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - ANALYSIS_DAYS * MS_PER_DAY);

  const filter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    deletedAt: null,
    status: { $in: ['won', 'lost'] },
    updatedAt: { $gte: periodStart },
  };
  if (ctx.dealId) filter._id = ctx.dealId;

  const closedDeals = await Deal.find(filter);
  const wonDeals = closedDeals.filter((d) => d.status === 'won');
  const lostDeals = closedDeals.filter((d) => d.status === 'lost');
  const totalClosed = closedDeals.length;
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
  const wonArr = wonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const lostArr = lostDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const lostDealIds = lostDeals.map((d) => d._id);
  const notes =
    lostDealIds.length > 0
      ? await Note.find({ workspaceId: ctx.workspaceId, dealId: { $in: lostDealIds } })
      : [];

  const themeMap = new Map<string, { count: number; dealIds: Set<string> }>();
  const dealThemes = new Map<string, Set<string>>();

  for (const deal of lostDeals) {
    dealThemes.set(deal.id, new Set());
  }

  for (const note of notes) {
    const themes = classifyNoteText(note.body);
    const dealId = note.dealId.toString();
    const dealThemeSet = dealThemes.get(dealId);
    for (const theme of themes) {
      dealThemeSet?.add(theme);
      const entry = themeMap.get(theme) ?? { count: 0, dealIds: new Set<string>() };
      entry.count += 1;
      entry.dealIds.add(dealId);
      themeMap.set(theme, entry);
    }
  }

  const lossThemes: WinLossTheme[] = [...themeMap.entries()]
    .map(([theme, data]) => ({
      theme,
      count: data.count,
      dealIds: [...data.dealIds],
    }))
    .sort((a, b) => b.count - a.count);

  const dealSummaries = closedDeals.map((deal) => ({
    dealId: deal.id,
    title: deal.title,
    status: deal.status as 'won' | 'lost',
    amount: deal.amount ?? 0,
    themes: deal.status === 'lost' ? [...(dealThemes.get(deal.id) ?? [])] : [],
  }));

  const report: WinLossReport = {
    periodDays: ANALYSIS_DAYS,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalClosed,
    wonCount: wonDeals.length,
    lostCount: lostDeals.length,
    winRate,
    wonArr,
    lostArr,
    lossThemes,
    dealSummaries,
    summary: '',
    recommendations: [],
  };

  report.summary = buildLeadershipSummary(report);
  report.recommendations = buildRecommendations(report);

  let approvalId: string | null = null;
  if (totalClosed > 0) {
    const leader = await User.findOne({
      workspaceId: ctx.workspaceId,
      isActive: true,
      role: { $in: ['manager', 'admin'] },
    }).sort({ role: 1 });

    if (leader) {
      const approval = await Approval.create({
        workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
        agentRunId: ctx.runId as unknown as Types.ObjectId,
        assignedTo: leader._id,
        status: 'pending',
        contentType: 'task_batch',
        title: 'Win/Loss leadership summary',
        contentPreview: {
          summary: report.summary,
          winRate: report.winRate,
          lossThemeCount: report.lossThemes.length,
        },
        contentFull: report,
        proposedChange: {
          type: 'note_create',
          body: report.summary,
        },
        expiresAt: new Date(Date.now() + APPROVAL_EXPIRY_DAYS * MS_PER_DAY),
      });
      approvalId = approval.id;
    }
  }

  return {
    status: approvalId ? 'awaiting_approval' : 'completed',
    creditsUsed: 0.5,
    output: {
      report,
      approvalId,
      dealIds: closedDeals.map((d) => d.id),
    },
  };
}
