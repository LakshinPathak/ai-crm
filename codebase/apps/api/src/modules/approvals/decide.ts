import { createEventEnvelope, publishEvent } from '@ai-crm/events';
import type { Types } from 'mongoose';
import { Approval } from '@ai-crm/db';
import { pushCrmFieldUpdateToHubSpot } from '../../lib/hubspot/crm-field-write-back.js';
import { applyProposedChange, parseProposedChange } from './write-back.js';

export type DecideErrorCode = 'NOT_FOUND' | 'INVALID_STATE';

export type ApproveDecisionResult =
  | {
      ok: true;
      approval: InstanceType<typeof Approval>;
      idempotent?: boolean;
      changeApplied?: boolean;
      writeBack?: { tasksCreated: number; notesCreated: number } | null;
    }
  | { ok: false; code: DecideErrorCode; message: string };

export type RejectDecisionResult =
  | { ok: true; approval: InstanceType<typeof Approval> }
  | { ok: false; code: DecideErrorCode; message: string };

export async function decideApproveApproval(
  workspaceId: string,
  userId: string,
  approvalId: string,
): Promise<ApproveDecisionResult> {
  const approval = await Approval.findOne({
    _id: approvalId,
    workspaceId,
  });
  if (!approval) {
    return { ok: false, code: 'NOT_FOUND', message: 'Approval not found' };
  }

  if (approval.status === 'approved') {
    return { ok: true, approval, idempotent: true };
  }

  if (approval.status !== 'pending') {
    return {
      ok: false,
      code: 'INVALID_STATE',
      message: `Cannot approve approval in status: ${approval.status}`,
    };
  }

  const proposedChange = parseProposedChange(approval.proposedChange);
  let writeBack: { tasksCreated: number; notesCreated: number } | null = null;
  if (proposedChange) {
    writeBack = await applyProposedChange(workspaceId, userId, proposedChange);
    if (proposedChange.type === 'crm_field_update') {
      await pushCrmFieldUpdateToHubSpot(workspaceId, proposedChange.dealId, proposedChange.patch);
    }
  }

  approval.status = 'approved';
  approval.decidedBy = userId as unknown as Types.ObjectId;
  approval.decidedAt = new Date();
  await approval.save();

  publishEvent(
    createEventEnvelope(
      { type: 'approval.approved', workspaceId, approvalId: approval.id },
      workspaceId,
    ),
  );

  return {
    ok: true,
    approval,
    changeApplied: !!proposedChange,
    writeBack,
  };
}

export async function decideRejectApproval(
  workspaceId: string,
  userId: string,
  approvalId: string,
  note = '',
): Promise<RejectDecisionResult> {
  const approval = await Approval.findOne({
    _id: approvalId,
    workspaceId,
    status: 'pending',
  });
  if (!approval) {
    return { ok: false, code: 'NOT_FOUND', message: 'Approval not found' };
  }

  approval.status = 'rejected';
  approval.rejectionNote = note;
  approval.decidedBy = userId as unknown as Types.ObjectId;
  approval.decidedAt = new Date();
  await approval.save();

  return { ok: true, approval };
}
