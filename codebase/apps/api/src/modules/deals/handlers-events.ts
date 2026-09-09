import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealEvent } from '@ai-crm/db';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function eventPayload(event: InstanceType<typeof DealEvent>) {
  return {
    id: event.id,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    type: event.type,
    source: event.source,
  };
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function listDealEvents(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const events = await DealEvent.find({
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  }).sort({ startAt: -1 });

  res.json({ events: events.map(eventPayload) });
}
