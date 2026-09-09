import {
  Approval,
  Company,
  Deal,
  DealMeddpicc,
  Note,
  Task,
} from '@ai-crm/db';
import type { Types } from 'mongoose';
import { log } from '../../../lib/logger.js';
import type { AgentRunContext, AgentRunResult } from './types.js';

const MS_PER_DAY = 86400000;
const APPROVAL_TTL_DAYS = 7;
const RECENT_NOTES_LIMIT = 10;
const OPEN_TASKS_LIMIT = 20;

const MEDDPICC_LETTERS: Array<{ key: string; label: string }> = [
  { key: 'M', label: 'Metrics' },
  { key: 'E', label: 'Economic Buyer' },
  { key: 'D1', label: 'Decision Criteria' },
  { key: 'D2', label: 'Decision Process' },
  { key: 'P', label: 'Paper Process' },
  { key: 'I', label: 'Identify Pain' },
  { key: 'C1', label: 'Champion' },
  { key: 'C2', label: 'Competition' },
];

export interface HandoffStakeholder {
  role: string;
  name: string;
  source: string;
}

export interface HandoffOpenTask {
  title: string;
  dueDate: string | null;
  status: string;
}

export interface HandoffDocument {
  dealId: string;
  dealTitle: string;
  companyName: string;
  stakeholders: HandoffStakeholder[];
  meddpiccHighlights: Record<string, string>;
  openTasks: HandoffOpenTask[];
  implementationNotes: string[];
  handoffEmail: { subject: string; body: string };
}

function meddpiccSummary(
  letters: Record<string, { summary?: string }> | undefined,
  key: string,
): string | undefined {
  const entry = letters?.[key];
  return typeof entry?.summary === 'string' && entry.summary.trim() ? entry.summary.trim() : undefined;
}

function buildStakeholders(meddpicc: InstanceType<typeof DealMeddpicc> | null): HandoffStakeholder[] {
  const letters = (meddpicc?.letters ?? {}) as Record<string, { summary?: string }>;
  const stakeholders: HandoffStakeholder[] = [];

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

  const paperProcess = meddpiccSummary(letters, 'P');
  if (paperProcess) {
    stakeholders.push({ role: 'Paper Process', name: paperProcess, source: 'MEDDPICC P' });
  }

  if (stakeholders.length === 0) {
    stakeholders.push({
      role: 'Primary Contact',
      name: 'Confirm customer stakeholders with deal owner before handoff',
      source: 'Default',
    });
  }

  return stakeholders;
}

function buildMeddpiccHighlights(meddpicc: InstanceType<typeof DealMeddpicc> | null): Record<string, string> {
  const letters = (meddpicc?.letters ?? {}) as Record<string, { summary?: string }>;
  const highlights: Record<string, string> = {};

  for (const { key, label } of MEDDPICC_LETTERS) {
    const summary = meddpiccSummary(letters, key);
    if (summary) highlights[label] = summary;
  }

  if (Object.keys(highlights).length === 0) {
    highlights['Qualification'] = 'No MEDDPICC data on file — CS should validate qualification during onboarding.';
  }

  return highlights;
}

function buildImplementationNotes(noteBodies: string[], openTasks: HandoffOpenTask[]): string[] {
  const notes: string[] = [];

  const implKeywords = /implement|integrat|deploy|onboard|sandbox|access|security|technical|requirement/i;
  for (const body of noteBodies) {
    if (implKeywords.test(body)) {
      notes.push(body.slice(0, 300) + (body.length > 300 ? '…' : ''));
    }
  }

  if (notes.length === 0 && noteBodies.length > 0) {
    notes.push(`Latest deal note: ${noteBodies[0].slice(0, 250)}${noteBodies[0].length > 250 ? '…' : ''}`);
  }

  if (openTasks.length > 0) {
    notes.push(`Open pre-close tasks to carry forward: ${openTasks.map((t) => t.title).join('; ')}`);
  }

  if (notes.length === 0) {
    notes.push('No implementation notes captured — schedule a technical handoff call with the SE and CS lead.');
  }

  return notes.slice(0, 5);
}

function buildHandoffEmail(doc: Omit<HandoffDocument, 'handoffEmail' | 'dealId'> & { dealId: string }): {
  subject: string;
  body: string;
} {
  const stakeholderLines = doc.stakeholders.map((s) => `- ${s.role}: ${s.name}`).join('\n');
  const meddpiccLines = Object.entries(doc.meddpiccHighlights)
    .map(([label, value]) => `- ${label}: ${value}`)
    .join('\n');
  const taskLines =
    doc.openTasks.length > 0
      ? doc.openTasks.map((t) => `- ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''}`).join('\n')
      : '- None — confirm open items with the customer during kickoff';
  const implLines = doc.implementationNotes.map((n) => `- ${n}`).join('\n');

  const body = `Hi CS team,

${doc.dealTitle} with ${doc.companyName} has closed won. Please use this handoff package for onboarding and implementation planning.

Stakeholders:
${stakeholderLines}

MEDDPICC highlights:
${meddpiccLines}

Open items:
${taskLines}

Implementation notes:
${implLines}

Next steps:
- Schedule customer success kickoff within 5 business days
- Confirm technical requirements and integration scope
- Assign CS owner and implementation timeline

Best regards,
Sales Engineering`;

  return {
    subject: `Closed Won Handoff — ${doc.dealTitle} | ${doc.companyName}`,
    body,
  };
}

function buildHandoffNoteBody(doc: HandoffDocument): string {
  const sections = [
    `# Closed Won Handoff — ${doc.dealTitle}`,
    '',
    `**Company:** ${doc.companyName}`,
    '',
    '## Stakeholders',
    ...doc.stakeholders.map((s) => `- **${s.role}** (${s.source}): ${s.name}`),
    '',
    '## MEDDPICC Summary',
    ...Object.entries(doc.meddpiccHighlights).map(([label, value]) => `- **${label}:** ${value}`),
    '',
    '## Open Tasks',
    ...(doc.openTasks.length > 0
      ? doc.openTasks.map((t) => `- ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''} [${t.status}]`)
      : ['- None recorded']),
    '',
    '## Implementation Notes',
    ...doc.implementationNotes.map((n) => `- ${n}`),
    '',
    '## Handoff Email Draft',
    `**Subject:** ${doc.handoffEmail.subject}`,
    '',
    doc.handoffEmail.body,
  ];

  return sections.join('\n');
}

async function buildHandoffDocument(
  deal: InstanceType<typeof Deal>,
  company: InstanceType<typeof Company> | null,
  meddpicc: InstanceType<typeof DealMeddpicc> | null,
  notes: InstanceType<typeof Note>[],
  openTasks: InstanceType<typeof Task>[],
): Promise<HandoffDocument> {
  const stakeholders = buildStakeholders(meddpicc);
  const meddpiccHighlights = buildMeddpiccHighlights(meddpicc);
  const taskItems: HandoffOpenTask[] = openTasks.map((t) => ({
    title: t.title,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    status: t.status,
  }));
  const implementationNotes = buildImplementationNotes(
    notes.map((n) => n.body),
    taskItems,
  );

  const base = {
    dealId: deal.id,
    dealTitle: deal.title,
    companyName: company?.name ?? 'Customer',
    stakeholders,
    meddpiccHighlights,
    openTasks: taskItems,
    implementationNotes,
  };

  return { ...base, handoffEmail: buildHandoffEmail(base) };
}

async function createHandoffApproval(
  ctx: AgentRunContext,
  deal: InstanceType<typeof Deal>,
  doc: HandoffDocument,
): Promise<string> {
  const approval = await Approval.create({
    workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
    agentRunId: ctx.runId as unknown as Types.ObjectId,
    dealId: deal._id,
    assignedTo: deal.ownerId,
    status: 'pending',
    contentType: 'email',
    title: `Closed won handoff: ${deal.title}`,
    contentPreview: {
      subject: doc.handoffEmail.subject,
      summary: `SE→CS handoff for ${doc.companyName} — ${doc.stakeholders.length} stakeholders, ${doc.openTasks.length} open tasks`,
      stakeholderCount: doc.stakeholders.length,
      openTaskCount: doc.openTasks.length,
    },
    contentFull: doc,
    proposedChange: {
      type: 'note_create',
      dealId: deal.id,
      body: buildHandoffNoteBody(doc),
    },
    expiresAt: new Date(Date.now() + APPROVAL_TTL_DAYS * MS_PER_DAY),
  });

  return approval.id;
}

async function processDeal(ctx: AgentRunContext, deal: InstanceType<typeof Deal>): Promise<{
  doc: HandoffDocument;
  approvalId: string;
}> {
  const [company, meddpicc, notes, openTasks] = await Promise.all([
    Company.findById(deal.companyId),
    DealMeddpicc.findOne({ dealId: deal._id, workspaceId: ctx.workspaceId }),
    Note.find({ dealId: deal._id, workspaceId: ctx.workspaceId })
      .sort({ createdAt: -1 })
      .limit(RECENT_NOTES_LIMIT),
    Task.find({ dealId: deal._id, workspaceId: ctx.workspaceId, status: 'open' })
      .sort({ dueDate: 1 })
      .limit(OPEN_TASKS_LIMIT),
  ]);

  const doc = await buildHandoffDocument(deal, company, meddpicc, notes, openTasks);
  const approvalId = await createHandoffApproval(ctx, deal, doc);

  return { doc, approvalId };
}

export async function runClosedWonHandoff(ctx: AgentRunContext): Promise<AgentRunResult> {
  const filter: Record<string, unknown> = {
    workspaceId: ctx.workspaceId,
    status: 'won',
    deletedAt: null,
  };

  if (ctx.dealId) {
    filter._id = ctx.dealId;
  }

  const deals = await Deal.find(filter);

  if (deals.length === 0) {
    const message = ctx.dealId
      ? 'Deal not found or not in closed-won status'
      : 'No closed-won deals found in workspace';

    log('closed-won-handoff', message, { dealId: ctx.dealId });

    return {
      status: 'completed',
      creditsUsed: 0.1,
      output: { dealsProcessed: 0, message },
    };
  }

  const documents: HandoffDocument[] = [];
  const approvalIds: string[] = [];

  for (const deal of deals) {
    const result = await processDeal(ctx, deal);
    documents.push(result.doc);
    approvalIds.push(result.approvalId);
  }

  return {
    status: approvalIds.length > 0 ? 'awaiting_approval' : 'completed',
    creditsUsed: 0.5,
    output: {
      dealsProcessed: deals.length,
      dealIds: deals.map((d) => d.id),
      handoffs: documents,
      approvalsCreated: approvalIds.length,
      approvalIds,
    },
  };
}
