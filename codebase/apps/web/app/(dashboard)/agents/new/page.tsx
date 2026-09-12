'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bot, Check, Circle, Sparkles } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { agentCategoryBadge } from '@/lib/ui-badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/Toast';

type Template = { slug: string; name: string; category: string; description: string };
type TriggerType = 'schedule' | 'event' | 'manual' | 'webhook';
type DeliveryProvider = 'slack' | 'google_chat' | 'teams';
type DeliveryMode = 'dm' | 'channel';
type ChatChannel = { id: string; name: string };

const CHANNEL_NONE = '__none__';

function channelIdPlaceholder(provider: DeliveryProvider): string {
  if (provider === 'teams') {
    return 'teamId/channelId or teams/{id}/channels/{id}';
  }
  if (provider === 'google_chat') {
    return 'spaces/{spaceId}';
  }
  return 'e.g. C0123456789 or #pipeline';
}

type WizardState = {
  name: string;
  templateSlug: string;
  category: string;
  triggerType: TriggerType;
  schedule: string;
  event: string;
  deliverEnabled: boolean;
  deliveryProvider: DeliveryProvider;
  deliveryMode: DeliveryMode;
  deliveryChannelId: string;
  deliveryDmUserId: string;
  systemPrompt: string;
  tools: string[];
  skills: string[];
  aiSuggested?: boolean;
  draftConfidence?: number;
};

type DraftAgentResponse = {
  draft: {
    name: string;
    templateSlug: string;
    category: string;
    triggerType: TriggerType;
    schedule: string | null;
    event: string | null;
    systemPrompt: string;
    tools: string[];
    skills: string[];
    confidence?: number;
    reasoning?: string;
  };
};

const STEPS = ['Basics', 'Trigger', 'Prompt', 'Tools & Skills', 'Review'] as const;

const TOOL_OPTIONS = [
  { id: 'crm_get_deal_status', label: 'CRM deal lookup', description: 'Read deal fields and stage from CRM' },
  { id: 'search_artifacts', label: 'Search artifacts', description: 'Semantic search over notes, calls, and docs' },
  { id: 'get_artifact_excerpt', label: 'Artifact excerpts', description: 'Pull cited excerpts for grounding' },
  { id: 'propose_field_update', label: 'Propose CRM updates', description: 'Draft field changes for approval' },
] as const;

const SKILL_OPTIONS = [
  { id: 'meddpicc', label: 'MEDDPICC synthesis', description: 'Qualification letter extraction' },
  { id: 'risk_scoring', label: 'Risk scoring', description: 'Rules + LLM risk classification' },
  { id: 'email_draft', label: 'Email drafting', description: 'Follow-up and recap emails' },
  { id: 'slack_delivery', label: 'Chat delivery', description: 'Send summaries to Slack or Teams' },
] as const;

const EVENT_OPTIONS = [
  { value: 'activity.ingested', label: 'Activity ingested' },
  { value: 'deal.stage_changed', label: 'Deal stage changed' },
  { value: 'deal.closed', label: 'Deal closed' },
];

const SCHEDULE_PRESETS = [
  { value: '0 8 * * *', label: 'Daily at 8:00 AM' },
  { value: '0 8 * * 1', label: 'Weekly on Monday at 8:00 AM' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
];

function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong';
  if (err instanceof ApiError) {
    try {
      const parsed = JSON.parse(err.message) as {
        error?: { code?: string; message?: string; questions?: string[] };
      };
      if (parsed.error?.code === 'NEEDS_CLARIFICATION' && parsed.error.questions?.length) {
        return `${parsed.error.message ?? 'Need more detail'}: ${parsed.error.questions.join(' ')}`;
      }
      return parsed.error?.message ?? err.message;
    } catch {
      return err.message;
    }
  }
  try {
    const parsed = JSON.parse(err.message) as { error?: { message?: string } };
    return parsed.error?.message ?? err.message;
  } catch {
    return err.message;
  }
}

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <Check className="size-4 text-primary" />;
  if (active) return <Circle className="size-4 fill-primary text-primary" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const editAgentId = searchParams.get('agentId');
  const templateParam = searchParams.get('template') ?? '';

  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agentId, setAgentId] = useState<string | null>(editAgentId);
  const [loading, setLoading] = useState(false);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlDescription, setNlDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [channelOptions, setChannelOptions] = useState<ChatChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsFailed, setChannelsFailed] = useState(false);

  const [form, setForm] = useState<WizardState>({
    name: '',
    templateSlug: templateParam,
    category: 'process',
    triggerType: 'manual',
    schedule: '0 8 * * *',
    event: 'activity.ingested',
    deliverEnabled: false,
    deliveryProvider: 'slack',
    deliveryMode: 'dm',
    deliveryChannelId: '',
    deliveryDmUserId: '',
    systemPrompt: '',
    tools: [],
    skills: [],
  });

  const loadTemplates = useCallback(() => {
    const token = getToken();
    if (!token) return;
    apiGet<{ templates: Template[] }>('/agents/templates', token).then((res) => {
      setTemplates(res.templates);
    });
  }, []);

  const loadAgent = useCallback(async () => {
    const token = getToken();
    if (!token || !editAgentId) return;
    const { agent } = await apiGet<{
      agent: {
        name: string;
        templateSlug: string | null;
        category: string;
        config: {
          triggerConfig: Record<string, unknown>;
          toolsConfig: Record<string, unknown>;
          deliveryConfig: Record<string, unknown> | null;
        };
      };
    }>(`/agents/${editAgentId}`, token);

    const trigger = agent.config.triggerConfig;
    const toolsCfg = agent.config.toolsConfig;
    const delivery = agent.config.deliveryConfig;
    setForm({
      name: agent.name,
      templateSlug: agent.templateSlug ?? '',
      category: agent.category,
      triggerType: (trigger.type as TriggerType) ?? 'manual',
      schedule: typeof trigger.schedule === 'string' ? trigger.schedule : '0 8 * * *',
      event: typeof trigger.event === 'string' ? trigger.event : 'activity.ingested',
      deliverEnabled: delivery != null,
      deliveryProvider:
        delivery?.provider === 'google_chat' || delivery?.provider === 'teams'
          ? delivery.provider
          : 'slack',
      deliveryMode: delivery?.mode === 'channel' ? 'channel' : 'dm',
      deliveryChannelId: typeof delivery?.channelId === 'string' ? delivery.channelId : '',
      deliveryDmUserId: typeof delivery?.dmUserId === 'string' ? delivery.dmUserId : '',
      systemPrompt: typeof toolsCfg.systemPrompt === 'string' ? toolsCfg.systemPrompt : '',
      tools: Array.isArray(toolsCfg.tools) ? (toolsCfg.tools as string[]) : [],
      skills: Array.isArray(toolsCfg.skills) ? (toolsCfg.skills as string[]) : [],
    });
    setAgentId(editAgentId);
  }, [editAgentId]);

  useEffect(() => {
    loadTemplates();
    if (editAgentId) void loadAgent().catch((e) => setError(parseApiError(e)));
  }, [loadTemplates, loadAgent, editAgentId]);

  useEffect(() => {
    if (!form.deliverEnabled || form.deliveryMode !== 'channel') {
      return;
    }
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setChannelsLoading(true);
    setChannelsFailed(false);
    setChannelOptions([]);

    apiGet<{ channels: ChatChannel[] }>(
      `/integrations/chat/${form.deliveryProvider}/channels`,
      token,
    )
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.channels)
          ? res.channels.filter((c): c is ChatChannel => Boolean(c?.id && c?.name))
          : [];
        setChannelOptions(list);
      })
      .catch(() => {
        if (cancelled) return;
        setChannelsFailed(true);
        setChannelOptions([]);
      })
      .finally(() => {
        if (!cancelled) setChannelsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.deliverEnabled, form.deliveryMode, form.deliveryProvider]);

  useEffect(() => {
    if (!templateParam || editAgentId) return;
    const t = templates.find((x) => x.slug === templateParam);
    if (t) {
      setForm((prev) => ({
        ...prev,
        templateSlug: t.slug,
        name: prev.name || t.name,
        category: t.category,
      }));
    }
  }, [templateParam, templates, editAgentId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.slug === form.templateSlug) ?? null,
    [templates, form.templateSlug],
  );

  function buildConfig() {
    const triggerConfig: Record<string, unknown> = { type: form.triggerType };
    if (form.triggerType === 'schedule') triggerConfig.schedule = form.schedule;
    if (form.triggerType === 'event') triggerConfig.event = form.event;

    const toolsConfig: Record<string, unknown> = {};
    if (form.systemPrompt.trim()) toolsConfig.systemPrompt = form.systemPrompt.trim();
    if (form.tools.length) toolsConfig.tools = form.tools;
    if (form.skills.length) toolsConfig.skills = form.skills;

    const config: Record<string, unknown> = { triggerConfig, toolsConfig };
    if (form.deliverEnabled) {
      const deliveryConfig: Record<string, unknown> = {
        provider: form.deliveryProvider,
        mode: form.deliveryMode,
      };
      if (form.deliveryMode === 'channel' && form.deliveryChannelId.trim()) {
        deliveryConfig.channelId = form.deliveryChannelId.trim();
      }
      if (form.deliveryMode === 'dm' && form.deliveryDmUserId.trim()) {
        deliveryConfig.dmUserId = form.deliveryDmUserId.trim();
      }
      config.deliveryConfig = deliveryConfig;
    } else {
      config.deliveryConfig = null;
    }

    return config;
  }

  function buildCreatePayload() {
    return {
      name: form.name.trim(),
      ...(form.templateSlug ? { templateSlug: form.templateSlug } : {}),
      category: form.category,
      config: buildConfig(),
    };
  }

  function buildUpdatePayload() {
    return {
      name: form.name.trim(),
      category: form.category,
      config: buildConfig(),
    };
  }

  function validateStep(current: number): string | null {
    if (current === 1 && !form.name.trim()) return 'Agent name is required';
    if (current === 3 && !form.systemPrompt.trim()) return 'System prompt is required';
    return null;
  }

  async function persistProgress(nextStep: number) {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      if (agentId) {
        await apiPatch(`/agents/${agentId}`, token, buildUpdatePayload());
      } else if (step === 1 && nextStep > 1) {
        const { agent } = await apiPost<{ agent: { id: string } }>('/agents', token, buildCreatePayload());
        setAgentId(agent.id);
      } else if (nextStep > step) {
        const { agent } = await apiPost<{ agent: { id: string } }>('/agents', token, buildCreatePayload());
        setAgentId(agent.id);
      }

      setStep(nextStep);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    const validationError = validateStep(1) ?? validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      if (agentId) {
        await apiPatch(`/agents/${agentId}`, token, buildUpdatePayload());
        toast('Agent updated', 'success');
        router.push(`/agents/${agentId}`);
      } else {
        const { agent } = await apiPost<{ agent: { id: string } }>('/agents', token, buildCreatePayload());
        toast('Agent created', 'success');
        router.push(`/agents/${agent.id}`);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleList(key: 'tools' | 'skills', id: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      [key]: checked ? [...prev[key], id] : prev[key].filter((x) => x !== id),
    }));
  }

  async function handleNlDraft() {
    const description = nlDescription.trim();
    if (description.length < 10) {
      toast('Describe your agent in at least 10 characters', 'error');
      return;
    }

    const token = getToken();
    if (!token) return;

    setNlLoading(true);
    setError(null);

    try {
      const { draft } = await apiPost<DraftAgentResponse>('/agents/draft-from-nl', token, { description });
      setForm((prev) => ({
        ...prev,
        name: draft.name,
        templateSlug: draft.templateSlug,
        category: draft.category,
        triggerType: draft.triggerType,
        schedule: draft.schedule ?? SCHEDULE_PRESETS[0].value,
        event: draft.event ?? EVENT_OPTIONS[0].value,
        systemPrompt: draft.systemPrompt,
        tools: draft.tools,
        skills: draft.skills,
        deliverEnabled: draft.skills.includes('slack_delivery'),
        aiSuggested: true,
        draftConfidence: draft.confidence,
      }));
      setStep(1);
      toast('Agent draft ready — review each step', 'success');
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      toast(message, 'error');
    } finally {
      setNlLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/agents">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
        title={agentId ? 'Edit agent' : 'New agent'}
        subtitle="Configure triggers, prompt, and tools in five steps"
        actions={
          form.aiSuggested ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              AI suggested — review before saving
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_280px]">
        <nav
          className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:space-y-1 lg:overflow-visible lg:pb-0"
          aria-label="Wizard steps"
        >
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const done = n < step;
            const active = n === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => n < step && setStep(n)}
                disabled={n > step}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:w-full lg:gap-3 ${
                  active ? 'bg-muted font-medium' : done ? 'text-foreground hover:bg-muted/50' : 'text-muted-foreground'
                }`}
              >
                <StepIcon done={done} active={active} />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-4">
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basics</CardTitle>
                <CardDescription>Name your agent and optionally start from a template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent name</Label>
                  <Input
                    id="agent-name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Post-call follow-up"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Template (optional)</Label>
                  <Select
                    value={form.templateSlug || '__none__'}
                    onValueChange={(v) => {
                      const slug = v === '__none__' ? '' : v;
                      const t = templates.find((x) => x.slug === slug);
                      setForm((p) => ({
                        ...p,
                        templateSlug: slug,
                        category: t?.category ?? p.category,
                        name: p.name || t?.name || p.name,
                      }));
                    }}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Custom agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Custom agent</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="signals">Signals</SelectItem>
                      <SelectItem value="reporting">Reporting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Trigger</CardTitle>
                <CardDescription>Choose when this agent should run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={form.triggerType}
                  onValueChange={(v) => setForm((p) => ({ ...p, triggerType: v as TriggerType }))}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="manual" id="trigger-manual" className="mt-0.5" />
                    <div>
                      <Label htmlFor="trigger-manual" className="font-medium">Manual</Label>
                      <p className="text-sm text-muted-foreground">Run on demand from the agents dashboard.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="schedule" id="trigger-schedule" className="mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="trigger-schedule" className="font-medium">Schedule</Label>
                      <p className="text-sm text-muted-foreground">Run on a recurring cron schedule.</p>
                      {form.triggerType === 'schedule' && (
                        <Select
                          value={form.schedule}
                          onValueChange={(v) => setForm((p) => ({ ...p, schedule: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEDULE_PRESETS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="event" id="trigger-event" className="mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="trigger-event" className="font-medium">Event</Label>
                      <p className="text-sm text-muted-foreground">Run when a domain event fires.</p>
                      {form.triggerType === 'event' && (
                        <Select
                          value={form.event}
                          onValueChange={(v) => setForm((p) => ({ ...p, event: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_OPTIONS.map((e) => (
                              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="webhook" id="trigger-webhook" className="mt-0.5" />
                    <div>
                      <Label htmlFor="trigger-webhook" className="font-medium">Webhook</Label>
                      <p className="text-sm text-muted-foreground">
                        Expose an inbound webhook URL after creation (configure in agent settings).
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                <Separator />

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <Label htmlFor="deliver-enabled" className="font-medium">Deliver results to chat</Label>
                      <p className="text-sm text-muted-foreground">
                        Send agent output to Slack, Google Chat, or Teams after each run.
                      </p>
                    </div>
                    <Switch
                      id="deliver-enabled"
                      checked={form.deliverEnabled}
                      onCheckedChange={(checked) => setForm((p) => ({ ...p, deliverEnabled: checked }))}
                      className="shrink-0 self-start sm:self-center"
                    />
                  </div>

                  {form.deliverEnabled && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="space-y-2">
                        <Label htmlFor="delivery-provider">Provider</Label>
                        <Select
                          value={form.deliveryProvider}
                          onValueChange={(v) => setForm((p) => ({ ...p, deliveryProvider: v as DeliveryProvider }))}
                        >
                          <SelectTrigger id="delivery-provider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slack">Slack</SelectItem>
                            <SelectItem value="google_chat">Google Chat</SelectItem>
                            <SelectItem value="teams">Microsoft Teams</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delivery-mode">Mode</Label>
                        <Select
                          value={form.deliveryMode}
                          onValueChange={(v) => setForm((p) => ({ ...p, deliveryMode: v as DeliveryMode }))}
                        >
                          <SelectTrigger id="delivery-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dm">DM</SelectItem>
                            <SelectItem value="channel">Channel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.deliveryMode === 'dm' && form.deliveryProvider === 'slack' && (
                        <div className="space-y-2">
                          <Label htmlFor="delivery-dm-user-id">Slack user ID</Label>
                          <Input
                            id="delivery-dm-user-id"
                            value={form.deliveryDmUserId}
                            onChange={(e) => setForm((p) => ({ ...p, deliveryDmUserId: e.target.value }))}
                            placeholder="e.g. U0123456789"
                          />
                          <p className="text-xs text-muted-foreground">
                            Member ID from Slack profile — used to open a DM for agent output.
                          </p>
                        </div>
                      )}
                      {form.deliveryMode === 'channel' && (
                        <div className="space-y-2">
                          <Label htmlFor="delivery-channel-id">Channel (optional)</Label>
                          {channelsLoading && (
                            <p className="text-xs text-muted-foreground">Loading channels…</p>
                          )}
                          {!channelsLoading && channelOptions.length > 0 ? (
                            <Select
                              value={form.deliveryChannelId || CHANNEL_NONE}
                              onValueChange={(v) =>
                                setForm((p) => ({
                                  ...p,
                                  deliveryChannelId: v === CHANNEL_NONE ? '' : v,
                                }))
                              }
                            >
                              <SelectTrigger id="delivery-channel-id">
                                <SelectValue placeholder="Select a channel" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={CHANNEL_NONE}>None</SelectItem>
                                {form.deliveryChannelId &&
                                  !channelOptions.some((c) => c.id === form.deliveryChannelId) && (
                                    <SelectItem value={form.deliveryChannelId}>
                                      {form.deliveryChannelId}
                                    </SelectItem>
                                  )}
                                {channelOptions.map((channel) => (
                                  <SelectItem key={channel.id} value={channel.id}>
                                    {form.deliveryProvider === 'slack' ? `#${channel.name}` : channel.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <>
                              <Input
                                id="delivery-channel-id"
                                value={form.deliveryChannelId}
                                onChange={(e) => setForm((p) => ({ ...p, deliveryChannelId: e.target.value }))}
                                placeholder={channelIdPlaceholder(form.deliveryProvider)}
                              />
                              {!channelsLoading && (
                                <p className="text-xs text-muted-foreground">
                                  {channelsFailed
                                    ? 'Could not load channels — paste a channel ID instead.'
                                    : 'No channels found — paste a channel ID.'}
                                  {form.deliveryProvider === 'teams'
                                    ? ' Teams: teamId/channelId or teams/{id}/channels/{id}.'
                                    : ''}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Prompt</CardTitle>
                <CardDescription>System instructions that guide the agent&apos;s behavior.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System prompt</Label>
                  <Textarea
                    id="system-prompt"
                    value={form.systemPrompt}
                    onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                    placeholder="You are a presales assistant. Analyze the deal context and..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Tools &amp; Skills</CardTitle>
                <CardDescription>Select capabilities this agent can use during runs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Tools</h3>
                  {TOOL_OPTIONS.map((tool) => (
                    <div key={tool.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        id={`tool-${tool.id}`}
                        checked={form.tools.includes(tool.id)}
                        onCheckedChange={(c) => toggleList('tools', tool.id, c === true)}
                      />
                      <div>
                        <Label htmlFor={`tool-${tool.id}`} className="font-medium">{tool.label}</Label>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Skills</h3>
                  {SKILL_OPTIONS.map((skill) => (
                    <div key={skill.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        id={`skill-${skill.id}`}
                        checked={form.skills.includes(skill.id)}
                        onCheckedChange={(c) => toggleList('skills', skill.id, c === true)}
                      />
                      <div>
                        <Label htmlFor={`skill-${skill.id}`} className="font-medium">{skill.label}</Label>
                        <p className="text-sm text-muted-foreground">{skill.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Review</CardTitle>
                <CardDescription>Confirm settings before {agentId ? 'saving' : 'creating'} your agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-muted-foreground" />
                  <span className="font-medium">{form.name}</span>
                  <Badge variant={agentCategoryBadge(form.category)}>{form.category}</Badge>
                </div>
                {selectedTemplate && (
                  <p className="text-muted-foreground">Template: {selectedTemplate.name}</p>
                )}
                <Separator />
                <div>
                  <p className="font-medium">Trigger</p>
                  <p className="text-muted-foreground capitalize">
                    {form.triggerType}
                    {form.triggerType === 'schedule' && ` — ${SCHEDULE_PRESETS.find((s) => s.value === form.schedule)?.label ?? form.schedule}`}
                    {form.triggerType === 'event' && ` — ${EVENT_OPTIONS.find((e) => e.value === form.event)?.label ?? form.event}`}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Chat delivery</p>
                  <p className="text-muted-foreground">
                    {form.deliverEnabled
                      ? `${form.deliveryProvider.replace('_', ' ')} — ${form.deliveryMode}${
                          form.deliveryMode === 'channel' && form.deliveryChannelId
                            ? ` (${form.deliveryChannelId})`
                            : form.deliveryMode === 'dm' && form.deliveryDmUserId
                              ? ` (user ${form.deliveryDmUserId})`
                              : ''
                        }`
                      : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">System prompt</p>
                  <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">{form.systemPrompt || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 font-medium">Tools</p>
                  <div className="flex flex-wrap gap-1">
                    {form.tools.length
                      ? form.tools.map((id) => (
                          <Badge key={id} variant="secondary">{TOOL_OPTIONS.find((t) => t.id === id)?.label ?? id}</Badge>
                        ))
                      : <span className="text-muted-foreground">None selected</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-1 font-medium">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {form.skills.length
                      ? form.skills.map((id) => (
                          <Badge key={id} variant="secondary">{SKILL_OPTIONS.find((s) => s.id === id)?.label ?? id}</Badge>
                        ))
                      : <span className="text-muted-foreground">None selected</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              disabled={step <= 1 || loading}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            {step < 5 ? (
              <Button disabled={loading} onClick={() => persistProgress(step + 1)} className="w-full sm:w-auto">
                {loading ? 'Saving…' : 'Continue'}
              </Button>
            ) : (
              <Button disabled={loading} onClick={finish} className="w-full sm:w-auto">
                {loading ? 'Creating…' : agentId ? 'Save agent' : 'Create agent'}
              </Button>
            )}
          </div>
        </div>

        <Card className="h-fit lg:order-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Describe your agent
            </CardTitle>
            <CardDescription>
              Enter plain language and we&apos;ll pre-fill the wizard. Review each step before creating.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={nlDescription}
              onChange={(e) => setNlDescription(e.target.value)}
              placeholder="e.g. Every morning, scan my open deals and Slack me the top 5 that need attention…"
              rows={6}
              disabled={nlLoading || Boolean(editAgentId)}
              className="text-sm"
            />
            {form.draftConfidence !== undefined && form.draftConfidence < 0.7 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Low confidence ({Math.round(form.draftConfidence * 100)}%) — double-check trigger and tools.
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={nlLoading || nlDescription.trim().length < 10 || Boolean(editAgentId)}
              onClick={() => void handleNlDraft()}
            >
              {nlLoading ? 'Generating…' : 'Generate'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Tip: pick a template on step 1 to pre-fill category and description.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
