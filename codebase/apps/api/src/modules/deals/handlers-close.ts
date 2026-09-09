import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal } from '@ai-crm/db';
import { CloseDealSchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
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
    closedAt: deal.closedAt ?? null,
    lostReason: deal.lostReason ?? null,
    lastActivityAt: deal.lastActivityAt ?? null,
  };
}

export async function closeDeal(req: AuthedRequest, res: Response) {
  const parsed = CloseDealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const deal = await Deal.findOne({
    _id: paramId(req.params.dealId),
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }
  if (deal.status !== 'open') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Deal is not open' } });
    return;
  }

  const now = new Date();
  deal.status = parsed.data.outcome;
  deal.closedAt = now;
  deal.lastActivityAt = now;
  if (parsed.data.outcome === 'lost') {
    deal.lostReason = parsed.data.lostReason!.trim();
  } else {
    deal.lostReason = undefined;
  }
  await deal.save();

  const company = await Company.findById(deal.companyId);
  res.json({ deal: dealCard(deal, company) });
}
