import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import {
  Deal,
  DealBlocker,
  DealStageChange,
  Note,
  PipelineStage,
  Task,
} from '@ai-crm/db';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

type ActivityEventType =
  | 'note_added'
  | 'task_created'
  | 'task_completed'
  | 'blocker_added'
  | 'blocker_resolved'
  | 'stage_changed'
  | 'deal_created';

type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  occurredAt: string;
  summary: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
};

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

async function assertDeal(workspaceId: string, dealId: string) {
  return Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
}

export async function getDealActivity(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const dealId = paramId(req.params.dealId);
  const deal = await assertDeal(workspaceId, dealId);
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit ?? DEFAULT_LIMIT)));
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const cursorDate = cursor ? new Date(cursor) : undefined;
  const beforeFilter = cursorDate && !Number.isNaN(cursorDate.getTime()) ? { $lt: cursorDate } : undefined;

  const noteFilter: Record<string, unknown> = { workspaceId, dealId: deal._id };
  const taskFilter: Record<string, unknown> = { workspaceId, dealId: deal._id };
  const blockerFilter: Record<string, unknown> = { workspaceId, dealId: deal._id };
  const stageFilter: Record<string, unknown> = { workspaceId, dealId: deal._id };

  if (beforeFilter) {
    noteFilter.createdAt = beforeFilter;
    taskFilter.updatedAt = beforeFilter;
    blockerFilter.updatedAt = beforeFilter;
    stageFilter.createdAt = beforeFilter;
  }

  const [notes, tasks, blockers, stageChanges] = await Promise.all([
    Note.find(noteFilter).sort({ createdAt: -1 }).limit(MAX_LIMIT).lean(),
    Task.find(taskFilter).sort({ updatedAt: -1 }).limit(MAX_LIMIT).lean(),
    DealBlocker.find(blockerFilter).sort({ updatedAt: -1 }).limit(MAX_LIMIT).lean(),
    DealStageChange.find(stageFilter).sort({ createdAt: -1 }).limit(MAX_LIMIT).lean(),
  ]);

  const stageIds = [
    ...new Set(
      stageChanges.flatMap((s) => [s.fromStageId?.toString(), s.toStageId.toString()].filter(Boolean)),
    ),
  ];
  const stages = stageIds.length
    ? await PipelineStage.find({ _id: { $in: stageIds } }, { name: 1 }).lean()
    : [];
  const stageNameMap = new Map(stages.map((s) => [s._id.toString(), s.name as string]));

  const events: ActivityEvent[] = [];

  for (const note of notes) {
    events.push({
      id: `note:${note._id.toString()}`,
      type: 'note_added',
      occurredAt: (note.createdAt as Date).toISOString(),
      summary: String(note.body).slice(0, 200),
      actorId: note.authorId?.toString(),
    });
  }

  for (const task of tasks) {
    if (task.completedAt) {
      events.push({
        id: `task-done:${task._id.toString()}`,
        type: 'task_completed',
        occurredAt: (task.completedAt as Date).toISOString(),
        summary: task.title,
        actorId: task.assigneeId?.toString(),
        metadata: { taskId: task._id.toString() },
      });
    }
    events.push({
      id: `task:${task._id.toString()}`,
      type: 'task_created',
      occurredAt: (task.createdAt as Date).toISOString(),
      summary: task.title,
      actorId: task.assigneeId?.toString(),
      metadata: { taskId: task._id.toString(), status: task.status },
    });
  }

  for (const blocker of blockers) {
    events.push({
      id: `blocker:${blocker._id.toString()}`,
      type: 'blocker_added',
      occurredAt: (blocker.createdAt as Date).toISOString(),
      summary: blocker.title,
      actorId: blocker.ownerId?.toString(),
      metadata: { severity: blocker.severity },
    });
    if (blocker.resolvedAt) {
      events.push({
        id: `blocker-resolved:${blocker._id.toString()}`,
        type: 'blocker_resolved',
        occurredAt: (blocker.resolvedAt as Date).toISOString(),
        summary: blocker.title,
        actorId: blocker.ownerId?.toString(),
        metadata: { blockerId: blocker._id.toString() },
      });
    }
  }

  for (const change of stageChanges) {
    const fromName = change.fromStageId
      ? stageNameMap.get(change.fromStageId.toString()) ?? 'Previous stage'
      : null;
    const toName = stageNameMap.get(change.toStageId.toString()) ?? 'New stage';
    events.push({
      id: `stage:${change._id.toString()}`,
      type: 'stage_changed',
      occurredAt: (change.createdAt as Date).toISOString(),
      summary: fromName ? `Moved from ${fromName} to ${toName}` : `Entered ${toName}`,
      actorId: change.changedById?.toString(),
      metadata: {
        fromStageId: change.fromStageId?.toString() ?? null,
        toStageId: change.toStageId.toString(),
      },
    });
  }

  if (!cursor) {
    events.push({
      id: `deal-created:${deal.id}`,
      type: 'deal_created',
      occurredAt: deal.createdAt.toISOString(),
      summary: `Deal created: ${deal.title}`,
      actorId: deal.ownerId.toString(),
    });
  }

  const sorted = events
    .filter((e) => !cursorDate || new Date(e.occurredAt) < cursorDate)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);

  const nextCursor =
    sorted.length === limit ? sorted[sorted.length - 1]?.occurredAt : undefined;

  res.json({ events: sorted, nextCursor });
}
