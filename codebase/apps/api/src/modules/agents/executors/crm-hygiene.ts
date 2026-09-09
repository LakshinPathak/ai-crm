import { Approval, Deal } from '@ai-crm/db';
import type { Types } from 'mongoose';
import type { AgentRunContext, AgentRunResult } from './types.js';

const MS_PER_DAY = 86400000;
const STALE_DAYS = 21;
const APPROVAL_EXPIRY_DAYS = 7;

type HygieneIssue = {
  field: string;
  current: string;
  suggested: string;
  reason: string;
};

function detectHygieneIssues(deal: InstanceType<typeof Deal>): HygieneIssue[] {
  const issues: HygieneIssue[] = [];
  const now = Date.now();

  if (!deal.amount || deal.amount <= 0) {
    issues.push({
      field: 'amount',
      current: String(deal.amount ?? 0),
      suggested: 'Set deal amount from latest quote or forecast',
      reason: 'Missing or zero amount reduces pipeline accuracy',
    });
  }

  if (!deal.expectedCloseDate) {
    issues.push({
      field: 'expectedCloseDate',
      current: 'not set',
      suggested: new Date(now + 45 * MS_PER_DAY).toISOString().slice(0, 10),
      reason: 'No close date makes forecasting unreliable',
    });
  } else if (deal.expectedCloseDate.getTime() < now - MS_PER_DAY) {
    issues.push({
      field: 'expectedCloseDate',
      current: deal.expectedCloseDate.toISOString().slice(0, 10),
      suggested: new Date(now + 30 * MS_PER_DAY).toISOString().slice(0, 10),
      reason: 'Close date is in the past',
    });
  }

  const lastActivity = deal.lastActivityAt ?? deal.updatedAt;
  const daysSince = Math.floor((now - lastActivity.getTime()) / MS_PER_DAY);
  if (daysSince >= STALE_DAYS) {
    issues.push({
      field: 'lastActivityAt',
      current: `${daysSince} days ago`,
      suggested: 'Log a follow-up note or task after next customer touchpoint',
      reason: 'Deal has gone stale without logged activity',
    });
  }

  if (deal.sentiment === 'red' && !deal.isHot) {
    issues.push({
      field: 'sentiment',
      current: deal.sentiment,
      suggested: 'yellow',
      reason: 'Red sentiment without hot flag — confirm risk status with owner',
    });
  }

  return issues;
}

function buildPatchFromIssues(issues: HygieneIssue[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const issue of issues) {
    if (issue.field === 'expectedCloseDate' && issue.suggested.match(/^\d{4}-\d{2}-\d{2}$/)) {
      patch.expectedCloseDate = issue.suggested;
    }
    if (issue.field === 'sentiment' && (issue.suggested === 'yellow' || issue.suggested === 'green')) {
      patch.sentiment = issue.suggested;
    }
  }
  return patch;
}

export async function runCrmHygiene(ctx: AgentRunContext): Promise<AgentRunResult> {
  const filter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    status: 'open',
    deletedAt: null,
  };
  if (ctx.dealId) filter._id = ctx.dealId;

  const deals = await Deal.find(filter).limit(ctx.dealId ? 1 : 25);
  const approvalIds: string[] = [];
  const dealSummaries: Array<{ dealId: string; title: string; issueCount: number }> = [];

  for (const deal of deals) {
    const issues = detectHygieneIssues(deal);
    if (issues.length === 0) continue;

    const patch = buildPatchFromIssues(issues);
    const summary = issues.map((i) => `- ${i.field}: ${i.reason}`).join('\n');

    const approval = await Approval.create({
      workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
      agentRunId: ctx.runId as unknown as Types.ObjectId,
      dealId: deal._id,
      assignedTo: deal.ownerId,
      status: 'pending',
      contentType: 'crm_update',
      title: `CRM hygiene: ${deal.title}`,
      contentPreview: {
        issueCount: issues.length,
        fields: issues.map((i) => i.field),
      },
      contentFull: {
        dealId: deal.id,
        dealTitle: deal.title,
        issues,
        summary,
      },
      proposedChange: {
        type: 'crm_field_update',
        dealId: deal.id,
        patch,
        etag: deal.updatedAt.toISOString(),
      },
      expiresAt: new Date(Date.now() + APPROVAL_EXPIRY_DAYS * MS_PER_DAY),
    });

    approvalIds.push(approval.id);
    dealSummaries.push({ dealId: deal.id, title: deal.title, issueCount: issues.length });
  }

  return {
    status: approvalIds.length > 0 ? 'awaiting_approval' : 'completed',
    creditsUsed: 0.1,
    output: {
      dealsScanned: deals.length,
      dealsWithIssues: dealSummaries.length,
      approvalIds,
      dealSummaries,
    },
  };
}
