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

export async function getLossInsights(req: AuthedRequest, res: Response) {
  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);

  const [outcomeAgg, reasonAgg] = await Promise.all([
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

  res.json({
    won: { count: won.count, value: won.value },
    lost: { count: lost.count, value: lost.value },
    winRate,
    totalLost: lost.count,
    totalLostValue: lost.value,
    reasons,
  });
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
