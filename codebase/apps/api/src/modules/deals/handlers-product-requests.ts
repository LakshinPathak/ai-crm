import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealProductRequest } from '@ai-crm/db';
import { CreateProductRequestSchema, UpdateProductRequestSchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function productRequestPayload(request: InstanceType<typeof DealProductRequest>) {
  return {
    id: request.id,
    title: request.title,
    description: request.description ?? null,
    status: request.status,
    priority: request.priority,
    dealId: request.dealId.toString(),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function listDealProductRequests(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const productRequests = await DealProductRequest.find({
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  }).sort({ createdAt: -1 });

  res.json({ productRequests: productRequests.map(productRequestPayload) });
}

export async function createDealProductRequest(req: AuthedRequest, res: Response) {
  const parsed = CreateProductRequestSchema.safeParse(req.body);
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

  const productRequest = await DealProductRequest.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status ?? 'open',
    priority: parsed.data.priority ?? 'medium',
  });

  deal.lastActivityAt = new Date();
  await deal.save();

  res.status(201).json({ productRequest: productRequestPayload(productRequest) });
}

export async function updateDealProductRequest(req: AuthedRequest, res: Response) {
  const parsed = UpdateProductRequestSchema.safeParse(req.body);
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

  const productRequest = await DealProductRequest.findOne({
    _id: paramId(req.params.requestId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!productRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product request not found' } });
    return;
  }

  if (parsed.data.title !== undefined) productRequest.title = parsed.data.title;
  if (parsed.data.description !== undefined) productRequest.description = parsed.data.description;
  if (parsed.data.status !== undefined) productRequest.status = parsed.data.status;
  if (parsed.data.priority !== undefined) productRequest.priority = parsed.data.priority;
  await productRequest.save();
  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ productRequest: productRequestPayload(productRequest) });
}

export async function deleteDealProductRequest(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const productRequest = await DealProductRequest.findOneAndDelete({
    _id: paramId(req.params.requestId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!productRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product request not found' } });
    return;
  }

  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}
