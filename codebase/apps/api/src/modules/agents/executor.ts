import { Agent, AgentRun, Approval, Deal } from '@ai-crm/db';
import { deliverAgentOutput, type DeliveryConfig } from '../../lib/chat-delivery.js';
import { notifyPendingApprovalsSlack } from '../../lib/integrations/approval-slack-notify.js';
import type { Types } from 'mongoose';
import { addAgentRunJob } from '../../lib/queues/agent-runs.js';
import { runClosedWonHandoff } from './executors/closed-won-handoff.js';
import { runBuyingSignals } from './executors/buying-signals.js';
import { runCrmHygiene } from './executors/crm-hygiene.js';
import { runDealFocus } from './executors/deal-focus.js';
import { runMeddpiccSynth } from './executors/meddpicc-synth.js';
import { runObjectionTracker } from './executors/objection-tracker.js';
import { runPocKickoff } from './executors/poc-kickoff.js';
import { runPostCall } from './executors/post-call.js';
import { runProductFeedback } from './executors/product-feedback.js';
import { runWeeklyDigest } from './executors/weekly-digest.js';
import { runWinLossAnalysis } from './executors/win-loss-analysis.js';
import type { AgentRunContext, AgentRunResult } from './executors/types.js';

export type { AgentRunContext, AgentRunResult } from './executors/types.js';

const STALL_DAYS = 14;
const MS_PER_DAY = 86400000;

/** Enqueue agent run via MongoDB background job queue. */
export function enqueueAgentRun(ctx: AgentRunContext): void {
  void addAgentRunJob(ctx).catch((err) => {
    console.error(`Agent run ${ctx.runId} enqueue failed:`, err);
  });
}

export async function processAgentRun(ctx: AgentRunContext): Promise<void> {
  try {
    const result = await runByTemplate(ctx);
    const run = await AgentRun.findById(ctx.runId);
    if (!run) return;

    run.status = result.status;
    run.creditsUsed = result.creditsUsed;
    run.completedAt = new Date();
    run.scope = { ...(run.scope as Record<string, unknown> | undefined), output: result.output };
    if (result.error) run.error = result.error;
    await run.save();

    if (result.status !== 'failed') {
      const agent = await Agent.findById(ctx.agentId);

      if (agent?.deliveryConfig) {
        await deliverAgentOutput({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          agent: {
            id: agent.id,
            name: agent.name,
            templateSlug: agent.templateSlug,
            deliveryConfig: agent.deliveryConfig as DeliveryConfig,
          },
          result: { status: result.status, output: result.output },
        });
      }

      if (result.status === 'awaiting_approval') {
        await notifyPendingApprovalsSlack({
          workspaceId: ctx.workspaceId,
          agentRunId: ctx.runId,
          agentName: agent?.name ?? null,
          deliveryConfig: (agent?.deliveryConfig as DeliveryConfig | undefined) ?? null,
        });
      }
    }
  } catch (err) {
    await AgentRun.findByIdAndUpdate(ctx.runId, {
      status: 'failed',
      completedAt: new Date(),
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

async function runByTemplate(ctx: AgentRunContext): Promise<AgentRunResult> {
  switch (ctx.templateSlug) {
    case 'meddpicc-synth':
      return runMeddpiccSynth(ctx);
    case 'crm-hygiene':
      return runCrmHygiene(ctx);
    case 'deal-focus':
      return runDealFocus(ctx);
    case 'post-call':
    case 'meeting-summary':
      return runPostCall(ctx);
    case 'buying-signals':
      return runBuyingSignals(ctx);
    case 'poc-kickoff':
      return runPocKickoff(ctx);
    case 'closed-won-handoff':
      return runClosedWonHandoff(ctx);
    case 'objection-tracker':
      return runObjectionTracker(ctx);
    case 'product-feedback':
      return runProductFeedback(ctx);
    case 'weekly-digest':
      return runWeeklyDigest(ctx);
    case 'win-loss-analysis':
      return runWinLossAnalysis(ctx);
    case 'risk-scanner':
    case 'deal-stalling':
      return runRiskScanner(ctx);
    default:
      return {
        status: 'completed',
        creditsUsed: 0,
        output: { message: `No executor registered for template: ${ctx.templateSlug}` },
      };
  }
}

async function runRiskScanner(ctx: AgentRunContext): Promise<AgentRunResult> {
  const cutoff = new Date(Date.now() - STALL_DAYS * MS_PER_DAY);
  const filter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    status: 'open',
    deletedAt: null,
    $or: [
      { lastActivityAt: { $lt: cutoff } },
      { lastActivityAt: null, updatedAt: { $lt: cutoff } },
    ],
  };
  if (ctx.dealId) filter._id = ctx.dealId;

  const stalledDeals = await Deal.find(filter);
  const approvalIds: string[] = [];

  for (const deal of stalledDeals) {
    const daysSince = deal.lastActivityAt
      ? Math.floor((Date.now() - deal.lastActivityAt.getTime()) / MS_PER_DAY)
      : Math.floor((Date.now() - deal.updatedAt.getTime()) / MS_PER_DAY);

    const approval = await Approval.create({
      workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
      agentRunId: ctx.runId as unknown as Types.ObjectId,
      dealId: deal._id,
      assignedTo: deal.ownerId,
      status: 'pending',
      contentType: 'task_batch',
      title: `Stalled deal: ${deal.title}`,
      contentPreview: {
        summary: `No activity for ${daysSince} days`,
        riskSignal: 'stalled_activity',
      },
      contentFull: {
        dealId: deal.id,
        dealTitle: deal.title,
        daysSinceActivity: daysSince,
        recommendedActions: ['Schedule follow-up call', 'Review deal status with stakeholders'],
      },
      proposedChange: {
        type: 'note_create',
        dealId: deal.id,
        body: `Risk scanner: no activity for ${daysSince} days — schedule follow-up.`,
      },
      expiresAt: new Date(Date.now() + 7 * MS_PER_DAY),
    });
    approvalIds.push(approval.id);
  }

  return {
    status: approvalIds.length > 0 ? 'awaiting_approval' : 'completed',
    creditsUsed: 0.2,
    output: {
      stalledDealsFound: stalledDeals.length,
      approvalsCreated: approvalIds.length,
      approvalIds,
      dealIds: stalledDeals.map((d) => d.id),
    },
  };
}
