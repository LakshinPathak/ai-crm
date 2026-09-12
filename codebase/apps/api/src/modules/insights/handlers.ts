import { Types } from 'mongoose';
import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import {
  buildActivityBreakdownFromData,
  buildActivityTimeSeriesFromData,
  buildDonutFromBreakdown,
  buildLabelDonutFromTasks,
  computeOrgPeriodMetrics,
  computeUserPerformance,
} from '../../lib/analytics.js';
import { AgentRun, Approval, Deal, Note, PipelineStage, Task, User } from '@ai-crm/db';

export async function getInsightsSummary(req: AuthedRequest, res: Response) {
  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [openDeals, wonDeals, members, pendingApprovals, runs30d, creditsAgg] = await Promise.all([
    Deal.find({ workspaceId, deletedAt: null, status: 'open' }),
    Deal.find({ workspaceId, deletedAt: null, status: 'won' }),
    User.find({ workspaceId, isActive: true }),
    Approval.countDocuments({ workspaceId, status: 'pending' }),
    AgentRun.countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo } }),
    AgentRun.aggregate([
      { $match: { workspaceId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } },
    ]),
  ]);

  const pipelineValue = openDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const closedWonValue = wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const winRate =
    openDeals.length + wonDeals.length > 0
      ? Math.round((wonDeals.length / (openDeals.length + wonDeals.length)) * 100)
      : 0;

  const bySentiment = {
    green: openDeals.filter((d) => d.sentiment === 'green').length,
    yellow: openDeals.filter((d) => d.sentiment === 'yellow').length,
    red: openDeals.filter((d) => d.sentiment === 'red').length,
  };

  res.json({
    members: members.length,
    activeDeals: openDeals.length,
    openPipeline: pipelineValue,
    closedWon: closedWonValue,
    winRate,
    pendingApprovals,
    agentRuns30d: runs30d,
    creditsUsed30d: creditsAgg[0]?.total ?? 0,
    sentimentBreakdown: bySentiment,
    hotDeals: openDeals.filter((d) => d.isHot).length,
  });
}

export async function getPerformanceAnalytics(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 86400000);
  const prevStart = new Date(now.getTime() - 60 * 86400000);

  const [members, stages, allDeals, notes, tasks, runs] = await Promise.all([
    User.find({ workspaceId, isActive: true }).sort({ displayName: 1 }),
    PipelineStage.find({ workspaceId }),
    Deal.find({ workspaceId, deletedAt: null }),
    Note.find({ workspaceId }),
    Task.find({ workspaceId }),
    AgentRun.find({ workspaceId }),
  ]);

  const users = members.map((member) => {
    const memberId = member._id.toString();
    const deals = allDeals.filter((d) => d.ownerId.toString() === memberId);
    const userNotes = notes.filter((n) => n.authorId.toString() === memberId);
    const userTasks = tasks.filter((t) => t.assigneeId?.toString() === memberId);
    const memberDealIds = new Set(deals.map((d) => d._id.toString()));
    const memberRuns = runs.filter((r) => r.dealId && memberDealIds.has(r.dealId.toString()));
    const agentRunCount = memberRuns.filter(
      (r) => r.createdAt && r.createdAt >= periodStart && r.createdAt < now,
    ).length;
    const prevAgentRunCount = memberRuns.filter(
      (r) => r.createdAt && r.createdAt >= prevStart && r.createdAt < periodStart,
    ).length;

    return computeUserPerformance(
      memberId,
      member.displayName,
      member.email,
      deals,
      stages,
      userNotes,
      userTasks,
      agentRunCount,
      prevAgentRunCount,
      periodStart,
      prevStart,
      now,
    );
  });

  const openDeals = allDeals.filter((d) => d.status === 'open');
  const wonDeals = allDeals.filter((d) => d.status === 'won');
  const openPipeline = openDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const closedWon = wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const winRate =
    openDeals.length + wonDeals.length > 0
      ? Math.round((wonDeals.length / (openDeals.length + wonDeals.length)) * 100)
      : 0;
  const totalHours = users.reduce((s, u) => s + u.totalHours.value, 0);
  const memberCount = Math.max(members.length, 1);

  const orgMetrics = computeOrgPeriodMetrics(
    allDeals,
    notes,
    tasks,
    runs,
    periodStart,
    prevStart,
    now,
  );

  const teams = [
    {
      id: 'sales',
      name: 'Sales',
      memberCount: members.length,
      activeDeals: orgMetrics.activeDeals,
      openPipeline: orgMetrics.openPipeline,
      closedWon: orgMetrics.closedWon,
      winRate: orgMetrics.winRate,
      totalHours: orgMetrics.totalHours,
    },
  ];

  res.json({
    orgKpis: {
      members: members.length,
      activeDeals: openDeals.length,
      activeDealsAvg: Math.round(openDeals.length / memberCount),
      openPipeline,
      openPipelineAvg: Math.round(openPipeline / memberCount),
      closedWon,
      closedWonAvg: Math.round(closedWon / memberCount),
      winRate,
      totalActivityHours: Math.round(totalHours * 10) / 10,
      totalActivityHoursAvg: Math.round((totalHours / memberCount) * 10) / 10,
    },
    users,
    teams,
  });
}

export async function getUsersInsights(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 86400000);
  const prevStart = new Date(now.getTime() - 60 * 86400000);

  const [members, stages, allDeals, notes, tasks, runs] = await Promise.all([
    User.find({ workspaceId, isActive: true }).sort({ displayName: 1 }),
    PipelineStage.find({ workspaceId }),
    Deal.find({ workspaceId, deletedAt: null }),
    Note.find({ workspaceId }),
    Task.find({ workspaceId }),
    AgentRun.find({ workspaceId }),
  ]);

  const users = members.map((member) => {
    const memberId = member._id.toString();
    const deals = allDeals.filter((d) => d.ownerId.toString() === memberId);
    const userNotes = notes.filter((n) => n.authorId.toString() === memberId);
    const userTasks = tasks.filter((t) => t.assigneeId?.toString() === memberId);
    const memberDealIds = new Set(deals.map((d) => d._id.toString()));
    const memberRuns = runs.filter((r) => r.dealId && memberDealIds.has(r.dealId.toString()));
    const agentRunCount = memberRuns.filter(
      (r) => r.createdAt && r.createdAt >= periodStart && r.createdAt < now,
    ).length;
    const prevAgentRunCount = memberRuns.filter(
      (r) => r.createdAt && r.createdAt >= prevStart && r.createdAt < periodStart,
    ).length;

    return computeUserPerformance(
      memberId,
      member.displayName,
      member.email,
      deals,
      stages,
      userNotes,
      userTasks,
      agentRunCount,
      prevAgentRunCount,
      periodStart,
      prevStart,
      now,
    );
  });

  res.json({ users });
}

export async function getFunnelInsights(req: AuthedRequest, res: Response) {
  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);

  const [stages, stageAgg, totalDeals] = await Promise.all([
    PipelineStage.find({ workspaceId }).sort({ position: 1 }),
    Deal.aggregate<{ _id: Types.ObjectId; count: number; value: number }>([
      { $match: { workspaceId, deletedAt: null } },
      {
        $group: {
          _id: '$stageId',
          count: { $sum: 1 },
          value: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
    Deal.countDocuments({ workspaceId, deletedAt: null }),
  ]);

  const stageCounts = new Map(
    stageAgg.map((row) => [row._id.toString(), { count: row.count, value: row.value }]),
  );

  const funnelStages = stages.map((stage, index) => {
    const stageId = stage._id.toString();
    const { count, value } = stageCounts.get(stageId) ?? { count: 0, value: 0 };
    const prevStageId = index > 0 ? stages[index - 1]._id.toString() : null;
    const prevCount = prevStageId ? (stageCounts.get(prevStageId)?.count ?? 0) : count;
    const conversionRate =
      prevStageId && prevCount > 0 ? Math.round((count / prevCount) * 100) : index === 0 ? 100 : 0;

    return {
      stageId,
      name: stage.name,
      position: stage.position,
      stageType: stage.stageType,
      count,
      value,
      conversionRate,
    };
  });

  res.json({
    totalDeals,
    stages: funnelStages,
  });
}

type OutcomeAggRow = { _id: string; count: number; value: number };

export type LossInsightsPayload = {
  won: { count: number; value: number };
  lost: { count: number; value: number };
  winRate: number;
  totalLost: number;
  totalLostValue: number;
  reasons: Array<{
    reason: string;
    count: number;
    value: number;
    percent: number;
  }>;
  monthly: Array<{ period: string; won: number; lost: number }>;
};

type DealPeriodFields = {
  status: string;
  amount?: number | null;
  winProbability?: number | null;
  isHot?: boolean | null;
  expectedCloseDate?: Date | null;
  closedAt?: Date | null;
  updatedAt?: Date | null;
};

function utcMonthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastSixUtcMonthKeys(now: Date): string[] {
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    keys.push(utcMonthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return keys;
}

function winRateFromCounts(won: number, lost: number): number {
  const closed = won + lost;
  return closed > 0 ? Math.round((won / closed) * 100) : 0;
}

/** Bucket month for win-rate trend: expectedCloseDate, else updatedAt. */
function trendBucketDate(deal: DealPeriodFields): Date | null {
  const raw = deal.expectedCloseDate ?? deal.updatedAt;
  return raw ? new Date(raw) : null;
}

function closedInWindowDate(deal: DealPeriodFields): Date | null {
  const raw = deal.closedAt ?? deal.expectedCloseDate ?? deal.updatedAt;
  return raw ? new Date(raw) : null;
}

function monthlyClosedTrend(closed: DealPeriodFields[], now: Date): Array<{ period: string; won: number; lost: number }> {
  const months = lastSixUtcMonthKeys(now);
  const buckets = new Map(months.map((period) => [period, { won: 0, lost: 0 }]));
  for (const deal of closed) {
    const dt = trendBucketDate(deal);
    if (!dt) continue;
    const bucket = buckets.get(utcMonthKey(dt));
    if (!bucket) continue;
    if (deal.status === 'won') bucket.won += 1;
    else if (deal.status === 'lost') bucket.lost += 1;
  }
  return months.map((period) => ({ period, ...buckets.get(period)! }));
}

async function loadLossInsights(workspaceId: Types.ObjectId): Promise<LossInsightsPayload> {
  const [outcomeAgg, reasonAgg, closedDeals] = await Promise.all([
    Deal.aggregate<OutcomeAggRow>([
      { $match: { workspaceId, deletedAt: null, status: { $in: ['won', 'lost'] } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          value: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
    Deal.aggregate<OutcomeAggRow>([
      { $match: { workspaceId, deletedAt: null, status: 'lost' } },
      {
        $group: {
          _id: {
            $cond: {
              if: {
                $or: [{ $eq: ['$lostReason', null] }, { $eq: [{ $trim: { input: '$lostReason' } }, ''] }],
              },
              then: 'Unspecified',
              else: { $trim: { input: '$lostReason' } },
            },
          },
          count: { $sum: 1 },
          value: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
    Deal.find({ workspaceId, deletedAt: null, status: { $in: ['won', 'lost'] } })
      .select('status expectedCloseDate closedAt updatedAt')
      .lean(),
  ]);

  const won = outcomeAgg.find((row) => row._id === 'won') ?? { count: 0, value: 0 };
  const lost = outcomeAgg.find((row) => row._id === 'lost') ?? { count: 0, value: 0 };
  const closedCount = won.count + lost.count;
  const winRate = closedCount > 0 ? Math.round((won.count / closedCount) * 100) : 0;

  const reasons = reasonAgg
    .map((row) => ({
      reason: row._id,
      count: row.count,
      value: row.value,
      percent: lost.count > 0 ? Math.round((row.count / lost.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    won: { count: won.count, value: won.value },
    lost: { count: lost.count, value: lost.value },
    winRate,
    totalLost: lost.count,
    totalLostValue: lost.value,
    reasons,
    monthly: monthlyClosedTrend(closedDeals, new Date()),
  };
}

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function lossInsightsToCsv(data: LossInsightsPayload): string {
  const lines: string[] = [
    'section,metric,value',
    `summary,won_deals,${data.won.count}`,
    `summary,won_value,${data.won.value}`,
    `summary,lost_deals,${data.lost.count}`,
    `summary,lost_value,${data.lost.value}`,
    `summary,win_rate_percent,${data.winRate}`,
    `summary,total_lost_deals,${data.totalLost}`,
    `summary,total_lost_value,${data.totalLostValue}`,
    '',
    'loss_reason,deals,value,percent_of_losses',
    ...data.reasons.map((row) =>
      [csvCell(row.reason), row.count, row.value, row.percent].join(','),
    ),
  ];
  return `${lines.join('\n')}\n`;
}

export async function getLossInsights(req: AuthedRequest, res: Response) {
  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);
  const payload = await loadLossInsights(workspaceId);
  res.json(payload);
}

export async function exportLossInsights(req: AuthedRequest, res: Response) {
  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);
  const payload = await loadLossInsights(workspaceId);
  const csv = lossInsightsToCsv(payload);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="win-loss-export-${date}.csv"`);
  res.send(csv);
}

export async function getActivityAnalytics(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const granularity =
    (req.query.granularity as string) === 'daily'
      ? 'daily'
      : (req.query.granularity as string) === 'weekly'
        ? 'weekly'
        : 'monthly';

  const [notes, tasks, deals] = await Promise.all([
    Note.find({ workspaceId }),
    Task.find({ workspaceId }),
    Deal.find({ workspaceId, deletedAt: null }),
  ]);

  const dealActivity = deals.map((d) => ({
    lastActivityAt: d.lastActivityAt ?? undefined,
    updatedAt: d.updatedAt ?? undefined,
  }));

  const timeSeries = buildActivityTimeSeriesFromData({
    notes,
    tasks,
    deals: dealActivity,
    granularity,
  });
  const breakdownByType = buildActivityBreakdownFromData({
    notes,
    tasks,
    deals: dealActivity,
    granularity,
  });
  const donutByType = buildDonutFromBreakdown(breakdownByType);
  const donutByLabel = buildLabelDonutFromTasks(tasks);
  const hasRealData = timeSeries.some((b) => b.total > 0);

  res.json({
    granularity,
    dataSource: hasRealData ? 'real' : 'empty',
    timeSeries,
    breakdownByType,
    donutByType,
    donutByLabel,
    tabs: [
      'Activity Breakdown',
      'Deal Breakdown',
      'Event Schedule',
      'Activity Log',
      'Product Requests',
      'Team Requests',
    ],
  });
}

/** Pipeline forecast KPIs from non-deleted workspace deals. */
export async function getForecastInsights(req: AuthedRequest, res: Response) {
  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);
  const now = new Date();
  const deals = await Deal.find({ workspaceId, deletedAt: null })
    .select('status amount winProbability isHot expectedCloseDate closedAt updatedAt')
    .lean();

  const closed = deals.filter((d) => d.status === 'won' || d.status === 'lost');
  const winRate = winRateFromCounts(
    closed.filter((d) => d.status === 'won').length,
    closed.filter((d) => d.status === 'lost').length,
  );

  const msDay = 86400000;
  const currentStart = new Date(now.getTime() - 30 * msDay);
  const prevStart = new Date(now.getTime() - 60 * msDay);
  const inWindow = (deal: DealPeriodFields, start: Date, end: Date) => {
    const dt = closedInWindowDate(deal);
    return Boolean(dt && dt >= start && dt < end);
  };
  const currentClosed = closed.filter((d) => inWindow(d, currentStart, now));
  const prevClosed = closed.filter((d) => inWindow(d, prevStart, currentStart));
  const currentWinRate = winRateFromCounts(
    currentClosed.filter((d) => d.status === 'won').length,
    currentClosed.filter((d) => d.status === 'lost').length,
  );
  const prevWinRate = winRateFromCounts(
    prevClosed.filter((d) => d.status === 'won').length,
    prevClosed.filter((d) => d.status === 'lost').length,
  );

  const open = deals.filter((d) => d.status === 'open');
  const weightedPipeline = Math.round(
    open.reduce((sum, d) => sum + (d.amount ?? 0) * ((d.winProbability ?? 0) / 100), 0),
  );
  const commitForecast = Math.round(
    open
      .filter((d) => (d.winProbability ?? 0) >= 70 || Boolean(d.isHot))
      .reduce((sum, d) => sum + (d.amount ?? 0), 0),
  );

  const monthly = monthlyClosedTrend(closed, now);
  const winRateTrend = monthly.map((row) => ({
    period: row.period,
    winRate: winRateFromCounts(row.won, row.lost),
  }));

  const winRateKpi: {
    id: string;
    label: string;
    value: number;
    format: 'percent';
    changePct?: number;
    sub?: string;
  } = {
    id: 'winRate',
    label: 'Win rate',
    value: winRate,
    format: 'percent',
  };
  if (prevClosed.length > 0) {
    winRateKpi.changePct = currentWinRate - prevWinRate;
  } else {
    winRateKpi.sub = 'Closed won / (won + lost)';
  }

  res.json({
    stub: false,
    message: 'Computed from workspace pipeline',
    kpis: [
      winRateKpi,
      {
        id: 'weightedPipeline',
        label: 'Weighted pipeline',
        value: weightedPipeline,
        format: 'currency',
        sub: 'Amount × win probability',
      },
      {
        id: 'commitForecast',
        label: 'Commit forecast',
        value: commitForecast,
        format: 'currency',
        sub: 'Open deals with win probability ≥ 70% or marked hot',
      },
    ],
    winRateTrend,
  });
}
