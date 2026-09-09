import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal, DealBlocker, DealStageChange, Note, PipelineStage, Task } from '@ai-crm/db';
import {
  CreateBlockerSchema,
  CreateDealSchema,
  CreateNoteSchema,
  CreateTaskSchema,
  MoveDealStageSchema,
  ResolveBlockerSchema,
  UpdateDealSchema,
  UpdateTaskSchema,
} from '@ai-crm/shared';

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

export async function getBoard(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const filter: Record<string, unknown> = { workspaceId, deletedAt: null };

  if (req.query.owner_id) filter.ownerId = req.query.owner_id;
  if (req.query.stage_id) filter.stageId = req.query.stage_id;
  if (req.query.is_hot === 'true') filter.isHot = true;
  if (req.query.sentiment) filter.sentiment = req.query.sentiment;

  const stages = await PipelineStage.find({ workspaceId }).sort({ position: 1 });
  const deals = await Deal.find(filter).sort({ position: 1 });
  const companyIds = [...new Set(deals.map((d) => d.companyId.toString()))];
  const companies = await Company.find({ _id: { $in: companyIds } });
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const stagePayload = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    position: stage.position,
    color: stage.color ?? '#6366f1',
    stageType: stage.stageType,
    deals: deals
      .filter((d) => d.stageId.toString() === stage.id)
      .map((d) => dealCard(d, companyMap.get(d.companyId.toString()))),
  }));

  const openDeals = deals.filter((d) => d.status === 'open');
  res.json({
    stages: stagePayload,
    metrics: {
      dealCount: openDeals.length,
      totalAmount: openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      hotCount: openDeals.filter((d) => d.isHot).length,
    },
  });
}

export async function listDeals(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 20));
  const filter: Record<string, unknown> = { workspaceId, deletedAt: null };
  if (req.query.stage_id) filter.stageId = req.query.stage_id;
  if (req.query.owner_id) filter.ownerId = req.query.owner_id;

  const [deals, total] = await Promise.all([
    Deal.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Deal.countDocuments(filter),
  ]);

  const companies = await Company.find({ workspaceId });
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  res.json({
    deals: deals.map((d) => dealCard(d, companyMap.get(d.companyId.toString()))),
    page,
    limit,
    total,
  });
}

export async function getDeal(req: AuthedRequest, res: Response) {
  const deal = await Deal.findOne({
    _id: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }
  const company = await Company.findById(deal.companyId);
  const stage = await PipelineStage.findById(deal.stageId);
  res.json({
    deal: {
      ...dealCard(deal, company),
      stageName: stage?.name ?? null,
    },
  });
}

export async function createDeal(req: AuthedRequest, res: Response) {
  const parsed = CreateDealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const company = await Company.findOne({ _id: parsed.data.companyId, workspaceId });
  if (!company) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid company' } });
    return;
  }

  const stage = await PipelineStage.findOne({ _id: parsed.data.stageId, workspaceId });
  if (!stage) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid stage' } });
    return;
  }

  const deal = await Deal.create({
    workspaceId,
    companyId: company._id,
    title: parsed.data.title,
    amount: parsed.data.amount ?? 0,
    stageId: stage._id,
    ownerId: parsed.data.ownerId ?? req.tenant!.userId,
    lastActivityAt: new Date(),
  });

  await DealStageChange.create({
    workspaceId,
    dealId: deal._id,
    toStageId: stage._id,
    changedById: req.tenant!.userId,
  });

  res.status(201).json({ deal: dealCard(deal, company) });
}

export async function updateDeal(req: AuthedRequest, res: Response) {
  const parsed = UpdateDealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const deal = await Deal.findOne({
    _id: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  if (parsed.data.title) deal.title = parsed.data.title;
  if (parsed.data.amount !== undefined) deal.amount = parsed.data.amount;
  if (parsed.data.isHot !== undefined) deal.isHot = parsed.data.isHot;
  if (parsed.data.expectedCloseDate) deal.expectedCloseDate = new Date(parsed.data.expectedCloseDate);
  deal.lastActivityAt = new Date();
  await deal.save();

  const company = await Company.findById(deal.companyId);
  res.json({ deal: dealCard(deal, company) });
}

export async function moveDealStage(req: AuthedRequest, res: Response) {
  const parsed = MoveDealStageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const deal = await Deal.findOne({
    _id: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const stage = await PipelineStage.findOne({ _id: parsed.data.stageId, workspaceId: req.tenant!.workspaceId });
  if (!stage) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid stage' } });
    return;
  }

  const previousStageId = deal.stageId;
  deal.stageId = stage._id;
  deal.position = parsed.data.position;
  deal.lastActivityAt = new Date();
  await deal.save();

  if (previousStageId.toString() !== stage._id.toString()) {
    await DealStageChange.create({
      workspaceId: req.tenant!.workspaceId,
      dealId: deal._id,
      fromStageId: previousStageId,
      toStageId: stage._id,
      changedById: req.tenant!.userId,
    });
  }

  const company = await Company.findById(deal.companyId);
  res.json({ deal: dealCard(deal, company) });
}

export async function deleteDeal(req: AuthedRequest, res: Response) {
  const deal = await Deal.findOne({
    _id: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }
  deal.deletedAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}

export async function getDealNotes(req: AuthedRequest, res: Response) {
  const notes = await Note.find({
    dealId: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  }).sort({ createdAt: -1 });
  res.json({
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      authorId: n.authorId.toString(),
      createdAt: n.createdAt,
    })),
  });
}

export async function getDealTasks(req: AuthedRequest, res: Response) {
  const tasks = await Task.find({
    dealId: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  }).sort({ createdAt: -1 });
  res.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate ?? null,
      assigneeId: t.assigneeId?.toString() ?? null,
    })),
  });
}

export async function getDealBlockers(req: AuthedRequest, res: Response) {
  const blockers = await DealBlocker.find({
    dealId: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    status: 'open',
  }).sort({ severity: -1 });

  res.json({
    blockers: blockers.map((b) => ({
      id: b.id,
      title: b.title,
      severity: b.severity,
      status: b.status,
    })),
  });
}

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function createDealNote(req: AuthedRequest, res: Response) {
  const parsed = CreateNoteSchema.safeParse(req.body);
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
  const note = await Note.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    authorId: req.tenant!.userId,
    body: parsed.data.body,
  });
  deal.lastActivityAt = new Date();
  await deal.save();
  res.status(201).json({
    note: { id: note.id, body: note.body, authorId: note.authorId.toString(), createdAt: note.createdAt },
  });
}

export async function createDealTask(req: AuthedRequest, res: Response) {
  const parsed = CreateTaskSchema.safeParse(req.body);
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
  const task = await Task.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    title: parsed.data.title,
    assigneeId: req.tenant!.userId,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    status: 'open',
  });
  deal.lastActivityAt = new Date();
  await deal.save();
  res.status(201).json({
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate ?? null,
      assigneeId: task.assigneeId?.toString() ?? null,
    },
  });
}

export async function updateDealTask(req: AuthedRequest, res: Response) {
  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const task = await Task.findOne({
    _id: paramId(req.params.taskId),
    dealId: paramId(req.params.dealId),
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!task) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    return;
  }
  if (parsed.data.title) task.title = parsed.data.title;
  if (parsed.data.status) {
    task.status = parsed.data.status;
    task.completedAt = parsed.data.status === 'done' ? new Date() : undefined;
  }
  await task.save();
  res.json({
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate ?? null,
      assigneeId: task.assigneeId?.toString() ?? null,
    },
  });
}

export async function deleteDealNote(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }
  const note = await Note.findOne({
    _id: paramId(req.params.noteId),
    dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!note) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    return;
  }
  note.deletedAt = new Date();
  await note.save();
  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}

export async function deleteDealTask(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(req.tenant!.workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }
  const task = await Task.findOne({
    _id: paramId(req.params.taskId),
    dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!task) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    return;
  }
  task.deletedAt = new Date();
  await task.save();
  deal.lastActivityAt = new Date();
  await deal.save();
  res.json({ deleted: true });
}

export async function createDealBlocker(req: AuthedRequest, res: Response) {
  const parsed = CreateBlockerSchema.safeParse(req.body);
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
  const blocker = await DealBlocker.create({
    workspaceId: req.tenant!.workspaceId,
    dealId: deal._id,
    title: parsed.data.title,
    description: parsed.data.description,
    severity: parsed.data.severity ?? 'medium',
    ownerId: req.tenant!.userId,
    status: 'open',
  });
  deal.blockerCount = (deal.blockerCount ?? 0) + 1;
  deal.lastActivityAt = new Date();
  await deal.save();
  res.status(201).json({
    blocker: { id: blocker.id, title: blocker.title, severity: blocker.severity, status: blocker.status },
  });
}

export async function resolveDealBlocker(req: AuthedRequest, res: Response) {
  const parsed = ResolveBlockerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const dealId = paramId(req.params.dealId);
  const blocker = await DealBlocker.findOne({
    _id: paramId(req.params.blockerId),
    dealId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!blocker) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Blocker not found' } });
    return;
  }
  blocker.status = 'resolved';
  blocker.resolvedAt = new Date();
  await blocker.save();

  const openCount = await DealBlocker.countDocuments({
    dealId,
    workspaceId: req.tenant!.workspaceId,
    status: 'open',
  });
  await Deal.updateOne({ _id: dealId }, { blockerCount: openCount, lastActivityAt: new Date() });

  res.json({
    blocker: { id: blocker.id, title: blocker.title, severity: blocker.severity, status: blocker.status },
  });
}

export async function getDealOverview(req: AuthedRequest, res: Response) {
  const deal = await Deal.findOne({
    _id: req.params.dealId,
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }
  const company = await Company.findById(deal.companyId);
  res.json({
    header: {
      ...dealCard(deal, company),
      meddpiccCompleteness: deal.meddpiccCompleteness,
      winProbability: deal.winProbability,
      riskScore: deal.riskScore,
    },
  });
}
