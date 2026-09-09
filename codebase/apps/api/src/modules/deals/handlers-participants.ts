import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealParticipant } from '@ai-crm/db';
import { CreateParticipantSchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function participantPayload(participant: InstanceType<typeof DealParticipant>) {
  return {
    id: participant.id,
    name: participant.name,
    email: participant.email,
    role: participant.role ?? null,
    company: participant.company ?? null,
    createdAt: participant.createdAt,
  };
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function listDealParticipants(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const participants = await DealParticipant.find({
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  }).sort({ createdAt: -1 });

  res.json({ participants: participants.map(participantPayload) });
}

export async function createDealParticipant(req: AuthedRequest, res: Response) {
  const parsed = CreateParticipantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const participant = await DealParticipant.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    company: parsed.data.company,
  });

  deal.lastActivityAt = new Date();
  await deal.save();

  res.status(201).json({ participant: participantPayload(participant) });
}
