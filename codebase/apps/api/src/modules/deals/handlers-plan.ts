import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal } from '@ai-crm/db';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function planPayload(deal: InstanceType<typeof Deal>) {
  const plan = deal.plan ?? { milestones: [], goals: [] };
  return {
    milestones: (plan.milestones ?? []).map((m) => ({
      id: m._id?.toString() ?? m.id,
      title: m.title,
      status: m.status ?? 'pending',
      dueDate: m.dueDate ?? null,
      description: m.description ?? null,
    })),
    goals: (plan.goals ?? []).map((g) => ({
      id: g._id?.toString() ?? g.id,
      title: g.title,
      description: g.description ?? null,
    })),
  };
}

export async function getDealPlan(req: AuthedRequest, res: Response) {
  const deal = await Deal.findOne({
    _id: paramId(req.params.dealId),
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  res.json({ plan: planPayload(deal) });
}
