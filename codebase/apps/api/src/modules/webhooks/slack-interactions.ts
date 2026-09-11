import type { Request, Response } from 'express';
import { Approval, IntegrationConnection } from '@ai-crm/db';
import { verifySlackRequestSignature } from '../../lib/integrations/slack-signature.js';
import { log } from '../../lib/logger.js';
import { decideApproveApproval, decideRejectApproval } from '../approvals/decide.js';

function getRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  return '';
}

type SlackBlockActionPayload = {
  type?: string;
  team?: { id?: string };
  user?: { id?: string };
  actions?: Array<{ action_id?: string; value?: string }>;
};

function sendEphemeral(res: Response, text: string): void {
  res.status(200).json({
    response_type: 'ephemeral',
    text,
  });
}

async function workspaceIdForSlackTeam(teamId: string): Promise<string | null> {
  const conn = await IntegrationConnection.findOne({
    providerKey: 'slack',
    externalAccountId: teamId,
    status: 'connected',
  });
  return conn?.workspaceId?.toString() ?? null;
}

export async function handleSlackInteractions(req: Request, res: Response): Promise<void> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';
  const rawBody = getRawBody(req);
  const auth = verifySlackRequestSignature(
    signingSecret,
    req.header('x-slack-signature'),
    req.header('x-slack-request-timestamp'),
    rawBody,
  );

  if (!auth.ok) {
    log('webhooks', 'slack interactions auth failed', { reason: auth.reason });
    res.status(401).send('invalid signature');
    return;
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get('payload');
  if (!payloadRaw) {
    res.status(400).send('missing payload');
    return;
  }

  let payload: SlackBlockActionPayload;
  try {
    payload = JSON.parse(payloadRaw) as SlackBlockActionPayload;
  } catch {
    res.status(400).send('invalid payload json');
    return;
  }

  log('webhooks', 'slack interaction received', {
    type: payload.type ?? null,
    actionIds: (payload.actions ?? []).map((a) => a.action_id ?? null),
  });

  if (payload.type !== 'block_actions') {
    res.status(200).send('');
    return;
  }

  const action = payload.actions?.[0];
  const actionId = action?.action_id;
  const approvalId = action?.value?.trim();
  const teamId = payload.team?.id?.trim();

  if (!actionId || !approvalId || !teamId) {
    sendEphemeral(res, 'Could not process that action. Open the approvals queue in the app.');
    return;
  }

  if (actionId !== 'approve' && actionId !== 'reject') {
    res.status(200).send('');
    return;
  }

  const workspaceId = await workspaceIdForSlackTeam(teamId);
  if (!workspaceId) {
    sendEphemeral(res, 'This Slack workspace is not linked to AI CRM.');
    return;
  }

  const approval = await Approval.findOne({ _id: approvalId, workspaceId });
  if (!approval) {
    sendEphemeral(res, 'Approval not found or already handled.');
    return;
  }

  const actorUserId = approval.assignedTo.toString();

  if (actionId === 'approve') {
    const result = await decideApproveApproval(workspaceId, actorUserId, approvalId);
    if (!result.ok) {
      const message =
        result.code === 'INVALID_STATE'
          ? result.message
          : 'Approval not found or already handled.';
      sendEphemeral(res, message);
      return;
    }
    if (result.idempotent) {
      sendEphemeral(res, `Already approved: *${approval.title}*`);
      return;
    }
    sendEphemeral(res, `Approved: *${approval.title}*`);
    return;
  }

  const result = await decideRejectApproval(workspaceId, actorUserId, approvalId);
  if (!result.ok) {
    sendEphemeral(res, 'Approval not found or already handled.');
    return;
  }
  sendEphemeral(res, `Rejected: *${approval.title}*`);
}
