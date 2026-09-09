import { Deal, Note, Task } from '@ai-crm/db';
import type { Types } from 'mongoose';

export type DealUpdatePatch = {
  title?: string;
  amount?: number;
  stageId?: string;
  isHot?: boolean;
  sentiment?: 'green' | 'yellow' | 'red';
  expectedCloseDate?: string;
};

export type TaskSuggestion = {
  title: string;
  dueDate?: string;
};

export type EmailDraft = {
  subject: string;
  body: string;
  to?: string;
};

export type ProposedChange =
  | { type: 'deal_update'; dealId: string; patch: DealUpdatePatch }
  | { type: 'note_create'; dealId: string; body: string }
  | { type: 'crm_field_update'; dealId: string; patch: DealUpdatePatch; etag?: string }
  | {
      type: 'post_call_bundle';
      dealId: string;
      note: { type: 'note_create'; dealId: string; body: string };
      tasks: TaskSuggestion[];
      email: EmailDraft;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function parseDealPatch(raw: unknown): DealUpdatePatch | null {
  if (!isRecord(raw)) return null;
  const patch: DealUpdatePatch = {};
  if (typeof raw.title === 'string') patch.title = raw.title;
  if (typeof raw.amount === 'number') patch.amount = raw.amount;
  if (typeof raw.stageId === 'string') patch.stageId = raw.stageId;
  if (typeof raw.expectedCloseDate === 'string') patch.expectedCloseDate = raw.expectedCloseDate;
  if (typeof raw.isHot === 'boolean') patch.isHot = raw.isHot;
  if (raw.sentiment === 'green' || raw.sentiment === 'yellow' || raw.sentiment === 'red') {
    patch.sentiment = raw.sentiment;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function parseTaskSuggestions(raw: unknown): TaskSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      dueDate: typeof item.dueDate === 'string' ? item.dueDate : undefined,
    }))
    .filter((item) => item.title.length > 0);
}

export function parseProposedChange(raw: unknown): ProposedChange | null {
  if (!isRecord(raw) || typeof raw.type !== 'string' || typeof raw.dealId !== 'string') {
    return null;
  }

  if (raw.type === 'deal_update' && isRecord(raw.patch)) {
    const patch = parseDealPatch(raw.patch);
    if (!patch) return null;
    return { type: 'deal_update', dealId: raw.dealId, patch };
  }

  if (raw.type === 'crm_field_update' && isRecord(raw.patch)) {
    const patch = parseDealPatch(raw.patch);
    if (!patch) return null;
    return {
      type: 'crm_field_update',
      dealId: raw.dealId,
      patch,
      etag: typeof raw.etag === 'string' ? raw.etag : undefined,
    };
  }

  if (raw.type === 'note_create' && typeof raw.body === 'string') {
    return { type: 'note_create', dealId: raw.dealId, body: raw.body };
  }

  if (raw.type === 'post_call_bundle' && isRecord(raw.note) && isRecord(raw.email)) {
    const noteBody =
      typeof raw.note.body === 'string'
        ? raw.note.body
        : typeof raw.note === 'object' && 'body' in raw.note && typeof raw.note.body === 'string'
          ? raw.note.body
          : null;
    if (!noteBody) return null;

    const email: EmailDraft = {
      subject: typeof raw.email.subject === 'string' ? raw.email.subject : 'Follow-up',
      body: typeof raw.email.body === 'string' ? raw.email.body : '',
      to: typeof raw.email.to === 'string' ? raw.email.to : undefined,
    };

    return {
      type: 'post_call_bundle',
      dealId: raw.dealId,
      note: { type: 'note_create', dealId: raw.dealId, body: noteBody },
      tasks: parseTaskSuggestions(raw.tasks),
      email,
    };
  }

  return null;
}

async function applyDealPatch(
  deal: InstanceType<typeof Deal>,
  patch: DealUpdatePatch,
): Promise<void> {
  if (patch.title) deal.title = patch.title;
  if (patch.amount !== undefined) deal.amount = patch.amount;
  if (patch.stageId) deal.stageId = patch.stageId as unknown as Types.ObjectId;
  if (patch.expectedCloseDate) deal.expectedCloseDate = new Date(patch.expectedCloseDate);
  if (patch.isHot !== undefined) deal.isHot = patch.isHot;
  if (patch.sentiment) deal.sentiment = patch.sentiment;
  deal.lastActivityAt = new Date();
  await deal.save();
}

/** Apply approved changes to local deal/note/task records. */
export async function applyProposedChange(
  workspaceId: string,
  userId: string,
  proposedChange: ProposedChange,
): Promise<{ tasksCreated: number; notesCreated: number }> {
  const deal = await Deal.findOne({
    _id: proposedChange.dealId,
    workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    throw new Error('Deal not found for proposed change');
  }

  let tasksCreated = 0;
  let notesCreated = 0;

  if (proposedChange.type === 'deal_update' || proposedChange.type === 'crm_field_update') {
    await applyDealPatch(deal, proposedChange.patch);
    return { tasksCreated, notesCreated };
  }

  if (proposedChange.type === 'post_call_bundle') {
    await Note.create({
      workspaceId,
      dealId: deal._id,
      authorId: userId as unknown as Types.ObjectId,
      body: proposedChange.note.body,
    });
    notesCreated += 1;

    for (const task of proposedChange.tasks) {
      await Task.create({
        workspaceId,
        dealId: deal._id,
        title: task.title,
        assigneeId: deal.ownerId,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        status: 'open',
      });
      tasksCreated += 1;
    }

    const emailLines = [
      '[Email draft — not sent automatically]',
      proposedChange.email.to ? `To: ${proposedChange.email.to}` : null,
      `Subject: ${proposedChange.email.subject}`,
      '',
      proposedChange.email.body,
    ]
      .filter((line): line is string => line !== null)
      .join('\n');

    await Note.create({
      workspaceId,
      dealId: deal._id,
      authorId: userId as unknown as Types.ObjectId,
      body: emailLines,
    });
    notesCreated += 1;

    deal.lastActivityAt = new Date();
    await deal.save();
    return { tasksCreated, notesCreated };
  }

  await Note.create({
    workspaceId,
    dealId: deal._id,
    authorId: userId as unknown as Types.ObjectId,
    body: proposedChange.body,
  });
  notesCreated += 1;
  deal.lastActivityAt = new Date();
  await deal.save();
  return { tasksCreated, notesCreated };
}
