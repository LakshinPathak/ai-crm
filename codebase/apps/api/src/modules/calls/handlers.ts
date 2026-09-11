import type { Response } from 'express';
import { Artifact, Deal, DealEvent } from '@ai-crm/db';
import { PatchCallSchema } from '@ai-crm/shared';
import type { AuthedRequest } from '../../lib/auth/index.js';

const TRANSCRIPT_EXCERPT_MAX = 2000;

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

export async function getCallDetail(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const { id } = req.params;

  const artifact = await Artifact.findOne({
    _id: id,
    workspaceId,
    type: 'call',
  });

  if (!artifact) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Call not found' } });
    return;
  }

  let dealTitle: string | null = null;
  if (artifact.dealId) {
    const deal = await Deal.findOne({ _id: artifact.dealId, workspaceId, deletedAt: null }).select(
      'title',
    );
    dealTitle = deal?.title ?? null;
  }

  const rawText = artifact.rawText ?? '';
  const occurredAt = artifact.occurredAt ?? artifact.createdAt;

  res.json({
    call: {
      id: artifact.id,
      title: artifact.title ?? `Call (${artifact.source})`,
      source: artifact.source,
      date: occurredAt.toISOString(),
      dealId: artifact.dealId?.toString() ?? null,
      dealTitle,
      transcriptExcerpt: rawText.slice(0, TRANSCRIPT_EXCERPT_MAX),
      hasFullTranscript: rawText.length > 0,
    },
  });
}

export async function patchCall(req: AuthedRequest, res: Response) {
  const parsed = PatchCallSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const { id } = req.params;

  const artifact = await Artifact.findOne({
    _id: id,
    workspaceId,
    type: 'call',
  });

  if (!artifact) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Call not found' } });
    return;
  }

  if (parsed.data.dealId === null) {
    artifact.dealId = undefined;
  } else {
    const deal = await Deal.findOne({
      _id: parsed.data.dealId,
      workspaceId,
      deletedAt: null,
    });
    if (!deal) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Deal not found' } });
      return;
    }
    artifact.dealId = deal._id;
  }

  await artifact.save();

  let dealTitle: string | null = null;
  if (artifact.dealId) {
    const deal = await Deal.findOne({ _id: artifact.dealId, workspaceId, deletedAt: null }).select(
      'title',
    );
    dealTitle = deal?.title ?? null;
  }

  const rawText = artifact.rawText ?? '';
  const occurredAt = artifact.occurredAt ?? artifact.createdAt;

  res.json({
    call: {
      id: artifact.id,
      title: artifact.title ?? `Call (${artifact.source})`,
      source: artifact.source,
      date: occurredAt.toISOString(),
      dealId: artifact.dealId?.toString() ?? null,
      dealTitle,
      transcriptExcerpt: rawText.slice(0, TRANSCRIPT_EXCERPT_MAX),
      hasFullTranscript: rawText.length > 0,
    },
  });
}
