import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Agent, AgentRun } from '@ai-crm/db';
import { CreateAgentSchema, DraftAgentSchema, DraftFromNlRequestSchema, RunAgentSchema, UpdateAgentSchema } from '@ai-crm/shared';
import { ensureConnectionWebhookSecret } from '../../lib/webhook-hmac.js';
import { enqueueAgentRun } from './executor.js';
import { draftFromKeywords, generateDraftWithGemini } from './draft-from-nl.js';

const draftRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkDraftRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${userId}:draft-from-nl`;
  const entry = draftRateLimits.get(key);

  if (!entry || now >= entry.resetAt) {
    draftRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

/** Opine-style template catalog — maps to docs/AGENT_AUTOMATIONS.md */
const TEMPLATES = [
  {
    slug: 'crm-hygiene',
    name: 'CRM Hygiene',
    category: 'process',
    description: 'Detect stale or incomplete CRM fields and draft updates for approval before write-back.',
  },
  {
    slug: 'deal-focus',
    name: 'My Deal Focus',
    category: 'process',
    description: 'Daily prioritized list of your active deals by urgency, risk, and recent signals.',
  },
  {
    slug: 'poc-kickoff',
    name: 'POC Plan Generator',
    category: 'process',
    description: 'When a deal hits pilot stage, generate a kickoff plan with stakeholders, success criteria, and timeline.',
  },
  {
    slug: 'closed-won-handoff',
    name: 'Closed Won Handoff',
    category: 'process',
    description: 'When a deal closes won, generate a handoff package for CS/implementation — stakeholders, MEDDPICC summary, open items, and next steps.',
  },
  {
    slug: 'post-call',
    name: 'Post-Call Follow-up Draft',
    category: 'process',
    description: 'Draft a follow-up email with recap, action items, and next steps after a sales call.',
  },
  {
    slug: 'meeting-summary',
    name: 'Meeting Summary & Next Steps',
    category: 'process',
    description: 'Generate a concise meeting summary with recap and action items from call notes or transcripts.',
  },
  {
    slug: 'risk-scanner',
    name: 'Risk Scanner',
    category: 'risk',
    description: 'Daily scan of active deals for risk signals — stalled deals, missing stakeholders, slipping timelines.',
  },
  {
    slug: 'deal-stalling',
    name: 'Deal Stalling Detection',
    category: 'risk',
    description: 'Detect deals with no recent activity, passed close dates, or stuck stages and alert the owner.',
  },
  {
    slug: 'objection-tracker',
    name: 'Negotiation & Objection Tracker',
    category: 'signals',
    description: 'Scan notes and conversations for pricing objections, competitor mentions, and negotiation signals.',
  },
  {
    slug: 'buying-signals',
    name: 'Buying Signals',
    category: 'signals',
    description: 'Detect positive buying signals — executive involvement, budget approval, timeline urgency.',
  },
  {
    slug: 'product-feedback',
    name: 'Product Feedback Capture',
    category: 'signals',
    description: 'Capture feature gaps and integration requests from customer conversations into product requests.',
  },
  {
    slug: 'meddpicc-synth',
    name: 'MEDDPICC Synthesizer',
    category: 'signals',
    description: 'Build MEDDPICC qualification from deal notes, company context, and CRM data using AI.',
  },
  {
    slug: 'weekly-digest',
    name: 'Weekly Reporting Digest',
    category: 'reporting',
    description: 'Compile a summary of deal activity from the past week — every Monday morning digest.',
  },
  {
    slug: 'win-loss-analysis',
    name: 'Cross-Deal Win/Loss Analysis',
    category: 'reporting',
    description: 'On-demand win/loss analysis across closed deals — patterns, competitive themes, and recommendations.',
  },
];

function toAgentDto(a: InstanceType<typeof Agent>) {
  return {
    id: a.id,
    name: a.name,
    templateSlug: a.templateSlug ?? null,
    category: a.category,
    isActive: a.isActive,
    enabled: a.isActive,
    ownerId: a.ownerId?.toString() ?? null,
    config: {
      triggerConfig: (a.triggerConfig as Record<string, unknown> | undefined) ?? {},
      toolsConfig: (a.toolsConfig as Record<string, unknown> | undefined) ?? {},
      deliveryConfig: (a.deliveryConfig as Record<string, unknown> | null | undefined) ?? null,
    },
    settings: (a.settings as Record<string, unknown> | undefined) ?? {},
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function getAgentStats(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const [activeAgents, totalAgents, runsToday, runs30d, pendingApprovals, creditsAgg] = await Promise.all([
    Agent.countDocuments({ workspaceId, isActive: true }),
    Agent.countDocuments({ workspaceId }),
    AgentRun.countDocuments({
      workspaceId,
      createdAt: { $gte: new Date(Date.now() - 86400000) },
    }),
    AgentRun.countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo } }),
    AgentRun.countDocuments({ workspaceId, status: 'awaiting_approval' }),
    AgentRun.aggregate([
      { $match: { workspaceId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } },
    ]),
  ]);

  res.json({
    activeAgents,
    totalAgents,
    runsToday,
    runs30d,
    pendingApprovals,
    creditsUsed30d: creditsAgg[0]?.total ?? 0,
  });
}

export async function listAgents(req: AuthedRequest, res: Response) {
  const agents = await Agent.find({ workspaceId: req.tenant!.workspaceId }).sort({ createdAt: -1 });
  res.json({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      templateSlug: a.templateSlug,
      category: a.category,
      isActive: a.isActive,
      ownerId: a.ownerId?.toString() ?? null,
    })),
  });
}

export async function getAgent(req: AuthedRequest, res: Response) {
  const agent = await Agent.findOne({
    _id: req.params.agentId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!agent) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  res.json({ agent: toAgentDto(agent) });
}

export async function updateAgent(req: AuthedRequest, res: Response) {
  const parsed = UpdateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const agent = await Agent.findOne({
    _id: req.params.agentId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!agent) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  if (parsed.data.name !== undefined) agent.name = parsed.data.name;
  if (parsed.data.category !== undefined) agent.category = parsed.data.category;
  if (parsed.data.enabled !== undefined) agent.isActive = parsed.data.enabled;
  if (parsed.data.config?.triggerConfig !== undefined) {
    agent.triggerConfig = parsed.data.config.triggerConfig;
  }
  if (parsed.data.config?.toolsConfig !== undefined) {
    agent.toolsConfig = parsed.data.config.toolsConfig;
  }
  if (parsed.data.config?.deliveryConfig !== undefined) {
    agent.deliveryConfig = parsed.data.config.deliveryConfig;
  }
  if (parsed.data.settings !== undefined) {
    agent.settings = {
      ...((agent.settings as Record<string, unknown> | undefined) ?? {}),
      ...parsed.data.settings,
    };
  }
  await agent.save();

  res.json({ agent: toAgentDto(agent) });
}

export async function deleteAgent(req: AuthedRequest, res: Response) {
  const agent = await Agent.findOne({
    _id: req.params.agentId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!agent) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  agent.isActive = false;
  await agent.save();

  res.json({ agent: toAgentDto(agent), deleted: true });
}

export async function listTemplates(_req: AuthedRequest, res: Response) {
  res.json({ templates: TEMPLATES });
}

export async function postDraftFromNl(req: AuthedRequest, res: Response) {
  const parsed = DraftFromNlRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const userId = req.tenant!.userId;
  if (!checkDraftRateLimit(userId, 10, 3600_000)) {
    res.status(429).json({
      error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded — max 10 drafts per hour' },
    });
    return;
  }

  let draft = process.env.GEMINI_API_KEY
    ? await generateDraftWithGemini(parsed.data.description)
    : null;

  if (!draft) {
    draft = draftFromKeywords(parsed.data.description);
  }

  if (!draft) {
    res.status(422).json({
      error: {
        code: 'NEEDS_CLARIFICATION',
        message: 'Description too vague to draft an agent',
        questions: [
          'What should trigger this agent — daily schedule, CRM event, or manual run?',
          'Which outcome do you want — risk alerts, follow-up emails, reporting, or qualification?',
        ],
      },
    });
    return;
  }

  const validated = DraftAgentSchema.safeParse(draft);
  if (!validated.success) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: validated.error.message },
    });
    return;
  }

  res.json({ draft: validated.data });
}

export async function createAgent(req: AuthedRequest, res: Response) {
  const parsed = CreateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const { name, templateSlug, category, config } = parsed.data;
  const template = templateSlug ? TEMPLATES.find((t) => t.slug === templateSlug) : undefined;
  if (templateSlug && !template) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Unknown template slug' } });
    return;
  }

  const settings = ensureConnectionWebhookSecret(
    (parsed.data.settings as Record<string, unknown> | undefined) ?? {},
  );

  const agent = await Agent.create({
    workspaceId: req.tenant!.workspaceId,
    templateSlug: template?.slug,
    name,
    category: category ?? template?.category ?? 'process',
    ownerId: req.tenant!.userId,
    isActive: true,
    triggerConfig: config?.triggerConfig ?? {},
    toolsConfig: config?.toolsConfig ?? {},
    deliveryConfig: config?.deliveryConfig ?? null,
    settings,
  });

  res.status(201).json({ agent: toAgentDto(agent) });
}

export async function createFromTemplate(req: AuthedRequest, res: Response) {
  const template = TEMPLATES.find((t) => t.slug === req.params.slug);
  if (!template) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
    return;
  }

  const agent = await Agent.create({
    workspaceId: req.tenant!.workspaceId,
    templateSlug: template.slug,
    name: template.name,
    category: template.category,
    ownerId: req.tenant!.userId,
    isActive: true,
    settings: ensureConnectionWebhookSecret({}),
  });

  res.status(201).json({
    agent: { id: agent.id, name: agent.name, templateSlug: agent.templateSlug, isActive: agent.isActive },
  });
}

export async function runAgent(req: AuthedRequest, res: Response) {
  const agent = await Agent.findOne({
    _id: req.params.agentId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!agent) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  const parsed = RunAgentSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const scope = parsed.data.scope ?? {};
  const run = await AgentRun.create({
    workspaceId: req.tenant!.workspaceId,
    agentId: agent._id,
    dealId: scope.dealId,
    status: 'running',
    triggerType: 'manual',
    startedAt: new Date(),
    scope,
  });

  enqueueAgentRun({
    runId: run.id,
    workspaceId: req.tenant!.workspaceId,
    agentId: agent.id,
    templateSlug: agent.templateSlug ?? 'unknown',
    dealId: scope.dealId,
    userId: req.tenant!.userId,
  });

  res.status(202).json({ run: { id: run.id, status: run.status, agentId: agent.id } });
}
