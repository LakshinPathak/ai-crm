import { Approval, Deal, Note } from '@ai-crm/db';
import type { Types } from 'mongoose';
import type { AgentRunContext, AgentRunResult } from './types.js';

const MS_PER_DAY = 86400000;
const NOTE_LOOKBACK_DAYS = 90;
const SNIPPET_RADIUS = 80;

export type ProductGapCategory = 'feature_gap' | 'integration_request' | 'competitor_mention';

export interface ProductGap {
  category: ProductGapCategory;
  snippet: string;
  noteId: string;
  matchedPattern: string;
}

export interface DealProductGaps {
  dealId: string;
  dealTitle: string;
  gaps: ProductGap[];
}

interface ScanPattern {
  category: ProductGapCategory;
  label: string;
  patterns: RegExp[];
}

const SCAN_PATTERNS: ScanPattern[] = [
  {
    category: 'feature_gap',
    label: 'feature gap',
    patterns: [
      /\b(?:missing|lack(?:s|ing)?)\s+(?:a\s+)?(?:feature|capability|functionality)\b/i,
      /\bfeature\s+(?:gap|request)\b/i,
      /\b(?:wish|hope)\s+(?:we|you|they)\s+had\b/i,
      /\bneed(?:s)?\s+(?:the\s+)?ability\s+to\b/i,
      /\bdoesn'?t\s+support\b/i,
      /\b(?:can'?t|cannot|unable\s+to)\s+(?:do|perform|handle|support)\b/i,
      /\bwould\s+be\s+(?:great|nice|helpful)\s+if\b/i,
      /\bnot\s+(?:currently\s+)?supported\b/i,
      /\bproduct\s+gap\b/i,
      /\bgap\s+in\s+(?:your|the)\s+(?:product|platform|offering)\b/i,
    ],
  },
  {
    category: 'integration_request',
    label: 'integration request',
    patterns: [
      /\bintegration\s+(?:with|to|for)\b/i,
      /\bintegrate\s+(?:with|to)\b/i,
      /\bconnect\s+(?:to|with)\b/i,
      /\bsync\s+(?:with|to)\b/i,
      /\b(?:need|want|require)(?:s)?\s+(?:an?\s+)?(?:api|webhook)\b/i,
      /\b(?:zapier|connector|plugin)\b/i,
      /\b(?:salesforce|hubspot|slack|jira|teams|zendesk)\s+integration\b/i,
    ],
  },
  {
    category: 'competitor_mention',
    label: 'competitor mention',
    patterns: [
      /\bcompetitor\b/i,
      /\b(?:vs\.?|versus)\s+\w+/i,
      /\bcompared\s+to\b/i,
      /\bevaluating\s+(?:\w+\s+)?(?:vs|versus|against)\b/i,
      /\b(?:gong|clari|outreach|salesloft|zoominfo|6sense|apollo|salesforce|hubspot)\b/i,
      /\b(?:incumbent|alternative)\s+(?:vendor|solution|tool)\b/i,
    ],
  },
];

function extractSnippet(body: string, matchIndex: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(body.length, matchIndex + SNIPPET_RADIUS);
  let snippet = body.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < body.length) snippet = `${snippet}…`;
  return snippet;
}

export function scanNoteForProductGaps(noteId: string, body: string): ProductGap[] {
  const gaps: ProductGap[] = [];
  const seen = new Set<string>();

  for (const { category, label, patterns } of SCAN_PATTERNS) {
    for (const pattern of patterns) {
      const match = pattern.exec(body);
      if (!match) continue;

      const key = `${category}:${match[0].toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      gaps.push({
        category,
        snippet: extractSnippet(body, match.index),
        noteId,
        matchedPattern: label,
      });
    }
  }

  return gaps;
}

function buildGapSummaryBody(dealTitle: string, gaps: ProductGap[]): string {
  const byCategory: Record<ProductGapCategory, ProductGap[]> = {
    feature_gap: [],
    integration_request: [],
    competitor_mention: [],
  };
  for (const gap of gaps) byCategory[gap.category].push(gap);

  const lines = [`Product feedback capture for "${dealTitle}":`];

  const sections: Array<{ title: string; items: ProductGap[] }> = [
    { title: 'Feature gaps', items: byCategory.feature_gap },
    { title: 'Integration requests', items: byCategory.integration_request },
    { title: 'Competitor mentions', items: byCategory.competitor_mention },
  ];

  for (const { title, items } of sections) {
    if (items.length === 0) continue;
    lines.push('', `${title}:`);
    for (const item of items) {
      lines.push(`- ${item.snippet}`);
    }
  }

  lines.push('', 'Review and route to product team as needed.');
  return lines.join('\n');
}

function aggregateGapCounts(dealSummaries: DealProductGaps[]): Record<ProductGapCategory, number> {
  const counts: Record<ProductGapCategory, number> = {
    feature_gap: 0,
    integration_request: 0,
    competitor_mention: 0,
  };
  for (const deal of dealSummaries) {
    for (const gap of deal.gaps) counts[gap.category] += 1;
  }
  return counts;
}

export async function runProductFeedback(ctx: AgentRunContext): Promise<AgentRunResult> {
  const cutoff = new Date(Date.now() - NOTE_LOOKBACK_DAYS * MS_PER_DAY);

  const dealFilter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    status: 'open',
    deletedAt: null,
  };
  if (ctx.dealId) dealFilter._id = ctx.dealId;

  const deals = await Deal.find(dealFilter);
  if (deals.length === 0) {
    return {
      status: 'completed',
      creditsUsed: 0.1,
      output: {
        dealsScanned: 0,
        notesScanned: 0,
        dealsWithGaps: 0,
        approvalsCreated: 0,
        approvalIds: [],
        aggregatedGaps: aggregateGapCounts([]),
        dealSummaries: [],
      },
    };
  }

  const dealMap = new Map(deals.map((d) => [d.id, d]));
  const dealIds = deals.map((d) => d._id);

  const notes = await Note.find({
    workspaceId: ctx.workspaceId,
    dealId: { $in: dealIds },
    createdAt: { $gte: cutoff },
  }).sort({ createdAt: -1 });

  const gapsByDeal = new Map<string, ProductGap[]>();

  for (const note of notes) {
    const dealId = note.dealId.toString();
    const found = scanNoteForProductGaps(note.id, note.body);
    if (found.length === 0) continue;

    const existing = gapsByDeal.get(dealId) ?? [];
    gapsByDeal.set(dealId, [...existing, ...found]);
  }

  const dealSummaries: DealProductGaps[] = [];
  const approvalIds: string[] = [];

  for (const [dealId, gaps] of gapsByDeal) {
    const deal = dealMap.get(dealId);
    if (!deal || gaps.length === 0) continue;

    const summary: DealProductGaps = {
      dealId: deal.id,
      dealTitle: deal.title,
      gaps,
    };
    dealSummaries.push(summary);

    const categories = [...new Set(gaps.map((g) => g.category))];
    const approval = await Approval.create({
      workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
      agentRunId: ctx.runId as unknown as Types.ObjectId,
      dealId: deal._id,
      assignedTo: deal.ownerId,
      status: 'pending',
      contentType: 'task_batch',
      title: `Product feedback: ${deal.title}`,
      contentPreview: {
        summary: `${gaps.length} product gap signal${gaps.length === 1 ? '' : 's'} detected`,
        gapCount: gaps.length,
        categories,
      },
      contentFull: {
        dealId: deal.id,
        dealTitle: deal.title,
        gaps,
        lookbackDays: NOTE_LOOKBACK_DAYS,
      },
      proposedChange: {
        type: 'note_create',
        dealId: deal.id,
        body: buildGapSummaryBody(deal.title, gaps),
      },
      expiresAt: new Date(Date.now() + 7 * MS_PER_DAY),
    });
    approvalIds.push(approval.id);
  }

  dealSummaries.sort((a, b) => b.gaps.length - a.gaps.length);

  return {
    status: approvalIds.length > 0 ? 'awaiting_approval' : 'completed',
    creditsUsed: 0.2,
    output: {
      dealsScanned: deals.length,
      notesScanned: notes.length,
      dealsWithGaps: dealSummaries.length,
      approvalsCreated: approvalIds.length,
      approvalIds,
      aggregatedGaps: aggregateGapCounts(dealSummaries),
      dealSummaries,
      lookbackDays: NOTE_LOOKBACK_DAYS,
    },
  };
}
