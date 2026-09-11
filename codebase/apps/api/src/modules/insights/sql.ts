import { Types } from 'mongoose';
import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { AgentRun, Approval, Deal, User } from '@ai-crm/db';

const SqlBodySchema = z.object({
  query: z.string().min(1).max(10_000),
});

const FORBIDDEN_SQL =
  /\b(insert|update|delete|drop|alter|create|truncate|exec|execute|grant|revoke|merge|call)\b/i;

/** Strip comments and verify a single read-only SELECT statement. */
export function isReadOnlySelectQuery(raw: string): boolean {
  const withoutComments = raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ');
  const statements = withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.length !== 1) return false;
  const stmt = statements[0];
  if (!/^select\b/i.test(stmt)) return false;
  if (FORBIDDEN_SQL.test(stmt)) return false;
  return true;
}

async function buildWorkspaceMetricsRows(workspaceId: Types.ObjectId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [openDeals, wonDeals, members, pendingApprovals, runs30d, creditsAgg] = await Promise.all([
    Deal.find({ workspaceId, deletedAt: null, status: 'open' }),
    Deal.find({ workspaceId, deletedAt: null, status: 'won' }),
    User.find({ workspaceId, isActive: true }),
    Approval.countDocuments({ workspaceId, status: 'pending' }),
    AgentRun.countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo } }),
    AgentRun.aggregate([
      { $match: { workspaceId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } },
    ]),
  ]);

  const pipelineValue = openDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const closedWonValue = wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const winRate =
    openDeals.length + wonDeals.length > 0
      ? Math.round((wonDeals.length / (openDeals.length + wonDeals.length)) * 100)
      : 0;

  return [
    ['members', members.length],
    ['active_deals', openDeals.length],
    ['open_pipeline', pipelineValue],
    ['closed_won', closedWonValue],
    ['win_rate_pct', winRate],
    ['pending_approvals', pendingApprovals],
    ['agent_runs_30d', runs30d],
    ['credits_used_30d', creditsAgg[0]?.total ?? 0],
    ['hot_deals', openDeals.filter((d) => d.isHot).length],
  ] as Array<[string, number]>;
}

export async function postInsightsSql(req: AuthedRequest, res: Response) {
  const parsed = SqlBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const { query } = parsed.data;
  if (!isReadOnlySelectQuery(query)) {
    res.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Only a single read-only SELECT statement is allowed.',
      },
    });
    return;
  }

  const workspaceId = new Types.ObjectId(req.tenant!.workspaceId);
  const rows = await buildWorkspaceMetricsRows(workspaceId);

  res.json({
    stub: true,
    message: 'SQL explorer is coming soon — returning workspace overview metrics for demo.',
    columns: ['metric', 'value'],
    rows,
    rowCount: rows.length,
  });
}
