import { DraftAgentSchema, type DraftAgent } from '@ai-crm/shared';
import { log } from '../../lib/logger.js';

const ALLOWED_TOOLS = [
  'crm_get_deal_status',
  'search_artifacts',
  'get_artifact_excerpt',
  'propose_field_update',
] as const;

const ALLOWED_SKILLS = ['meddpicc', 'risk_scoring', 'email_draft', 'slack_delivery'] as const;

type TemplateMeta = {
  slug: string;
  name: string;
  category: DraftAgent['category'];
};

const TEMPLATE_CATALOG: TemplateMeta[] = [
  { slug: 'crm-hygiene', name: 'CRM Hygiene', category: 'process' },
  { slug: 'deal-focus', name: 'My Deal Focus', category: 'process' },
  { slug: 'poc-kickoff', name: 'POC Kickoff', category: 'process' },
  { slug: 'post-call', name: 'Post-Call Follow-up Draft', category: 'process' },
  { slug: 'meeting-summary', name: 'Meeting Summary & Next Steps', category: 'process' },
  { slug: 'risk-scanner', name: 'Risk Scanner', category: 'risk' },
  { slug: 'deal-stalling', name: 'Deal Stalling Detection', category: 'risk' },
  { slug: 'objection-tracker', name: 'Negotiation & Objection Tracker', category: 'signals' },
  { slug: 'buying-signals', name: 'Buying Signals', category: 'signals' },
  { slug: 'product-feedback', name: 'Product Feedback Capture', category: 'signals' },
  { slug: 'meddpicc-synth', name: 'MEDDPICC Synthesizer', category: 'signals' },
  { slug: 'weekly-digest', name: 'Weekly Reporting Digest', category: 'reporting' },
  { slug: 'win-loss-analysis', name: 'Cross-Deal Win/Loss Analysis', category: 'reporting' },
];

const TEMPLATE_SLUGS = TEMPLATE_CATALOG.map((t) => t.slug);

type KeywordRule = {
  keywords: string[];
  templateSlug: string;
  triggerType: DraftAgent['triggerType'];
  schedule: string | null;
  event: string | null;
  tools: string[];
  skills: string[];
  nameHint?: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ['objection', 'competitor', 'pricing'],
    templateSlug: 'objection-tracker',
    triggerType: 'event',
    schedule: null,
    event: 'activity.ingested',
    tools: ['search_artifacts', 'get_artifact_excerpt'],
    skills: ['risk_scoring', 'slack_delivery'],
  },
  {
    keywords: ['buying', 'signal', 'hot'],
    templateSlug: 'buying-signals',
    triggerType: 'event',
    schedule: null,
    event: 'activity.ingested',
    tools: ['search_artifacts', 'crm_get_deal_status'],
    skills: ['risk_scoring'],
  },
  {
    keywords: ['poc', 'kickoff', 'pilot'],
    templateSlug: 'poc-kickoff',
    triggerType: 'event',
    schedule: null,
    event: 'deal.stage_changed',
    tools: ['crm_get_deal_status', 'search_artifacts'],
    skills: ['email_draft'],
  },
  {
    keywords: ['weekly', 'digest', 'report'],
    templateSlug: 'weekly-digest',
    triggerType: 'schedule',
    schedule: '0 8 * * 1',
    event: null,
    tools: ['crm_get_deal_status', 'search_artifacts'],
    skills: ['slack_delivery'],
  },
  {
    keywords: ['win', 'loss', 'analysis'],
    templateSlug: 'win-loss-analysis',
    triggerType: 'manual',
    schedule: null,
    event: null,
    tools: ['search_artifacts', 'crm_get_deal_status'],
    skills: ['meddpicc'],
  },
  {
    keywords: ['meddpicc', 'qualify'],
    templateSlug: 'meddpicc-synth',
    triggerType: 'manual',
    schedule: null,
    event: null,
    tools: ['crm_get_deal_status', 'search_artifacts'],
    skills: ['meddpicc'],
  },
  {
    keywords: ['call', 'follow-up', 'follow up', 'email'],
    templateSlug: 'post-call',
    triggerType: 'event',
    schedule: null,
    event: 'activity.ingested',
    tools: ['search_artifacts', 'get_artifact_excerpt'],
    skills: ['email_draft'],
  },
  {
    keywords: ['risk', 'stall', 'stuck'],
    templateSlug: 'risk-scanner',
    triggerType: 'schedule',
    schedule: '0 */6 * * *',
    event: null,
    tools: ['crm_get_deal_status', 'search_artifacts'],
    skills: ['risk_scoring'],
  },
  {
    keywords: ['negotiation', 'stalled', 'stalling'],
    templateSlug: 'deal-stalling',
    triggerType: 'schedule',
    schedule: '0 8 * * *',
    event: null,
    tools: ['crm_get_deal_status', 'search_artifacts'],
    skills: ['risk_scoring', 'slack_delivery'],
  },
  {
    keywords: ['daily', 'morning', 'focus'],
    templateSlug: 'deal-focus',
    triggerType: 'schedule',
    schedule: '0 8 * * *',
    event: null,
    tools: ['crm_get_deal_status', 'search_artifacts'],
    skills: ['risk_scoring', 'slack_delivery'],
  },
];

function getTemplate(slug: string): TemplateMeta | undefined {
  return TEMPLATE_CATALOG.find((t) => t.slug === slug);
}

function deriveName(description: string, template: TemplateMeta, rule?: KeywordRule): string {
  if (rule?.nameHint) return rule.nameHint;
  const trimmed = description.trim();
  if (trimmed.length <= 80) return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return template.name;
}

function buildSystemPrompt(description: string, template: TemplateMeta): string {
  return `You are an AI CRM agent based on the "${template.name}" template. ${description.trim()} Focus on actionable insights and cite deal context where relevant.`;
}

export function draftFromKeywords(description: string): DraftAgent | null {
  const lower = description.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    if (!rule.keywords.some((kw) => lower.includes(kw))) continue;

    const template = getTemplate(rule.templateSlug);
    if (!template) continue;

    return {
      name: deriveName(description, template, rule),
      templateSlug: rule.templateSlug,
      category: template.category,
      triggerType: rule.triggerType,
      schedule: rule.schedule,
      event: rule.event,
      systemPrompt: buildSystemPrompt(description, template),
      tools: rule.tools,
      skills: rule.skills,
      confidence: 0.6,
      reasoning: 'Keyword fallback (no GEMINI_API_KEY)',
    };
  }

  return null;
}

export async function generateDraftWithGemini(description: string): Promise<DraftAgent | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
  const prompt = `You are an agent configuration assistant for AI CRM.
Given a user description, output JSON matching this schema:
{
  "name": string (1-200 chars),
  "templateSlug": one of ${JSON.stringify(TEMPLATE_SLUGS)},
  "category": "process" | "risk" | "signals" | "reporting",
  "triggerType": "schedule" | "event" | "manual" | "webhook",
  "schedule": cron string or null (only if triggerType=schedule),
  "event": one of "activity.ingested", "deal.stage_changed", "deal.closed" or null (only if triggerType=event),
  "systemPrompt": concise actionable instructions, no markdown,
  "tools": array from ${JSON.stringify(ALLOWED_TOOLS)},
  "skills": array from ${JSON.stringify(ALLOWED_SKILLS)},
  "confidence": number 0-1,
  "reasoning": short explanation max 500 chars
}

Rules:
- Pick the closest templateSlug from the allowed list
- triggerType: schedule for daily/weekly/every, event for when call/stage changes, manual otherwise
- schedule: valid cron only if triggerType=schedule (e.g. "0 8 * * *" for daily 8am, "0 8 * * 1" for Monday 8am)
- event: only if triggerType=event
- tools/skills: only from allowed lists

User description:
${description}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      log('draft-from-nl', 'Gemini API error', { status: res.status, body: errText.slice(0, 200) });
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as unknown;
    const validated = DraftAgentSchema.safeParse(parsed);
    if (!validated.success) {
      log('draft-from-nl', 'Gemini output validation failed', { error: validated.error.message });
      return null;
    }

    return validated.data;
  } catch (err) {
    log('draft-from-nl', 'Gemini generate failed', { error: String(err) });
    return null;
  }
}
