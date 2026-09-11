import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Agent, AgentRun, Approval, Deal } from '@ai-crm/db';
import { decideApproveApproval, decideRejectApproval } from './decide.js';

function toDto(a: InstanceType<typeof Approval>, dealTitle?: string) {
  return {
    id: a.id,
    dealId: a.dealId?.toString() ?? null,
    dealTitle: dealTitle ?? null,
    title: a.title,
    status: a.status,
    contentType: a.contentType,
    contentPreview: a.contentPreview,
    assignedTo: a.assignedTo.toString(),
    expiresAt: a.expiresAt,
    decidedAt: a.decidedAt ?? null,
    rejectionNote: a.rejectionNote ?? null,
    createdAt: a.createdAt,
  };
}

export async function listApprovals(req: AuthedRequest, res: Response) {
  const filter: Record<string, unknown> = { workspaceId: req.tenant!.workspaceId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignee === 'me') filter.assignedTo = req.tenant!.userId;
  if (req.query.dealId) filter.dealId = req.query.dealId;

  const approvals = await Approval.find(filter).sort({ createdAt: -1 }).limit(50);
  const dealIds = approvals.filter((a) => a.dealId).map((a) => a.dealId);
  const deals = await Deal.find({ _id: { $in: dealIds } });
  const dealMap = new Map(deals.map((d) => [d.id, d.title]));

  res.json({
    approvals: approvals.map((a) => toDto(a, a.dealId ? dealMap.get(a.dealId.toString()) : undefined)),
  });
}

export async function countApprovals(req: AuthedRequest, res: Response) {
  const count = await Approval.countDocuments({
    workspaceId: req.tenant!.workspaceId,
    assignedTo: req.tenant!.userId,
    status: 'pending',
  });
  res.json({ count });
}

export async function getApproval(req: AuthedRequest, res: Response) {
  const approval = await Approval.findOne({
    _id: req.params.approvalId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!approval) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Approval not found' } });
    return;
  }
  const deal = approval.dealId ? await Deal.findById(approval.dealId) : null;
  const run = await AgentRun.findById(approval.agentRunId);
  const agent = run ? await Agent.findById(run.agentId) : null;
  res.json({
    approval: {
      ...toDto(approval, deal?.title),
      contentFull: approval.contentFull,
      proposedChange: approval.proposedChange ?? null,
      agentName: agent?.name ?? null,
    },
  });
}

export async function approveItem(req: AuthedRequest, res: Response) {
  const approvalId = String(req.params.approvalId);
  const result = await decideApproveApproval(
    req.tenant!.workspaceId,
    req.tenant!.userId,
    approvalId,
  );
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 409;
    res.status(status).json({ error: { code: result.code, message: result.message } });
    return;
  }

  res.json({
    approval: toDto(result.approval),
    ...(result.idempotent ? { idempotent: true } : {}),
    ...(result.idempotent
      ? {}
      : { changeApplied: result.changeApplied, writeBack: result.writeBack }),
  });
}

export async function rejectItem(req: AuthedRequest, res: Response) {
  const body = req.body as { note?: string };
  const approvalId = String(req.params.approvalId);
  const result = await decideRejectApproval(
    req.tenant!.workspaceId,
    req.tenant!.userId,
    approvalId,
    body.note ?? '',
  );
  if (!result.ok) {
    res.status(404).json({ error: { code: result.code, message: result.message } });
    return;
  }

  res.json({ approval: toDto(result.approval) });
}
