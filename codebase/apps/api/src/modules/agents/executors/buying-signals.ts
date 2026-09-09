import { Approval, Deal, Note, Task } from '@ai-crm/db';
import type { Types } from 'mongoose';
import type { AgentRunContext, AgentRunResult } from '../executor.js';

const MS_PER_DAY = 86400000;
const APPROVAL_TTL_DAYS = 7;
const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const MEDIUM_CONFIDENCE = 0.55;
const HIGH_CONFIDENCE = 0.85;

interface SignalDefinition {
  keyword: string;
  tagSlug: string;
  strongPhrases: string[];
}

interface DetectedSignal {
  tagSlug: string;
  keyword: string;
  confidence: number;
  source: 'note' | 'task';
  sourceId: string;
  excerpt: string;
  detectedAt: Date;
}

interface DealScanResult {
  dealId: string;
  dealTitle: string;
  signals: DetectedSignal[];
  tags: string[];
  isHot: boolean;
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    keyword: 'budget',
    tagSlug: 'budget-confirmed',
    strongPhrases: ['budget approved', 'budget confirmed', 'have budget', 'allocated budget'],
  },
  {
    keyword: 'urgency',
    tagSlug: 'urgency-timeline',
    strongPhrases: ['urgent deadline', 'immediate need', 'asap', 'time sensitive'],
  },
  {
    keyword: 'champion',
    tagSlug: 'champion-advocacy',
    strongPhrases: ['internal champion', 'executive sponsor', 'champion identified', 'strong champion'],
  },
  {
    keyword: 'timeline',
    tagSlug: 'urgency-timeline',
    strongPhrases: ['timeline confirmed', 'deadline', 'by end of', 'need by', 'close by'],
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function excerptAround(text: string, keyword: string, radius = 60): string {
  const lower = normalizeText(text);
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2).trim();
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + keyword.length + radius);
  return text.slice(start, end).trim();
}

function scanText(
  text: string,
  source: 'note' | 'task',
  sourceId: string,
  detectedAt: Date,
): DetectedSignal[] {
  const normalized = normalizeText(text);
  const found: DetectedSignal[] = [];

  for (const def of SIGNAL_DEFINITIONS) {
    if (!normalized.includes(def.keyword)) continue;

    const hasStrongPhrase = def.strongPhrases.some((phrase) => normalized.includes(phrase));
    found.push({
      tagSlug: def.tagSlug,
      keyword: def.keyword,
      confidence: hasStrongPhrase ? HIGH_CONFIDENCE : MEDIUM_CONFIDENCE,
      source,
      sourceId,
      excerpt: excerptAround(text, def.keyword),
      detectedAt,
    });
  }

  return found;
}

function uniqueTags(signals: DetectedSignal[]): string[] {
  return [...new Set(signals.map((s) => s.tagSlug))];
}

function hasHighConfidence(signals: DetectedSignal[]): boolean {
  return signals.some((s) => s.confidence >= HIGH_CONFIDENCE_THRESHOLD);
}

export async function runBuyingSignals(ctx: AgentRunContext): Promise<AgentRunResult> {
  const filter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    status: 'open',
    deletedAt: null,
  };
  if (ctx.dealId) filter._id = ctx.dealId;

  const deals = await Deal.find(filter);
  if (deals.length === 0) {
    return {
      status: 'completed',
      creditsUsed: 0,
      output: {
        dealsScanned: 0,
        hotDeals: 0,
        tags: [],
        dealResults: [],
        approvalsCreated: 0,
        approvalIds: [],
      },
    };
  }

  const dealIds = deals.map((d) => d._id);
  const [notes, tasks] = await Promise.all([
    Note.find({ workspaceId: ctx.workspaceId, dealId: { $in: dealIds } }),
    Task.find({ workspaceId: ctx.workspaceId, dealId: { $in: dealIds } }),
  ]);

  const notesByDeal = new Map<string, typeof notes>();
  for (const note of notes) {
    const key = note.dealId.toString();
    const list = notesByDeal.get(key) ?? [];
    list.push(note);
    notesByDeal.set(key, list);
  }

  const tasksByDeal = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const key = task.dealId.toString();
    const list = tasksByDeal.get(key) ?? [];
    list.push(task);
    tasksByDeal.set(key, list);
  }

  const dealResults: DealScanResult[] = [];
  const approvalIds: string[] = [];
  const allTags = new Set<string>();
  let hotDeals = 0;

  for (const deal of deals) {
    const dealKey = deal.id;
    const dealNotes = notesByDeal.get(dealKey) ?? [];
    const dealTasks = tasksByDeal.get(dealKey) ?? [];
    const signals: DetectedSignal[] = [];

    for (const note of dealNotes) {
      signals.push(...scanText(note.body, 'note', note.id, note.createdAt));
    }
    for (const task of dealTasks) {
      signals.push(...scanText(task.title, 'task', task.id, task.createdAt));
    }

    const tags = uniqueTags(signals);
    const isHot = signals.length > 0;

    if (isHot) {
      hotDeals += 1;
      for (const tag of tags) allTags.add(tag);
      if (!deal.isHot) {
        deal.isHot = true;
        await deal.save();
      }
    }

    dealResults.push({
      dealId: deal.id,
      dealTitle: deal.title,
      signals,
      tags,
      isHot,
    });

    const highConfidenceSignals = signals.filter((s) => s.confidence >= HIGH_CONFIDENCE_THRESHOLD);
    if (highConfidenceSignals.length === 0) continue;

    const approval = await Approval.create({
      workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
      agentRunId: ctx.runId as unknown as Types.ObjectId,
      dealId: deal._id,
      assignedTo: deal.ownerId,
      status: 'pending',
      contentType: 'slack_message',
      title: `Buying signal: ${deal.title}`,
      contentPreview: {
        summary: `High-confidence buying signals detected (${uniqueTags(highConfidenceSignals).join(', ')})`,
        notificationType: 'buying_signal',
        tags: uniqueTags(highConfidenceSignals),
      },
      contentFull: {
        dealId: deal.id,
        dealTitle: deal.title,
        signals: highConfidenceSignals.map((s) => ({
          tagSlug: s.tagSlug,
          keyword: s.keyword,
          confidence: s.confidence,
          source: s.source,
          excerpt: s.excerpt,
        })),
        tags: uniqueTags(highConfidenceSignals),
        notify: true,
      },
      proposedChange: {
        type: 'deal_hot_alert',
        dealId: deal.id,
        isHot: true,
        tags: uniqueTags(highConfidenceSignals),
      },
      expiresAt: new Date(Date.now() + APPROVAL_TTL_DAYS * MS_PER_DAY),
    });
    approvalIds.push(approval.id);
  }

  return {
    status: approvalIds.length > 0 ? 'awaiting_approval' : 'completed',
    creditsUsed: 0.2,
    output: {
      dealsScanned: deals.length,
      hotDeals,
      tags: [...allTags],
      dealResults: dealResults.map((r) => ({
        dealId: r.dealId,
        dealTitle: r.dealTitle,
        isHot: r.isHot,
        tags: r.tags,
        signalCount: r.signals.length,
        highConfidence: hasHighConfidence(r.signals),
        signals: r.signals.map((s) => ({
          tagSlug: s.tagSlug,
          keyword: s.keyword,
          confidence: s.confidence,
          source: s.source,
          excerpt: s.excerpt,
        })),
      })),
      approvalsCreated: approvalIds.length,
      approvalIds,
    },
  };
}
