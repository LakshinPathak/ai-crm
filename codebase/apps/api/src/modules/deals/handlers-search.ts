import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal } from '@ai-crm/db';
import { log } from '../../lib/logger.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

async function searchDealsByRegex(
  workspaceId: string,
  q: string,
  page: number,
  limit: number,
) {
  const escaped = escapeRegex(q.slice(0, 80));
  const companies = await Company.find({
    workspaceId,
    deletedAt: null,
    name: { $regex: escaped, $options: 'i' },
  })
    .select('_id')
    .limit(50);

  const companyIds = companies.map((c) => c._id);
  const filter = {
    workspaceId,
    deletedAt: null,
    $or: [
      { title: { $regex: escaped, $options: 'i' } },
      ...(companyIds.length ? [{ companyId: { $in: companyIds } }] : []),
    ],
  };

  const [deals, total] = await Promise.all([
    Deal.find(filter)
      .sort({ lastActivityAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Deal.countDocuments(filter),
  ]);

  return { deals, total };
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

  let deals: InstanceType<typeof Deal>[] = [];
  let total = 0;

  try {
    const filter = {
      workspaceId,
      deletedAt: null,
      $text: { $search: q },
    };
    [deals, total] = await Promise.all([
      Deal.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip((page - 1) * limit)
        .limit(limit),
      Deal.countDocuments(filter),
    ]);
  } catch (err) {
    log('deals-search', 'text search failed, falling back to regex', { error: String(err) });
  }

  if (deals.length === 0) {
    const fallback = await searchDealsByRegex(workspaceId, q, page, limit);
    deals = fallback.deals;
    total = fallback.total;
  }

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
