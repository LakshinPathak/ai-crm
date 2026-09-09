'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bot, Check, Circle, Sparkles } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/Toast';

type Template = { slug: string; name: string; category: string; description: string };
type TriggerType = 'schedule' | 'event' | 'manual' | 'webhook';

type WizardState = {
  name: string;
  templateSlug: string;
  category: string;
  triggerType: TriggerType;
  schedule: string;
  event: string;
  systemPrompt: string;
  tools: string[];
  skills: string[];
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
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<WizardState>({
    name: '',
    templateSlug: templateParam,
    category: 'process',
    triggerType: 'manual',
    schedule: '0 8 * * *',
    event: 'activity.ingested',
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
        };
      };
    }>(`/agents/${editAgentId}`, token);

    const trigger = agent.config.triggerConfig;
    const toolsCfg = agent.config.toolsConfig;
    setForm({
      name: agent.name,
      templateSlug: agent.templateSlug ?? '',
      category: agent.category,
      triggerType: (trigger.type as TriggerType) ?? 'manual',
      schedule: typeof trigger.schedule === 'string' ? trigger.schedule : '0 8 * * *',
      event: typeof trigger.event === 'string' ? trigger.event : 'activity.ingested',
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

    return { triggerConfig, toolsConfig };
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
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_280px]">
        <nav className="space-y-1" aria-label="Wizard steps">
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? 'bg-muted font-medium' : done ? 'text-foreground hover:bg-muted/50' : 'text-muted-foreground'
                }`}
              >
                <StepIcon done={done} active={active} />
                <span>{label}</span>
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

          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              disabled={step <= 1 || loading}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
            {step < 5 ? (
              <Button disabled={loading} onClick={() => persistProgress(step + 1)}>
                {loading ? 'Saving…' : 'Continue'}
              </Button>
            ) : (
              <Button disabled={loading} onClick={finish}>
                {loading ? 'Creating…' : agentId ? 'Save agent' : 'Create agent'}
              </Button>
            )}
          </div>
        </div>

        <Card className="hidden h-fit lg:block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Want help getting started?
            </CardTitle>
            <CardDescription>
              Describe what you want this agent to do in plain language. NL drafting ships in a later release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g. Every morning, scan my open deals and Slack me the top 5 that need attention…"
              rows={6}
              disabled
              className="text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: pick a template on step 1 to pre-fill category and description.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
