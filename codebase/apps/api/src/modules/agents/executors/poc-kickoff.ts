import {
  Approval,
  Company,
  Deal,
  DealMeddpicc,
  Note,
  PipelineStage,
  Task,
} from '@ai-crm/db';
import type { Types } from 'mongoose';
import { log } from '../../../lib/logger.js';
import type { AgentRunContext, AgentRunResult } from './types.js';

const MS_PER_DAY = 86400000;
const APPROVAL_TTL_DAYS = 7;

/** Pipeline stages that indicate technical validation or late-stage POC readiness. */
const LATE_STAGE_PATTERNS = [
  'proposal',
  'negotiation',
  'technical validation',
  'pilot',
  'poc',
  'business outcomes',
  'tech win',
];

const POC_MILESTONES = [
  { title: 'Schedule POC kickoff call', dueOffsetDays: 2 },
  { title: 'Provision sandbox and access credentials', dueOffsetDays: 5 },
  { title: 'Align stakeholders on success criteria', dueOffsetDays: 7 },
  { title: 'Mid-POC technical validation checkpoint', dueOffsetDays: 14 },
  { title: 'Business outcomes review session', dueOffsetDays: 21 },
  { title: 'POC retrospective and go/no-go recommendation', dueOffsetDays: 28 },
];

export interface PocStakeholder {
  role: string;
  name: string;
  source: string;
}

export interface PocPhase {
  name: string;
  durationDays: number;
  objectives: string[];
}

export interface PocPlan {
  dealId: string;
  dealTitle: string;
  companyName: string;
  stakeholders: PocStakeholder[];
  phases: PocPhase[];
  successCriteria: string[];
  timelineDays: number;
  kickoffEmail: { subject: string; body: string };
}

function isLateStageName(stageName: string): boolean {
  const normalized = stageName.toLowerCase();
  return LATE_STAGE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isLateStageDealTitle(title: string): boolean {
  const normalized = title.toLowerCase();
  return /poc|pilot|technical validation|eval/.test(normalized);
}

function meddpiccSummary(letters: Record<string, { summary?: string }> | undefined, key: string): string | undefined {
  const entry = letters?.[key];
  return typeof entry?.summary === 'string' && entry.summary.trim() ? entry.summary.trim() : undefined;
}

function buildStakeholders(
  meddpicc: InstanceType<typeof DealMeddpicc> | null,
): PocStakeholder[] {
  const letters = (meddpicc?.letters ?? {}) as Record<string, { label?: string; summary?: string }>;
  const stakeholders: PocStakeholder[] = [];

  const champion = meddpiccSummary(letters, 'C1');
  if (champion) {
    stakeholders.push({ role: 'Champion', name: champion, source: 'MEDDPICC C1' });
  }

  const economicBuyer = meddpiccSummary(letters, 'E');
  if (economicBuyer) {
    stakeholders.push({ role: 'Economic Buyer', name: economicBuyer, source: 'MEDDPICC E' });
  }

  const decisionProcess = meddpiccSummary(letters, 'D2');
  if (decisionProcess) {
    stakeholders.push({ role: 'Decision Process', name: decisionProcess, source: 'MEDDPICC D2' });
  }

  if (stakeholders.length === 0) {
    stakeholders.push({
      role: 'Deal Owner',
      name: 'Confirm champion and economic buyer before kickoff',
      source: 'Default',
    });
  }

  return stakeholders;
}

function buildDefaultPhases(dealTitle: string): PocPhase[] {
  return [
    {
      name: 'Prerequisites & Access',
      durationDays: 5,
      objectives: [
        `Confirm scope and environment requirements for ${dealTitle}`,
        'Provision sandbox access and integration credentials',
      ],
    },
    {
      name: 'Technical Validation',
      durationDays: 14,
      objectives: [
        'Execute technical test cases against customer use cases',
        'Resolve integration or security blockers',
      ],
    },
    {
      name: 'Business Outcomes Review',
      durationDays: 7,
      objectives: [
        'Validate ROI metrics and success criteria with stakeholders',
        'Document quantified outcomes from the pilot',
      ],
    },
    {
      name: 'Go / No-Go',
      durationDays: 4,
      objectives: ['POC retrospective', 'Commercial path recommendation'],
    },
  ];
}

function buildSuccessCriteria(dealTitle: string, meddpicc: InstanceType<typeof DealMeddpicc> | null): string[] {
  const letters = (meddpicc?.letters ?? {}) as Record<string, { summary?: string }>;
  const metrics = meddpiccSummary(letters, 'M');
  const pain = meddpiccSummary(letters, 'I');

  const criteria = [
    `Technical fit validated for ${dealTitle} core use cases`,
    'Security and integration requirements signed off by customer IT',
    'Champion confirms measurable business value from the pilot',
  ];

  if (metrics) criteria.push(`Metrics target: ${metrics}`);
  if (pain) criteria.push(`Pain addressed: ${pain}`);

  return criteria;
}

function buildKickoffEmail(plan: Omit<PocPlan, 'kickoffEmail'>): { subject: string; body: string } {
  const stakeholderLines = plan.stakeholders
    .map((s) => `- ${s.role}: ${s.name}`)
    .join('\n');
  const phaseLines = plan.phases
    .map((p) => `- ${p.name} (${p.durationDays}d): ${p.objectives[0]}`)
    .join('\n');
  const criteriaLines = plan.successCriteria.map((c) => `- ${c}`).join('\n');

  const body = `Hi team,

I'd like to kick off our ${plan.timelineDays}-day POC for ${plan.dealTitle} with ${plan.companyName}.

Stakeholders:
${stakeholderLines}

Phases:
${phaseLines}

Success criteria:
${criteriaLines}

Please confirm availability for a kickoff call this week. I'll share the detailed runbook and access checklist ahead of the session.

Best regards`;

  return {
    subject: `POC Kickoff — ${plan.dealTitle} | ${plan.companyName}`,
    body,
  };
}

async function generatePocPlanWithGemini(context: {
  dealTitle: string;
  companyName: string;
  stageName: string;
  noteSnippets: string[];
  stakeholders: PocStakeholder[];
  successCriteria: string[];
}): Promise<{ phases: PocPhase[]; successCriteria: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
  const prompt = `You are a B2B presales engineer. Generate a POC kickoff plan for this deal.

Deal: ${context.dealTitle}
Company: ${context.companyName}
Stage: ${context.stageName}
${context.noteSnippets.length ? `Notes:\n${context.noteSnippets.join('\n')}` : ''}
Known stakeholders:
${context.stakeholders.map((s) => `- ${s.role}: ${s.name}`).join('\n')}

Return ONLY valid JSON:
{
  "phases": [{"name": string, "durationDays": number, "objectives": string[]}],
  "successCriteria": [string]
}

Use 3-4 phases totaling ~30 days. Keep objectives actionable.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      log('poc-kickoff', 'Gemini API error', { status: res.status, body: errText.slice(0, 200) });
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as { phases?: PocPhase[]; successCriteria?: string[] };
    if (!Array.isArray(parsed.phases) || parsed.phases.length === 0) return null;

    return {
      phases: parsed.phases,
      successCriteria: Array.isArray(parsed.successCriteria) && parsed.successCriteria.length > 0
        ? parsed.successCriteria
        : context.successCriteria,
    };
  } catch (err) {
    log('poc-kickoff', 'Gemini generate failed', { error: String(err) });
    return null;
  }
}

async function buildPocPlan(
  deal: InstanceType<typeof Deal>,
  company: InstanceType<typeof Company> | null,
  stageName: string,
  meddpicc: InstanceType<typeof DealMeddpicc> | null,
  noteSnippets: string[],
): Promise<PocPlan> {
  const stakeholders = buildStakeholders(meddpicc);
  const defaultSuccessCriteria = buildSuccessCriteria(deal.title, meddpicc);
  const geminiPlan = await generatePocPlanWithGemini({
    dealTitle: deal.title,
    companyName: company?.name ?? 'Customer',
    stageName,
    noteSnippets,
    stakeholders,
    successCriteria: defaultSuccessCriteria,
  });

  const phases = geminiPlan?.phases ?? buildDefaultPhases(deal.title);
  const successCriteria = geminiPlan?.successCriteria ?? defaultSuccessCriteria;
  const timelineDays = phases.reduce((sum, p) => sum + p.durationDays, 0);

  const base = {
    dealId: deal.id,
    dealTitle: deal.title,
    companyName: company?.name ?? 'Customer',
    stakeholders,
    phases,
    successCriteria,
    timelineDays,
  };

  return { ...base, kickoffEmail: buildKickoffEmail(base) };
}

async function createMilestoneTasks(
  workspaceId: string,
  deal: InstanceType<typeof Deal>,
): Promise<string[]> {
  const existing = await Task.find({
    workspaceId,
    dealId: deal._id,
    status: 'open',
    title: { $in: POC_MILESTONES.map((m) => m.title) },
  });
  const existingTitles = new Set(existing.map((t) => t.title));
  const taskIds: string[] = existing.map((t) => t.id);

  const now = Date.now();
  for (const milestone of POC_MILESTONES) {
    if (existingTitles.has(milestone.title)) continue;

    const task = await Task.create({
      workspaceId: workspaceId as unknown as Types.ObjectId,
      dealId: deal._id,
      title: milestone.title,
      assigneeId: deal.ownerId,
      dueDate: new Date(now + milestone.dueOffsetDays * MS_PER_DAY),
      status: 'open',
    });
    taskIds.push(task.id);
  }

  return taskIds;
}

async function createKickoffEmailApproval(
  ctx: AgentRunContext,
  deal: InstanceType<typeof Deal>,
  plan: PocPlan,
): Promise<string> {
  const planSummary = [
    `POC Plan — ${plan.dealTitle}`,
    '',
    'Stakeholders:',
    ...plan.stakeholders.map((s) => `• ${s.role}: ${s.name}`),
    '',
    'Phases:',
    ...plan.phases.map((p) => `• ${p.name} (${p.durationDays}d)`),
    '',
    'Success criteria:',
    ...plan.successCriteria.map((c) => `• ${c}`),
  ].join('\n');

  const approval = await Approval.create({
    workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
    agentRunId: ctx.runId as unknown as Types.ObjectId,
    dealId: deal._id,
    assignedTo: deal.ownerId,
    status: 'pending',
    contentType: 'email',
    title: `POC kickoff email: ${deal.title}`,
    contentPreview: {
      subject: plan.kickoffEmail.subject,
      summary: `Draft kickoff email for ${plan.timelineDays}-day POC with ${plan.stakeholders.length} stakeholders`,
    },
    contentFull: {
      ...plan,
      email: plan.kickoffEmail,
    },
    proposedChange: {
      type: 'note_create',
      dealId: deal.id,
      body: planSummary,
    },
    expiresAt: new Date(Date.now() + APPROVAL_TTL_DAYS * MS_PER_DAY),
  });

  return approval.id;
}

async function processDeal(
  ctx: AgentRunContext,
  deal: InstanceType<typeof Deal>,
  stageName: string,
): Promise<{ plan: PocPlan; taskIds: string[]; approvalId?: string }> {
  const [company, meddpicc, notes] = await Promise.all([
    Company.findById(deal.companyId),
    DealMeddpicc.findOne({ dealId: deal._id, workspaceId: ctx.workspaceId }),
    Note.find({ dealId: deal._id, workspaceId: ctx.workspaceId }).sort({ createdAt: -1 }).limit(5),
  ]);

  const plan = await buildPocPlan(
    deal,
    company,
    stageName,
    meddpicc,
    notes.map((n) => n.body),
  );
  const taskIds = await createMilestoneTasks(ctx.workspaceId, deal);
  const approvalId = await createKickoffEmailApproval(ctx, deal, plan);

  return { plan, taskIds, approvalId };
}

export async function runPocKickoff(ctx: AgentRunContext): Promise<AgentRunResult> {
  const stages = await PipelineStage.find({ workspaceId: ctx.workspaceId });
  const lateStageIds = stages
    .filter((s) => isLateStageName(s.name))
    .map((s) => s._id.toString());
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));

  const filter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    status: 'open',
    deletedAt: null,
  };

  if (ctx.dealId) {
    filter._id = ctx.dealId;
  } else {
    filter.$or = [
      { stageId: { $in: lateStageIds } },
      { title: { $regex: /poc|pilot|technical validation|eval/i } },
    ];
  }

  const deals = await Deal.find(filter);
  const eligibleDeals = deals.filter((deal) => {
    const stageName = stageNameById.get(deal.stageId.toString()) ?? '';
    return isLateStageName(stageName) || isLateStageDealTitle(deal.title);
  });

  if (eligibleDeals.length === 0) {
    return {
      status: 'completed',
      creditsUsed: 0.1,
      output: {
        dealsProcessed: 0,
        message: ctx.dealId
          ? 'Deal is not in a technical validation or late-stage pipeline stage'
          : 'No deals in technical validation or late-stage pipeline stages',
      },
    };
  }

  const plans: PocPlan[] = [];
  const allTaskIds: string[] = [];
  const approvalIds: string[] = [];

  for (const deal of eligibleDeals) {
    const stageName = stageNameById.get(deal.stageId.toString()) ?? 'Unknown';
    const result = await processDeal(ctx, deal, stageName);
    plans.push(result.plan);
    allTaskIds.push(...result.taskIds);
    if (result.approvalId) approvalIds.push(result.approvalId);
  }

  const usedGemini = Boolean(process.env.GEMINI_API_KEY);

  return {
    status: approvalIds.length > 0 ? 'awaiting_approval' : 'completed',
    creditsUsed: usedGemini ? 0.6 : 0.15,
    output: {
      dealsProcessed: eligibleDeals.length,
      dealIds: eligibleDeals.map((d) => d.id),
      plans,
      tasksCreated: allTaskIds.length,
      taskIds: allTaskIds,
      approvalsCreated: approvalIds.length,
      approvalIds,
      kickoffEmailPending: approvalIds.length > 0,
    },
  };
}
