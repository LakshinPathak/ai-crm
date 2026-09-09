import type { Response } from 'express';
import { Artifact, Deal, DealEvent } from '@ai-crm/db';
import type { AuthedRequest } from '../../lib/auth/index.js';

type CallRow = {
  id: string;
  title: string;
  source: string;
  date: string;
  dealId: string | null;
  dealTitle: string | null;
};

async function dealTitles(
  workspaceId: string,
  dealIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(dealIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const deals = await Deal.find({ workspaceId, _id: { $in: unique } }).select('title');
  return new Map(deals.map((d) => [d.id, d.title]));
}

function toCallRow(
  row: {
    id: string;
    title: string;
    source: string;
    date: Date;
    dealId?: string | null;
  },
  titles: Map<string, string>,
): CallRow {
  const dealId = row.dealId ?? null;
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    date: row.date.toISOString(),
    dealId,
    dealTitle: dealId ? titles.get(dealId) ?? null : null,
  };
}

export async function listCalls(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 20));

  const artifacts = await Artifact.find({ workspaceId, type: 'call' })
    .sort({ occurredAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (artifacts.length > 0) {
    const dealIds = artifacts.map((a) => a.dealId?.toString()).filter(Boolean) as string[];
    const titles = await dealTitles(workspaceId, dealIds);
    const calls = artifacts.map((a) =>
      toCallRow(
        {
          id: a.id,
          title: a.title ?? `Call (${a.source})`,
          source: a.source,
          date: a.occurredAt ?? a.createdAt,
          dealId: a.dealId?.toString(),
        },
        titles,
      ),
    );
    const total = await Artifact.countDocuments({ workspaceId, type: 'call' });
    res.json({ calls, source: 'db', page, limit, total });
    return;
  }

  const events = await DealEvent.find({ workspaceId, type: 'call' })
    .sort({ startAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const dealIds = events.map((e) => e.dealId?.toString()).filter(Boolean) as string[];
  const titles = await dealTitles(workspaceId, dealIds);
  const calls = events.map((e) =>
    toCallRow(
      {
        id: e.id,
        title: e.title,
        source: e.source ?? 'gong',
        date: e.startAt,
        dealId: e.dealId?.toString(),
      },
      titles,
    ),
  );
  const total = await DealEvent.countDocuments({ workspaceId, type: 'call' });

  res.json({
    calls,
    source: events.length > 0 ? 'db' : 'demo',
    page,
    limit,
    total,
  });
}
