import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Approval, Company, Deal, Note, PipelineStage, Task } from '@ai-crm/db';

const STALLED_MS = 14 * 24 * 60 * 60 * 1000;

function isStalled(lastActivityAt: Date | null | undefined, updatedAt: Date): boolean {
  const ref = lastActivityAt ?? updatedAt;
  return ref.getTime() < Date.now() - STALLED_MS;
}

function isAtRisk(sentiment: string, lastActivityAt: Date | null | undefined, updatedAt: Date): boolean {
  return sentiment === 'red' || isStalled(lastActivityAt, updatedAt);
}

function atRiskReason(sentiment: string): 'stalled' | 'red_sentiment' {
  return sentiment === 'red' ? 'red_sentiment' : 'stalled';
}

function toDealCard(
  d: InstanceType<typeof Deal>,
  companyMap: Map<string, InstanceType<typeof Company>>,
  riskReason?: 'stalled' | 'red_sentiment',
) {
  return {
    id: d.id,
    title: d.title,
    amount: d.amount,
    currency: d.currency,
    companyName: companyMap.get(d.companyId.toString())?.name ?? 'Unknown',
    sentiment: d.sentiment,
    isHot: d.isHot,
    winProbability: d.winProbability,
    blockerCount: d.blockerCount,
    meddpiccCompleteness: d.meddpiccCompleteness,
    ...(riskReason ? { riskReason } : {}),
  };
}

export async function getHome(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const userId = req.tenant!.userId;

  const [openDeals, stages, approvalCount, recentNotes, recentTasks] = await Promise.all([
    Deal.find({ workspaceId, deletedAt: null, status: 'open' }).sort({ updatedAt: -1 }),
    PipelineStage.find({ workspaceId }).sort({ position: 1 }),
    Approval.countDocuments({ workspaceId, assignedTo: userId, status: 'pending' }),
    Note.find({ workspaceId }).sort({ createdAt: -1 }).limit(15).lean(),
    Task.find({ workspaceId }).sort({ updatedAt: -1 }).limit(15).lean(),
  ]);

  const companyIds = [...new Set(openDeals.map((d) => d.companyId.toString()))];
  const companies = await Company.find({ _id: { $in: companyIds } });
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const atRiskCount = openDeals.filter((d) => isAtRisk(d.sentiment, d.lastActivityAt, d.updatedAt)).length;

  const atRiskDeals = openDeals
    .filter((d) => isAtRisk(d.sentiment, d.lastActivityAt, d.updatedAt))
    .sort((a, b) => {
      if (a.sentiment === 'red' && b.sentiment !== 'red') return -1;
      if (b.sentiment === 'red' && a.sentiment !== 'red') return 1;
      const aRef = (a.lastActivityAt ?? a.updatedAt).getTime();
      const bRef = (b.lastActivityAt ?? b.updatedAt).getTime();
      return aRef - bRef;
    })
    .slice(0, 10)
    .map((d) =>
      toDealCard(d, companyMap, atRiskReason(d.sentiment)),
    );

  const focusDeals = openDeals
    .filter((d) => d.isHot || d.riskScore > 50 || d.ownerId.toString() === userId)
    .sort((a, b) => {
      if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
      return b.riskScore - a.riskScore;
    })
    .slice(0, 5)
    .map((d) => toDealCard(d, companyMap));

  const totalAmount = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const activityDealIds = [
    ...new Set([
      ...recentNotes.map((n) => n.dealId.toString()),
      ...recentTasks.map((t) => t.dealId.toString()),
    ]),
  ];
  const activityDeals = activityDealIds.length
    ? await Deal.find({ _id: { $in: activityDealIds } }, { title: 1 })
    : [];
  const dealTitleMap = new Map<string, string>();
  for (const d of openDeals) dealTitleMap.set(d.id, d.title);
  for (const d of activityDeals) dealTitleMap.set(d.id, d.title);

  const activityFromNotes = recentNotes.map((n) => ({
    type: 'note_added' as const,
    dealId: n.dealId.toString(),
    title: dealTitleMap.get(n.dealId.toString()) ?? 'Deal',
    at: (n.createdAt as Date).toISOString(),
    description: String(n.body).slice(0, 100),
  }));

  const activityFromTasks = recentTasks.map((t) => ({
    type: (t.completedAt ? 'task_completed' : 'task_updated') as 'task_completed' | 'task_updated',
    dealId: t.dealId.toString(),
    title: dealTitleMap.get(t.dealId.toString()) ?? t.title,
    at: (t.completedAt ?? t.updatedAt ?? t.createdAt).toISOString(),
    description: t.title,
  }));

  const activityFromDeals = openDeals
    .slice(0, 15)
    .map((d) => ({
      type: 'deal_updated' as const,
      dealId: d.id,
      title: d.title,
      at: (d.lastActivityAt ?? d.updatedAt).toISOString(),
    }));

  const recentActivity = [...activityFromNotes, ...activityFromTasks, ...activityFromDeals]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  res.json({
    focusDeals,
    atRiskDeals,
    approvalCount,
    pipelineSnapshot: {
      dealCount: openDeals.length,
      totalAmount,
      hotCount: openDeals.filter((d) => d.isHot).length,
      atRiskCount,
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color ?? '#6366f1',
        dealCount: openDeals.filter((d) => d.stageId.toString() === stage.id).length,
      })),
    },
    recentActivity,
  });
}

export async function getFocus(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const deals = await Deal.find({ workspaceId, deletedAt: null, status: 'open', isHot: true })
    .sort({ updatedAt: -1 })
    .limit(20);

  const companies = await Company.find({ workspaceId });
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  res.json({
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      companyName: companyMap.get(d.companyId.toString())?.name,
      amount: d.amount,
      sentiment: d.sentiment,
    })),
  });
}
