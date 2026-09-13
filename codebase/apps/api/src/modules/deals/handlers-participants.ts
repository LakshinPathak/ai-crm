import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealParticipant } from '@ai-crm/db';
import { CreateParticipantSchema, UpdateParticipantSchema } from '@ai-crm/shared';

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

export async function updateDealParticipant(req: AuthedRequest, res: Response) {
  const parsed = UpdateParticipantSchema.safeParse(req.body);
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

  const participant = await DealParticipant.findOne({
    _id: paramId(req.params.participantId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!participant) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Participant not found' } });
    return;
  }

  if (parsed.data.name !== undefined) participant.name = parsed.data.name;
  if (parsed.data.email !== undefined) participant.email = parsed.data.email;
  if (parsed.data.role !== undefined) participant.role = parsed.data.role;
  if (parsed.data.company !== undefined) participant.company = parsed.data.company;
  await participant.save();
  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ participant: participantPayload(participant) });
}

export async function deleteDealParticipant(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const participant = await DealParticipant.findOneAndDelete({
    _id: paramId(req.params.participantId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!participant) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Participant not found' } });
    return;
  }

  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}
