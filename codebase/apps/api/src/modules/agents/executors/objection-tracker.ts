import { Deal, Note } from '@ai-crm/db';
import type { Types } from 'mongoose';
import type { AgentRunContext, AgentRunResult } from '../executor.js';

const MEDIUM_CONFIDENCE = 0.55;
const HIGH_CONFIDENCE = 0.85;

interface ObjectionDefinition {
  slug: string;
  label: string;
  keywords: string[];
  strongPhrases: string[];
  talkTrack: string;
}

interface DetectedObjection {
  slug: string;
  label: string;
  confidence: number;
  noteId: string;
  excerpt: string;
  talkTrack: string;
  detectedAt: Date;
}

interface DealScanResult {
  dealId: string;
  dealTitle: string;
  objections: DetectedObjection[];
  tagSlugs: string[];
}

const OBJECTION_TAXONOMY: ObjectionDefinition[] = [
  {
    slug: 'objection-pricing',
    label: 'Pricing',
    keywords: ['price', 'pricing', 'cost', 'expensive', 'discount', 'cheaper'],
    strongPhrases: ['too expensive', 'price is high', 'need a discount', 'over budget', 'pricing concern'],
    talkTrack:
      'Reframe around total cost of ownership and ROI. Offer phased rollout or success-based milestones to reduce upfront risk.',
  },
  {
    slug: 'objection-roi',
    label: 'ROI',
    keywords: ['roi', 'return', 'payback', 'business case', 'value'],
    strongPhrases: ['unclear roi', 'hard to justify', 'business case', 'return on investment', 'prove value'],
    talkTrack:
      'Co-build a quantified business case with their metrics. Share a comparable customer outcome and timeline to value.',
  },
  {
    slug: 'objection-competition',
    label: 'Competition',
    keywords: ['competitor', 'competing', 'alternative', 'versus', 'vs'],
    strongPhrases: ['evaluating alternatives', 'other vendor', 'competitive evaluation', 'side by side'],
    talkTrack:
      'Acknowledge the evaluation. Focus on differentiated outcomes and reference wins in their industry rather than feature lists.',
  },
  {
    slug: 'objection-timing',
    label: 'Timing',
    keywords: ['timing', 'delay', 'postpone', 'later', 'quarter', 'next year'],
    strongPhrases: ['not ready', 'next quarter', 'push back', 'bad timing', 'wait until'],
    talkTrack:
      'Uncover the real blocker behind timing. Propose a lightweight pilot or discovery phase that fits their calendar.',
  },
  {
    slug: 'objection-authority',
    label: 'Authority',
    keywords: ['authority', 'approval', 'sign-off', 'signoff', 'decision maker', 'procurement'],
    strongPhrases: ['need approval', 'not the decision maker', 'executive sign-off', 'procurement review'],
    talkTrack:
      'Map the buying committee and offer to co-present to economic buyer with a one-page executive summary.',
  },
  {
    slug: 'objection-legal',
    label: 'Legal',
    keywords: ['legal', 'contract', 'terms', 'msa', 'liability', 'indemnity'],
    strongPhrases: ['legal review', 'contract terms', 'redlines', 'msa negotiation'],
    talkTrack:
      'Share standard security and legal pack early. Offer a mutual action plan with legal milestones and template language.',
  },
  {
    slug: 'objection-security',
    label: 'Security',
    keywords: ['security', 'soc2', 'compliance', 'gdpr', 'hipaa', 'privacy', 'encryption'],
    strongPhrases: ['security review', 'data privacy', 'compliance requirements', 'soc 2'],
    talkTrack:
      'Provide trust center artifacts and connect their security team with yours. Highlight certifications relevant to their industry.',
  },
  {
    slug: 'objection-technical',
    label: 'Technical',
    keywords: ['technical', 'integration', 'api', 'architecture', 'scalability'],
    strongPhrases: ['technical concerns', 'integration complexity', 'does not fit', 'architecture review'],
    talkTrack:
      'Schedule a technical deep-dive with solutions engineering. Show reference architecture and integration patterns.',
  },
  {
    slug: 'objection-implementation',
    label: 'Implementation',
    keywords: ['implementation', 'rollout', 'deployment', 'migration', 'onboarding'],
    strongPhrases: ['implementation effort', 'resource constraints', 'change management', 'rollout plan'],
    talkTrack:
      'Present a phased implementation plan with clear owners, timelines, and customer success support.',
  },
  {
    slug: 'objection-incumbent',
    label: 'Incumbent',
    keywords: ['incumbent', 'existing vendor', 'current solution', 'status quo'],
    strongPhrases: ['happy with current', 'existing vendor', 'switching cost', 'rip and replace'],
    talkTrack:
      'Quantify cost of inaction and switching triggers. Position as evolution, not rip-and-replace, where possible.',
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

function scanNote(body: string, noteId: string, createdAt: Date): DetectedObjection[] {
  const normalized = normalizeText(body);
  const found: DetectedObjection[] = [];

  for (const def of OBJECTION_TAXONOMY) {
    const matchedKeyword = def.keywords.find((kw) => normalized.includes(kw));
    if (!matchedKeyword) continue;

    const hasStrongPhrase = def.strongPhrases.some((phrase) => normalized.includes(phrase));
    found.push({
      slug: def.slug,
      label: def.label,
      confidence: hasStrongPhrase ? HIGH_CONFIDENCE : MEDIUM_CONFIDENCE,
      noteId,
      excerpt: excerptAround(body, matchedKeyword),
      talkTrack: def.talkTrack,
      detectedAt: createdAt,
    });
  }

  return found;
}

function uniqueBySlug(objections: DetectedObjection[]): DetectedObjection[] {
  const best = new Map<string, DetectedObjection>();
  for (const obj of objections) {
    const existing = best.get(obj.slug);
    if (!existing || obj.confidence > existing.confidence) {
      best.set(obj.slug, obj);
    }
  }
  return [...best.values()];
}

function formatSummaryNote(dealTitle: string, objections: DetectedObjection[]): string {
  const lines = [`[Negotiation Tracker] Objections detected for "${dealTitle}"`, ''];
  for (const obj of objections) {
    const pct = Math.round(obj.confidence * 100);
    lines.push(`• ${obj.label} (${pct}% confidence): "${obj.excerpt}"`);
    lines.push(`  Talk track: ${obj.talkTrack}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export async function runObjectionTracker(ctx: AgentRunContext): Promise<AgentRunResult> {
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
        notesScanned: 0,
        objectionsFound: 0,
        tagSlugs: [],
        dealResults: [],
        summaryNoteIds: [],
      },
    };
  }

  const dealIds = deals.map((d) => d._id);
  const notes = await Note.find({ workspaceId: ctx.workspaceId, dealId: { $in: dealIds } });

  const notesByDeal = new Map<string, typeof notes>();
  for (const note of notes) {
    const key = note.dealId.toString();
    const list = notesByDeal.get(key) ?? [];
    list.push(note);
    notesByDeal.set(key, list);
  }

  const dealResults: DealScanResult[] = [];
  const summaryNoteIds: string[] = [];
  const allTagSlugs = new Set<string>();
  let objectionsFound = 0;

  for (const deal of deals) {
    const dealNotes = notesByDeal.get(deal.id) ?? [];
    const rawObjections: DetectedObjection[] = [];

    for (const note of dealNotes) {
      rawObjections.push(...scanNote(note.body, note._id.toString(), note.createdAt));
    }

    const objections = uniqueBySlug(rawObjections);
    const tagSlugs = objections.map((o) => o.slug);
    objectionsFound += objections.length;
    for (const slug of tagSlugs) allTagSlugs.add(slug);

    let summaryNoteId: string | undefined;
    if (objections.length > 0) {
      const note = await Note.create({
        workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
        dealId: deal._id,
        authorId: ctx.userId as unknown as Types.ObjectId,
        body: formatSummaryNote(deal.title, objections),
      });
      summaryNoteId = note.id;
      summaryNoteIds.push(note.id);
      deal.lastActivityAt = new Date();
      await deal.save();
    }

    dealResults.push({
      dealId: deal.id,
      dealTitle: deal.title,
      objections,
      tagSlugs,
      ...(summaryNoteId ? { summaryNoteId } : {}),
    });
  }

  return {
    status: 'completed',
    creditsUsed: 0.2,
    output: {
      dealsScanned: deals.length,
      notesScanned: notes.length,
      objectionsFound,
      tagSlugs: [...allTagSlugs],
      dealResults: dealResults.map((r) => ({
        dealId: r.dealId,
        dealTitle: r.dealTitle,
        tagSlugs: r.tagSlugs,
        objectionCount: r.objections.length,
        objections: r.objections.map((o) => ({
          slug: o.slug,
          label: o.label,
          confidence: o.confidence,
          noteId: o.noteId,
          excerpt: o.excerpt,
          talkTrack: o.talkTrack,
        })),
      })),
      summaryNoteIds,
    },
  };
}
