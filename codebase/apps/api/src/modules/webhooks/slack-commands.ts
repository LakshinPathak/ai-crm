import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { Approval, Company, Deal } from '@ai-crm/db';
import { verifySlackRequestSignature } from '../../lib/integrations/slack-signature.js';
import { log } from '../../lib/logger.js';
import { decideApproveApproval } from '../approvals/decide.js';
import { getRawBody, sendEphemeral, workspaceIdForSlackTeam } from './slack-common.js';

const HELP_TEXT = [
  'AI CRM commands:',
  '`/focus` — up to 5 open hot (or highest win-probability) deals',
  '`/deal <query>` — search deals by title or company',
  '`/approve` — list pending approvals (use in-app or Slack Approve buttons)',
  '`/approve <id>` — approve a pending item by id',
].join('\n');

const UNLINKED_TEXT = 'Slack workspace not connected';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function webBaseUrl(): string {
  return (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function slackLabel(value: string): string {
  return value.replace(/[<>&|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dealLine(deal: { id: string; title: string; amount?: number | null }, extra?: string): string {
  const amount = typeof deal.amount === 'number' ? ` · ${deal.amount}` : '';
  const suffix = extra ? ` · ${extra}` : '';
  const url = `${webBaseUrl()}/deals/${deal.id}`;
  return `• <${url}|${slackLabel(deal.title) || 'Deal'}>${amount}${suffix}`;
}

function isApprovalObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value) && isValidObjectId(value);
}

async function handleFocus(workspaceId: string): Promise<string> {
  const deals = await Deal.find({
    workspaceId,
    deletedAt: null,
    status: 'open',
  })
    .sort({ isHot: -1, winProbability: -1, updatedAt: -1 })
    .limit(5);

  if (deals.length === 0) {
    return 'No open deals in this workspace.';
  }

  const lines = deals.map((d) =>
    dealLine(
      { id: d.id, title: d.title, amount: d.amount },
      d.isHot ? 'hot' : `win ${d.winProbability ?? 0}%`,
    ),
  );
  return `Focus deals:\n${lines.join('\n')}`;
}

async function handleDealSearch(workspaceId: string, query: string): Promise<string> {
  if (!query) {
    return 'Usage: `/deal <query>` — search by deal title or company name.';
  }

  const escaped = escapeRegex(query.slice(0, 80));
  const companies = await Company.find({
    workspaceId,
    deletedAt: null,
    name: { $regex: escaped, $options: 'i' },
  })
    .select('_id')
    .limit(25);

  const companyIds = companies.map((c) => c._id);
  const deals = await Deal.find({
    workspaceId,
    deletedAt: null,
    $or: [
      { title: { $regex: escaped, $options: 'i' } },
      ...(companyIds.length ? [{ companyId: { $in: companyIds } }] : []),
    ],
  }).limit(5);

  if (deals.length === 0) {
    return `No deals matching "${query}".`;
  }

  const lines = deals.map((d) => dealLine({ id: d.id, title: d.title, amount: d.amount }));
  return `Deals matching "${query}":\n${lines.join('\n')}`;
}

async function handleApprove(workspaceId: string, text: string): Promise<string> {
  if (text && isApprovalObjectId(text)) {
    const approval = await Approval.findOne({ _id: text, workspaceId });
    if (!approval) {
      return 'Approval not found or already handled.';
    }
    const actorUserId = approval.assignedTo.toString();
    const result = await decideApproveApproval(workspaceId, actorUserId, text);
    if (!result.ok) {
      return result.code === 'INVALID_STATE'
        ? result.message
        : 'Approval not found or already handled.';
    }
    if (result.idempotent) {
      return `Already approved: *${slackLabel(approval.title)}*`;
    }
    return `Approved: *${slackLabel(approval.title)}*`;
  }

  if (text) {
    return 'Provide a valid approval id, or run `/approve` with no text to list pending items. Do not use slash commands to approve without an id.';
  }

  const pending = await Approval.find({ workspaceId, status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(5);

  if (pending.length === 0) {
    return 'No pending approvals. Use the app or Slack Approve buttons when notifications arrive.';
  }

  const lines = pending.map((a) => {
    const id = a.id;
    const dealBit = a.dealId ? ` — <${webBaseUrl()}/deals/${a.dealId.toString()}|deal>` : '';
    return `• *${slackLabel(a.title)}* (\`${id}\`)${dealBit}`;
  });

  return [
    'Pending approvals (use in-app or existing Slack Approve/Reject buttons — slash `/approve` without an id does not auto-approve):',
    ...lines,
    'To approve from Slack text: `/approve <id>`',
  ].join('\n');
}

export async function handleSlackCommands(req: Request, res: Response): Promise<void> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';
  const rawBody = getRawBody(req);
  const auth = verifySlackRequestSignature(
    signingSecret,
    req.header('x-slack-signature'),
    req.header('x-slack-request-timestamp'),
    rawBody,
  );

  if (!auth.ok) {
    log('webhooks', 'slack commands auth failed', { reason: auth.reason });
    res.status(401).send('invalid signature');
    return;
  }

  try {
    const params = new URLSearchParams(rawBody);
    const command = (params.get('command') ?? '').trim().toLowerCase();
    const text = (params.get('text') ?? '').trim();
    const teamId = (params.get('team_id') ?? '').trim();

    log('webhooks', 'slack command received', { command: command || null });

    if (!teamId) {
      sendEphemeral(res, UNLINKED_TEXT);
      return;
    }

    const workspaceId = await workspaceIdForSlackTeam(teamId);
    if (!workspaceId) {
      sendEphemeral(res, UNLINKED_TEXT);
      return;
    }

    const isFocus =
      command === '/focus' || (command === '/aicrm' && text.length === 0);

    if (isFocus) {
      sendEphemeral(res, await handleFocus(workspaceId));
      return;
    }

    if (command === '/deal') {
      sendEphemeral(res, await handleDealSearch(workspaceId, text));
      return;
    }

    if (command === '/approve') {
      sendEphemeral(res, await handleApprove(workspaceId, text));
      return;
    }

    sendEphemeral(res, HELP_TEXT);
  } catch (err) {
    log('webhooks', 'slack command failed', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    sendEphemeral(res, 'Something went wrong. Try again or open the app.');
  }
}
