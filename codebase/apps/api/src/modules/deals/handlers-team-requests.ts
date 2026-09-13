import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealTeamRequest } from '@ai-crm/db';
import { CreateDealTeamRequestSchema, UpdateDealTeamRequestSchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function teamRequestPayload(request: InstanceType<typeof DealTeamRequest>) {
  return {
    id: request.id,
    title: request.title,
    department: request.department,
    status: request.status,
    assigneeName: request.assigneeName ?? null,
    dealId: request.dealId.toString(),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function listDealTeamRequests(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const teamRequests = await DealTeamRequest.find({
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  }).sort({ createdAt: -1 });

  res.json({ teamRequests: teamRequests.map(teamRequestPayload) });
}

export async function createDealTeamRequest(req: AuthedRequest, res: Response) {
  const parsed = CreateDealTeamRequestSchema.safeParse(req.body);
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

  const teamRequest = await DealTeamRequest.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    title: parsed.data.title,
    department: parsed.data.department,
    status: parsed.data.status ?? 'open',
    assigneeName: parsed.data.assigneeName,
  });

  deal.lastActivityAt = new Date();
  await deal.save();

  res.status(201).json({ teamRequest: teamRequestPayload(teamRequest) });
}

export async function updateDealTeamRequest(req: AuthedRequest, res: Response) {
  const parsed = UpdateDealTeamRequestSchema.safeParse(req.body);
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

  const teamRequest = await DealTeamRequest.findOne({
    _id: paramId(req.params.requestId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!teamRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Team request not found' } });
    return;
  }

  if (parsed.data.title !== undefined) teamRequest.title = parsed.data.title;
  if (parsed.data.department !== undefined) teamRequest.department = parsed.data.department;
  if (parsed.data.status !== undefined) teamRequest.status = parsed.data.status;
  if (parsed.data.assigneeName !== undefined) teamRequest.assigneeName = parsed.data.assigneeName;
  await teamRequest.save();
  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ teamRequest: teamRequestPayload(teamRequest) });
}

export async function deleteDealTeamRequest(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const teamRequest = await DealTeamRequest.findOneAndDelete({
    _id: paramId(req.params.requestId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!teamRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Team request not found' } });
    return;
  }

  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}
