import { Approval, Company, Deal, Note, Task } from '@ai-crm/db';
import type { Types } from 'mongoose';
import { log } from '../../../lib/logger.js';
import { formatTranscriptsForPrompt, loadDealTranscripts } from '../../../lib/transcript-context.js';
import type { AgentRunContext, AgentRunResult } from '../executor.js';

const MS_PER_DAY = 86400000;
const RECENT_NOTES_LIMIT = 10;
const OPEN_TASKS_LIMIT = 10;
const APPROVAL_EXPIRY_DAYS = 7;

export interface PostCallActionItem {
  title: string;
  dueInDays?: number;
}

export interface PostCallEmailDraft {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

export interface PostCallBundle {
  summary: string;
  actionItems: PostCallActionItem[];
  emailDraft: PostCallEmailDraft;
}

function addDays(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function buildNoteBody(summary: string, actionItems: PostCallActionItem[]): string {
  const lines = [`## Call summary\n\n${summary}`];
  if (actionItems.length > 0) {
    lines.push('\n## Action items');
    for (const item of actionItems) {
      const due = item.dueInDays ? ` (due in ${item.dueInDays}d)` : '';
      lines.push(`- ${item.title}${due}`);
    }
  }
  return lines.join('\n');
}

function buildTemplateBundle(
  dealTitle: string,
  companyName: string | undefined,
  noteSnippets: string[],
): PostCallBundle {
  const contextHint = noteSnippets.length > 0
    ? ` Recent notes mention: ${noteSnippets[0].slice(0, 120)}${noteSnippets[0].length > 120 ? '…' : ''}`
    : '';

  const summary = `Follow-up for ${dealTitle}${companyName ? ` (${companyName})` : ''}: recap the key discussion points, confirm mutual next steps, and keep momentum on the opportunity.${contextHint}`;

  const actionItems: PostCallActionItem[] = [
    { title: 'Send recap email to stakeholders', dueInDays: 1 },
    { title: 'Update CRM with call outcomes', dueInDays: 2 },
    { title: 'Schedule next meeting', dueInDays: 5 },
  ];

  const bodyText = [
    `Hi team,`,
    '',
    `Thank you for your time on our recent call regarding ${dealTitle}.`,
    '',
    summary,
    '',
    'Next steps:',
    ...actionItems.map((item) => `- ${item.title}`),
    '',
    'Best regards',
  ].join('\n');

  const bodyHtml = bodyText
    .split('\n')
    .map((line) => (line ? `<p>${line}</p>` : '<br/>'))
    .join('');

  return {
    summary,
    actionItems,
    emailDraft: {
      subject: `Follow-up: ${dealTitle}`,
      bodyText,
      bodyHtml,
    },
  };
}

async function generateBundleWithGemini(input: {
  dealTitle: string;
  companyName?: string;
  amount?: number;
  noteSnippets: string[];
  openTaskTitles: string[];
  transcriptBlock?: string;
}): Promise<PostCallBundle | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
  const prompt = `You are a B2B sales assistant. Generate a post-call follow-up bundle.

Deal: ${input.dealTitle}
Company: ${input.companyName ?? 'Unknown'}
Amount: $${input.amount ?? 0}
Recent notes:
${input.noteSnippets.length ? input.noteSnippets.map((n, i) => `${i + 1}. ${n}`).join('\n') : '(none)'}
Open tasks:
${input.openTaskTitles.length ? input.openTaskTitles.map((t) => `- ${t}`).join('\n') : '(none)'}
${input.transcriptBlock ? `\nCall transcript(s):\n${input.transcriptBlock}` : ''}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence call recap",
  "actionItems": [{"title": string, "dueInDays": number}],
  "emailDraft": {
    "subject": string,
    "bodyText": "plain-text follow-up email with recap and bullets",
    "bodyHtml": "simple HTML version with <p> tags"
  }
}

Provide 2-4 concrete action items. Email should be professional and ready to send.`;

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
      log('post-call', 'Gemini API error', { status: res.status, body: errText.slice(0, 200) });
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as PostCallBundle;
    if (!parsed.summary || !Array.isArray(parsed.actionItems) || !parsed.emailDraft?.subject) {
      return null;
    }
    return parsed;
  } catch (err) {
    log('post-call', 'Gemini generate failed', { error: String(err) });
    return null;
  }
}

export async function runPostCall(ctx: AgentRunContext): Promise<AgentRunResult> {
  if (!ctx.dealId) {
    return {
      status: 'completed',
      creditsUsed: 0,
      output: { skipped: true, reason: 'dealId required for post-call follow-up' },
    };
  }

  const deal = await Deal.findOne({
    _id: ctx.dealId,
    workspaceId: ctx.workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    return {
      status: 'failed',
      creditsUsed: 0,
      output: {},
      error: 'Deal not found',
    };
  }

  const [company, recentNotes, openTasks] = await Promise.all([
    Company.findById(deal.companyId),
    Note.find({ workspaceId: ctx.workspaceId, dealId: deal._id })
      .sort({ createdAt: -1 })
      .limit(RECENT_NOTES_LIMIT),
    Task.find({ workspaceId: ctx.workspaceId, dealId: deal._id, status: 'open' })
      .sort({ createdAt: -1 })
      .limit(OPEN_TASKS_LIMIT),
  ]);

  const noteSnippets = recentNotes.map((n) => n.body);
  const openTaskTitles = openTasks.map((t) => t.title);
  const transcripts = await loadDealTranscripts(ctx.workspaceId, deal._id, 2);
  const transcriptBlock =
    transcripts.length > 0 ? formatTranscriptsForPrompt(transcripts) : undefined;

  const geminiBundle = await generateBundleWithGemini({
    dealTitle: deal.title,
    companyName: company?.name,
    amount: deal.amount,
    noteSnippets,
    openTaskTitles,
    transcriptBlock,
  });

  const bundle =
    geminiBundle ??
    buildTemplateBundle(deal.title, company?.name, noteSnippets);

  const noteBody = buildNoteBody(bundle.summary, bundle.actionItems);
  const taskSuggestions = bundle.actionItems.map((item) => ({
    title: item.title,
    dueDate: item.dueInDays ? addDays(item.dueInDays) : undefined,
  }));

  const approval = await Approval.create({
    workspaceId: ctx.workspaceId as unknown as Types.ObjectId,
    agentRunId: ctx.runId as unknown as Types.ObjectId,
    dealId: deal._id,
    assignedTo: deal.ownerId,
    status: 'pending',
    contentType: 'post_call_bundle',
    title: `Post-call follow-up: ${deal.title}`,
    contentPreview: {
      summary: bundle.summary.slice(0, 200),
      actionItemCount: bundle.actionItems.length,
      emailSubject: bundle.emailDraft.subject,
    },
    contentFull: {
      dealId: deal.id,
      dealTitle: deal.title,
      summary: bundle.summary,
      actionItems: bundle.actionItems,
      emailDraft: bundle.emailDraft,
      sourceNoteCount: recentNotes.length,
      openTaskCount: openTasks.length,
    },
    proposedChange: {
      type: 'post_call_bundle',
      dealId: deal.id,
      note: {
        type: 'note_create',
        dealId: deal.id,
        body: noteBody,
      },
      tasks: taskSuggestions,
      email: bundle.emailDraft,
    },
    expiresAt: new Date(Date.now() + APPROVAL_EXPIRY_DAYS * MS_PER_DAY),
  });

  return {
    status: 'awaiting_approval',
    creditsUsed: geminiBundle ? 1.0 : 0,
    output: {
      approvalId: approval.id,
      dealId: deal.id,
      generatedWith: geminiBundle ? (transcripts.length > 0 ? 'gemini+transcript' : 'gemini') : 'template',
      transcriptCount: transcripts.length,
      actionItemCount: bundle.actionItems.length,
      emailSubject: bundle.emailDraft.subject,
    },
  };
}
