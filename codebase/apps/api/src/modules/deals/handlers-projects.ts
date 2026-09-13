import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Deal, DealProject } from '@ai-crm/db';
import { CreateDealProjectSchema, UpdateDealProjectSchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function projectPayload(project: InstanceType<typeof DealProject>) {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    dealId: project.dealId.toString(),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function listDealProjects(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const projects = await DealProject.find({
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  }).sort({ createdAt: -1 });

  res.json({ projects: projects.map(projectPayload) });
}

export async function createDealProject(req: AuthedRequest, res: Response) {
  const parsed = CreateDealProjectSchema.safeParse(req.body);
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

  const project = await DealProject.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    title: parsed.data.title,
    status: parsed.data.status ?? 'planning',
  });

  deal.lastActivityAt = new Date();
  await deal.save();

  res.status(201).json({ project: projectPayload(project) });
}

export async function updateDealProject(req: AuthedRequest, res: Response) {
  const parsed = UpdateDealProjectSchema.safeParse(req.body);
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

  const project = await DealProject.findOne({
    _id: paramId(req.params.projectId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return;
  }

  if (parsed.data.title !== undefined) project.title = parsed.data.title;
  if (parsed.data.status !== undefined) project.status = parsed.data.status;
  await project.save();
  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ project: projectPayload(project) });
}

export async function deleteDealProject(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const project = await DealProject.findOneAndDelete({
    _id: paramId(req.params.projectId),
    dealId: deal._id,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return;
  }

  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}
