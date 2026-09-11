/**
 * Landing page content — derived from docs/opine-feature-reference.md
 * Adapted for AI CRM product positioning (multi-CRM differentiator).
 */

import type { IntegrationId } from '@/components/brand/IntegrationLogo';

export const BUILDING_BLOCKS = [
  {
    id: 'workbench',
    title: 'Workbench',
    description:
      'Personal home for SEs: your deals, assigned tasks, and an AI chat interface — one screen to start every day.',
    icon: 'dashboard',
    accent: '#7c3aed',
  },
  {
    id: 'deals',
    title: 'Deals',
    description:
      'Pipeline view of every active opportunity, auto-synced from HubSpot, Salesforce, Pipedrive, or Zoho.',
    icon: 'kanban',
    accent: '#6366f1',
  },
  {
    id: 'evaluations',
    title: 'Evaluations',
    description:
      'Structured POC/POV workflow with phases: prerequisites → execution → outcomes — not a flat task list.',
    icon: 'flask',
    accent: '#14b8a6',
  },
] as const;

export const MVP_FEATURES = [
  {
    title: 'Unified deal record',
    badge: 'Most adopted',
    description:
      'One record per opportunity merging CRM, Slack, Gong, calendar, and docs — the context layer your CRM never had.',
    icon: 'layers',
    accent: '#7c3aed',
  },
  {
    title: 'Cited AI summaries',
    badge: 'SE favorite',
    description:
      'MEDDPICC and deal-health summaries with inline citations to Slack messages, transcript moments, and CRM fields.',
    icon: 'sparkles',
    accent: '#6366f1',
  },
  {
    title: 'Risk monitor agents',
    description:
      'Plain-language rules — stalled deals, competitor mentions, quiet champions — with human approval before any write.',
    icon: 'radar',
    accent: '#ef4444',
  },
  {
    title: 'POC / eval workflow',
    description:
      'Presales-specific process separate from AE pipeline stages. Templates seed phases and work items automatically.',
    icon: 'clipboard',
    accent: '#14b8a6',
  },
  {
    title: 'Buyer portal',
    description:
      'Shared external workspace so sellers, SEs, and buyers collaborate in one thread — no email ping-pong.',
    icon: 'users',
    accent: '#f59e0b',
  },
  {
    title: 'Leadership analytics',
    description:
      'Funnel, activity hours, bottleneck diagnosis, and team performance — filterable by rep, team, and stage.',
    icon: 'chart',
    accent: '#3b82f6',
  },
] as const;

export const FEATURE_MODULES = [
  {
    letter: 'A',
    title: 'Technical Sales Management',
    icon: 'kanban',
    accent: '#7c3aed',
    items: [
      'Dedicated presales workflow (not AE-shaped CRM fields)',
      'POV / POC planning with phase templates',
      'Team requests & specialist routing',
      'Automated activity tracking',
      'Technical fit assessment & qualification',
      'MEDDPICC / SPICED auto-fill from conversations',
    ],
  },
  {
    letter: 'B',
    title: 'AI Deal Intelligence',
    icon: 'sparkles',
    accent: '#6366f1',
    items: [
      'Automatic deal summarization',
      'Deal health & risk scoring',
      'Pre-call briefing packs',
      'SE→AE handoff context packages',
      'Inline source citations on every claim',
      'Whole-record view per opportunity',
    ],
  },
  {
    letter: 'C',
    title: 'Agentic Automation',
    icon: 'radar',
    accent: '#ef4444',
    items: [
      'CRM auto-enrichment from calls & chat',
      'Configurable GTM monitors (plain language)',
      'Deal risk monitoring agent',
      'Human-in-the-loop approval queue',
      'Slack delivery with evidence + next step',
      'Jira blocker tracking tied to deals',
    ],
  },
  {
    letter: 'D',
    title: 'Leadership Analytics',
    icon: 'chart',
    accent: '#3b82f6',
    items: [
      'Sales funnel & pipeline views',
      'POC/eval bottleneck diagnosis',
      'Win/loss analysis with drill-down',
      'Activity breakdown by event type',
      'Team performance & coaching insights',
      'Export to CSV / warehouse (roadmap)',
    ],
  },
  {
    letter: 'E',
    title: 'Product Gap Intelligence',
    icon: 'layers',
    accent: '#14b8a6',
    items: [
      'Customer requirement tracking per deal',
      'Product-gap rollups for leadership',
      'Competitive & objection pattern detection',
    ],
  },
  {
    letter: 'F',
    title: 'Buyer Experience',
    icon: 'users',
    accent: '#f59e0b',
    items: [
      'Shared buyer portal / collaboration thread',
      'Auto-generated stakeholder updates',
    ],
  },
] as const;

export const INTEGRATIONS: Record<string, { id: IntegrationId; name: string }[]> = {
  crm: [
    { id: 'hubspot', name: 'HubSpot' },
    { id: 'salesforce', name: 'Salesforce' },
    { id: 'pipedrive', name: 'Pipedrive' },
    { id: 'zoho', name: 'Zoho CRM' },
  ],
  calls: [
    { id: 'gong', name: 'Gong' },
    { id: 'chorus', name: 'Chorus' },
  ],
  chat: [
    { id: 'slack', name: 'Slack' },
    { id: 'teams', name: 'Microsoft Teams' },
    { id: 'google-chat', name: 'Google Chat' },
  ],
  calendar: [
    { id: 'google-calendar', name: 'Google Calendar' },
    { id: 'outlook', name: 'Outlook' },
    { id: 'zoom', name: 'Zoom Meet' },
  ],
  platform: [
    { id: 'jira', name: 'Jira' },
    { id: 'linear', name: 'Linear' },
    { id: 'google-drive', name: 'Google Drive' },
    { id: 'notion', name: 'Notion' },
  ],
} as const;

export const HERO_TESTIMONIAL = {
  quote: 'MEDDPICC summaries with sources changed our QBR conversations.',
  name: 'Elena Ruiz',
  title: 'Senior SE Manager',
  rating: '4.8/5 on G2',
} as const;

export const STATS_FOOTNOTE =
  '*Based on self-reported time savings from early access customers. Individual results vary.';

export const MODULE_OUTCOMES: Record<string, string> = {
  A: 'Cut POC planning time across your SE bench',
  B: 'Brief every call with cited deal context in 60 seconds',
  C: 'Catch stalled deals before leadership asks why',
  D: 'Diagnose funnel bottlenecks by team and stage',
  E: 'Roll up product gaps from live evals',
  F: 'Replace email ping-pong on technical evals',
};

export const STATS = [
  { value: 23, suffix: '%', label: 'Shorter sales cycles', icon: 'chart' },
  { value: 4, suffix: 'hr', label: 'Saved per deal per week', icon: 'dashboard' },
  { value: 26, suffix: '%', label: 'Win rate lift in eval stages', icon: 'sparkles' },
  { value: 95, suffix: '%', label: 'Citation coverage on AI claims', icon: 'layers' },
] as const;

export const MARQUEE_ITEMS = [
  { text: 'Connect any CRM in 10 minutes', icon: 'layers' },
  { text: 'MEDDPICC with citations', icon: 'sparkles' },
  { text: '10 revenue agents', icon: 'radar' },
  { text: 'Human approval before writes', icon: 'shield' },
  { text: 'POC phases built-in', icon: 'clipboard' },
  { text: 'Buyer portal included', icon: 'users' },
] as const;

export const CRM_LOGO_IDS: IntegrationId[] = ['hubspot', 'salesforce', 'pipedrive', 'zoho'];

export const PRICING_BULLETS = [
  'Custom pricing scaled to your team',
  'Onboarding, CRM migration, and connector setup included',
  'Human approval before any CRM write',
] as const;

export const PRICING_WIZARD = {
  teamSize: [
    { value: '1-10', label: '1–10' },
    { value: '11-50', label: '11–50' },
    { value: '51-200', label: '51–200' },
    { value: '200+', label: '200+' },
  ],
  crm: [
    { value: 'hubspot', label: 'HubSpot' },
    { value: 'pipedrive', label: 'Pipedrive' },
    { value: 'zoho', label: 'Zoho' },
    { value: 'salesforce', label: 'Salesforce' },
    { value: 'other', label: 'Other' },
  ],
  need: [
    { value: 'ai-summary', label: 'AI summary' },
    { value: 'agents', label: 'Agents' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'all', label: 'All' },
  ],
} as const;

export const PRICING_TESTIMONIALS = [
  { quote: 'We finally have deal context that cites Gong and Slack — not hallucinated CRM notes.', name: 'Jordan Lee', title: 'Director of Solutions Engineering' },
  { quote: 'Onboarding HubSpot took one afternoon. Our SEs stopped living in five tabs.', name: 'Priya Shah', title: 'VP Presales' },
  { quote: 'Risk agents catch stalled POCs before leadership asks why.', name: 'Marcus Chen', title: 'RevOps Lead' },
  { quote: 'MEDDPICC summaries with sources changed our QBR conversations.', name: 'Elena Ruiz', title: 'Senior SE Manager' },
  { quote: 'Approval-gated writes mean we trust AI enrichment in Salesforce.', name: 'David Okonkwo', title: 'Head of Sales Engineering' },
  { quote: 'Buyer portal cut email threads on technical evals in half.', name: 'Sarah Kim', title: 'Principal SE' },
  { quote: 'Pipeline view with sentiment badges is what our CRM never gave us.', name: 'Tom Walsh', title: 'CRO' },
  { quote: 'Custom pricing matched our team size — no per-seat sticker shock.', name: 'Anika Patel', title: 'Sales Operations' },
] as const;

export const LANDING_TESTIMONIALS = PRICING_TESTIMONIALS.slice(0, 4);

export const PRODUCT_SECTIONS = [
  {
    slug: 'deals',
    title: 'Deals pipeline',
    description:
      'AI kanban with sentiment, fit scores, and blocker badges — auto-synced from HubSpot, Salesforce, Pipedrive, or Zoho.',
    icon: 'kanban',
    accent: '#6366f1',
  },
  {
    slug: 'ai-summary',
    title: 'AI deal intelligence',
    description:
      'MEDDPICC and deal-health summaries with inline citations to Gong moments, Slack threads, and CRM fields.',
    icon: 'sparkles',
    accent: '#7c3aed',
  },
  {
    slug: 'agents',
    title: 'Revenue agents',
    description:
      'Configure risk monitors in plain language — stalled deals, quiet champions, competitor mentions — with human approval before writes.',
    icon: 'radar',
    accent: '#ef4444',
  },
  {
    slug: 'insights',
    title: 'Insights',
    description:
      'Funnel views, activity hours, POC bottlenecks, and team performance — filterable by rep, team, and stage.',
    icon: 'chart',
    accent: '#3b82f6',
  },
  {
    slug: 'connectors',
    title: 'CRM connectors',
    description:
      'OAuth onboarding for HubSpot, Pipedrive, Zoho CRM, and Salesforce — stage mapping and live pipeline sync in under 10 minutes.',
    icon: 'layers',
    accent: '#14b8a6',
  },
] as const;

export type ProductSectionSlug = (typeof PRODUCT_SECTIONS)[number]['slug'];

export function getProductSection(slug: string) {
  return PRODUCT_SECTIONS.find((section) => section.slug === slug);
}

export const PRODUCT_SECTION_FEATURES: Record<
  ProductSectionSlug,
  readonly { title: string; description: string; icon: string; accent: string }[]
> = {
  deals: [
    {
      title: 'Multi-CRM pipeline sync',
      description:
        'Auto-sync open opportunities from HubSpot, Salesforce, Pipedrive, or Zoho into one AI kanban view.',
      icon: 'kanban',
      accent: '#6366f1',
    },
    {
      title: 'Sentiment, fit, and blockers',
      description:
        'Every card shows deal health badges — stalled signals, fit scores, and blocker counts at a glance.',
      icon: 'radar',
      accent: '#ef4444',
    },
    {
      title: 'Presales-first stages',
      description:
        'POC and eval phases separate from AE pipeline fields — built for solutions engineering workflows.',
      icon: 'clipboard',
      accent: '#14b8a6',
    },
  ],
  'ai-summary': [
    {
      title: 'MEDDPICC with citations',
      description:
        'Deal-health and qualification summaries with inline links to Gong moments, Slack threads, and CRM fields.',
      icon: 'sparkles',
      accent: '#7c3aed',
    },
    {
      title: 'Pre-call briefing packs',
      description:
        'Auto-generated context before every customer call — stakeholders, risks, and recent activity in one view.',
      icon: 'layers',
      accent: '#6366f1',
    },
    {
      title: 'SE→AE handoff packages',
      description:
        'Structured context packages when technical sales passes a deal to account executives — nothing lost in translation.',
      icon: 'users',
      accent: '#f59e0b',
    },
  ],
  agents: [
    {
      title: 'Plain-language monitors',
      description:
        'Configure risk rules in natural language — stalled deals, quiet champions, competitor mentions — no code required.',
      icon: 'radar',
      accent: '#ef4444',
    },
    {
      title: 'Human approval before writes',
      description:
        'Every CRM enrichment and outbound action routes through an approval queue — you stay in control.',
      icon: 'shield',
      accent: '#14b8a6',
    },
    {
      title: 'Slack delivery with evidence',
      description:
        'Agents post alerts with cited evidence and suggested next steps directly in your revenue channels.',
      icon: 'sparkles',
      accent: '#6366f1',
    },
  ],
  insights: [
    {
      title: 'Funnel and pipeline views',
      description:
        'Filterable funnel analytics by rep, team, and stage — see where deals stall in POC and eval phases.',
      icon: 'chart',
      accent: '#3b82f6',
    },
    {
      title: 'Activity breakdown',
      description:
        'Hours by event type — calls, Slack, docs, CRM updates — to diagnose bottlenecks and coaching gaps.',
      icon: 'dashboard',
      accent: '#7c3aed',
    },
    {
      title: 'Team performance insights',
      description:
        'Win/loss patterns, POC completion rates, and specialist routing metrics for SE leaders and RevOps.',
      icon: 'users',
      accent: '#f59e0b',
    },
  ],
  connectors: [
    {
      title: 'OAuth in under 10 minutes',
      description:
        'Guided onboarding for HubSpot, Pipedrive, Zoho CRM, and Salesforce — no middleware or custom scripts.',
      icon: 'layers',
      accent: '#14b8a6',
    },
    {
      title: 'Stage mapping and live sync',
      description:
        'Map CRM stages to presales phases and keep pipeline data current without replacing your system of record.',
      icon: 'kanban',
      accent: '#6366f1',
    },
    {
      title: 'Context from your stack',
      description:
        'Pull Gong calls, Slack threads, calendar events, and docs into one record per deal alongside CRM fields.',
      icon: 'sparkles',
      accent: '#7c3aed',
    },
  ],
};

export const WHY_VALUE_PROPS = [
  {
    title: 'Context layer, not another CRM',
    description:
      'Sit alongside HubSpot, Salesforce, Pipedrive, or Zoho. Pull Slack, Gong, email, and calendar into one record per deal — without replacing your system of record.',
    icon: 'layers',
    accent: '#7c3aed',
  },
  {
    title: 'Cited AI you can trust',
    description:
      'MEDDPICC and deal-health summaries with inline citations to transcripts and messages. Nothing writes back to your CRM without human approval.',
    icon: 'sparkles',
    accent: '#6366f1',
  },
  {
    title: 'Built for presales workflows',
    description:
      'POC phases, SE workbench, buyer portal, and specialist routing — purpose-built for technical sales, not generic AE pipeline fields.',
    icon: 'clipboard',
    accent: '#14b8a6',
  },
  {
    title: 'Agents that watch your pipeline',
    description:
      'Configure risk monitors in plain language — stalled deals, quiet champions, competitor mentions — with evidence and next steps in Slack.',
    icon: 'radar',
    accent: '#ef4444',
  },
] as const;

export const BLOG_POSTS = [
  {
    slug: 'unified-deal-context',
    title: 'Why unified deal context beats another CRM field',
    date: 'September 5, 2026',
    excerpt:
      'Technical sellers lose hours jumping between Slack, Gong, and CRM updates. Here is how a context layer changes the presales workflow.',
    body: [
      'Every presales leader has seen the same pattern: a deal looks healthy in the CRM, but the Slack thread tells a different story. Gong captured the objection. Calendar notes from the SE never made it into HubSpot. By the time leadership asks for a MEDDPICC update, someone is rebuilding context from five tabs.',
      'Adding another custom field does not fix this. Fields capture snapshots; they do not connect signals. A context layer sits alongside your CRM and merges CRM stages, conversation transcripts, chat threads, and calendar activity into one cited record per opportunity.',
      'When summaries link back to source moments — a Gong clip, a Slack message, a CRM field change — sellers trust the AI output and spend less time in “context archaeology.” RevOps keeps the CRM as the system of record while SEs work from a single presales workbench.',
      'Teams adopting this model report shorter handoffs between SE and AE, faster QBR prep, and fewer surprises in late-stage evals. The win is not more data entry; it is one trustworthy view of why the deal is moving — or stalling.',
    ],
  },
  {
    slug: 'event-triggered-agents',
    title: 'Event-triggered agents: POC kickoff when a deal advances',
    date: 'August 28, 2026',
    excerpt:
      'Stage-change automations can draft kickoff plans, tasks, and stakeholder summaries — with human approval before anything writes back.',
    body: [
      'Stage changes are high-leverage moments. A deal moving into technical evaluation should trigger more than a CRM timestamp — it should kick off a POC plan, stakeholder map, and task list aligned to your presales playbook.',
      'Event-triggered agents listen for domain events such as `deal.stage_changed` or `evaluation.started`. When criteria match, they draft artifacts: kickoff email outlines, Jira tasks, internal Slack briefs, and suggested CRM field updates — each with citations to recent calls and threads.',
      'The critical guardrail is human approval. Nothing writes back to HubSpot, Salesforce, or Slack until a seller reviews the proposed actions. That keeps automation fast without sacrificing accountability or compliance.',
      'Start with one workflow — for example, POC kickoff when a deal enters your eval stage — measure time-to-first-customer-touch, then expand to risk monitors and renewal prep. Plain-language rules and approval queues make agents operable for RevOps without a custom integration project.',
    ],
  },
] as const;

export type BlogPostSlug = (typeof BLOG_POSTS)[number]['slug'];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
