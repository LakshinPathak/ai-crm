import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealFile } from '@ai-crm/db';
import { CreateDealFileSchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function filePayload(file: InstanceType<typeof DealFile>) {
  return {
    id: file.id,
    name: file.name,
    url: file.url,
    mimeType: file.mimeType ?? null,
    sizeBytes: file.sizeBytes ?? null,
    dealId: file.dealId.toString(),
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function listDealFiles(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const files = await DealFile.find({
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  }).sort({ createdAt: -1 });

  res.json({ files: files.map(filePayload) });
}

export async function createDealFile(req: AuthedRequest, res: Response) {
  const parsed = CreateDealFileSchema.safeParse(req.body);
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

  const file = await DealFile.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    name: parsed.data.name,
    url: parsed.data.url,
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
  });

  deal.lastActivityAt = new Date();
  await deal.save();

  res.status(201).json({ file: filePayload(file) });
}

export async function deleteDealFile(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const fileId = paramId(req.params.fileId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const file = await DealFile.findOneAndDelete({
    _id: fileId,
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!file) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    return;
  }

  deal.lastActivityAt = new Date();
  await deal.save();

  res.status(204).send();
}
