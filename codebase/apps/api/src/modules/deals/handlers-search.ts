import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal } from '@ai-crm/db';

function dealCard(deal: InstanceType<typeof Deal>, company?: InstanceType<typeof Company> | null) {
  return {
    id: deal.id,
    title: deal.title,
    amount: deal.amount,
    currency: deal.currency,
    stageId: deal.stageId.toString(),
    position: deal.position,
    ownerId: deal.ownerId.toString(),
    companyId: deal.companyId.toString(),
    companyName: company?.name ?? 'Unknown',
    status: deal.status,
    sentiment: deal.sentiment,
    isHot: deal.isHot,
    winProbability: deal.winProbability,
    blockerCount: deal.blockerCount,
    meddpiccCompleteness: deal.meddpiccCompleteness,
    expectedCloseDate: deal.expectedCloseDate ?? null,
    lastActivityAt: deal.lastActivityAt ?? null,
  };
}

export async function searchDeals(req: AuthedRequest, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Query parameter q is required' } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 20));
  const filter = {
    workspaceId,
    deletedAt: null,
    $text: { $search: q },
  };

  const [deals, total] = await Promise.all([
    Deal.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip((page - 1) * limit)
      .limit(limit),
    Deal.countDocuments(filter),
  ]);

  const companyIds = [...new Set(deals.map((d) => d.companyId.toString()))];
  const companies = companyIds.length ? await Company.find({ _id: { $in: companyIds } }) : [];
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  res.json({
    deals: deals.map((d) => dealCard(d, companyMap.get(d.companyId.toString()))),
    page,
    limit,
    total,
    q,
  });
}

export async function getDealMetrics(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const baseFilter = { workspaceId, deletedAt: null };

  const [openDeals, wonCount, lostCount] = await Promise.all([
    Deal.find({ ...baseFilter, status: 'open' }, { amount: 1 }),
    Deal.countDocuments({ ...baseFilter, status: 'won' }),
    Deal.countDocuments({ ...baseFilter, status: 'lost' }),
  ]);

  res.json({
    metrics: {
      openCount: openDeals.length,
      totalValue: openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      wonCount,
      lostCount,
    },
  });
}
