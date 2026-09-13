'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Pencil, Play, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { agentCategoryBadge, agentRunStatusBadge } from '@/lib/ui-badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';

type Agent = {
  id: string;
  name: string;
  templateSlug: string | null;
  category: string;
  isActive: boolean;
  enabled: boolean;
};

function agentIsActive(agent: { enabled?: boolean; isActive?: boolean }) {
  return Boolean(agent.enabled ?? agent.isActive);
}

type Template = { slug: string; name: string; category: string; description: string };

type Run = {
  id: string;
  agentId: string;
  agentName: string | null;
  status: string;
  creditsUsed: number;
  createdAt: string;
  error?: string | null;
};

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    const token = getToken();
    if (!token || !agentId) return;

    Promise.all([
      apiGet<{ agent: Agent }>(`/agents/${agentId}`, token),
      apiGet<{ templates: Template[] }>('/agents/templates', token),
      apiGet<{ runs: Run[] }>(`/agent-runs?agentId=${encodeURIComponent(agentId)}`, token),
    ])
      .then(([agentRes, templatesRes, runsRes]) => {
        setAgent(agentRes.agent);
        setRuns(runsRes.runs);
        const match = templatesRes.templates.find(
          (t) => t.slug === agentRes.agent.templateSlug,
        );
        setTemplate(match ?? null);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load agent'));
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleEnabled(checked: boolean) {
    const token = getToken();
    if (!token || !agent || !agentId) return;
    setToggling(true);
    try {
      const { agent: updated } = await apiPatch<{ agent: Agent }>(
        `/agents/${agentId}`,
        token,
        { enabled: checked },
      );
      setAgent(updated);
      toast(checked ? 'Agent enabled' : 'Agent disabled', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update agent', 'error');
    } finally {
      setToggling(false);
    }
  }

  async function pollRunStatus(runId: string, token: string) {
    const terminal = new Set(['completed', 'failed', 'awaiting_approval', 'skipped']);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const { run } = await apiGet<{ run: Run }>(`/agent-runs/${runId}`, token);
      setRuns((prev) => {
        const idx = prev.findIndex((r) => r.id === runId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...run };
          return next;
        }
        return [run, ...prev];
      });
      if (terminal.has(run.status)) {
        load();
        if (run.status === 'completed') toast('Agent run completed', 'success');
        else if (run.status === 'awaiting_approval') toast('Approvals created — review in Approvals', 'success');
        else if (run.status === 'failed') toast(run.error ?? 'Agent run failed', 'error');
        return;
      }
    }
    load();
  }

  async function runAgent() {
    const token = getToken();
    if (!token || !agentId || !agent) return;
    setRunning(true);
    try {
      const { run } = await apiPost<{ run: { id: string; status: string } }>(
        `/agents/${agentId}/run`,
        token,
        { scope: {} },
      );
      setRuns((prev) => [
        {
          id: run.id,
          agentId,
          agentName: agent.name,
          status: run.status,
          creditsUsed: 0,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast('Agent run started', 'success');
      void pollRunStatus(run.id, token);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start run', 'error');
    } finally {
      setRunning(false);
    }
  }

  async function deleteAgent() {
    const token = getToken();
    if (!token || !agentId) return;
    if (!window.confirm('Disable this agent? It will no longer run on schedules or events.')) return;
    setDeleting(true);
    try {
      await apiDelete(`/agents/${agentId}`, token);
      toast('Agent disabled', 'success');
      router.push('/agents');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete agent', 'error');
      setDeleting(false);
    }
  }

  if (!agent && !error) return <PageSkeleton />;

  if (error || !agent) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="text-foreground">
          <Link href="/agents" className="text-foreground">
            <ArrowLeft className="size-4" />
            Back to agents
          </Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Bot className="size-6" />
            </div>
            <CardTitle>Agent not found</CardTitle>
            <CardDescription>{error ?? 'This agent may have been removed.'}</CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const templateLabel = template?.name ?? agent.templateSlug ?? 'Custom';

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Button variant="ghost" size="icon-sm" asChild className="text-foreground">
            <Link href="/agents" className="text-foreground">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
        title={agent.name}
        subtitle={templateLabel}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Switch
                id="agent-enabled"
                checked={agentIsActive(agent)}
                disabled={toggling}
                onCheckedChange={toggleEnabled}
              />
              <Label htmlFor="agent-enabled">{agentIsActive(agent) ? 'Enabled' : 'Disabled'}</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="w-full text-foreground sm:w-auto"
            >
              <Link href={`/agents/new?agentId=${encodeURIComponent(agent.id)}`} className="text-foreground">
                <Pencil className="size-3.5" />
                Edit
              </Link>
            </Button>
            <Button
              size="sm"
              disabled={running || !agentIsActive(agent)}
              onClick={runAgent}
              className="w-full text-primary-foreground sm:w-auto"
            >
              <Play className="size-3.5" />
              Run
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={deleting}
              onClick={deleteAgent}
              className="w-full text-foreground sm:w-auto"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge
          variant={agentCategoryBadge(agent.category)}
          className={agentCategoryBadge(agent.category) === 'default' ? 'text-primary-foreground' : 'text-foreground'}
        >
          {agent.category}
        </Badge>
        <Badge
          variant={agentIsActive(agent) ? 'default' : 'outline'}
          className={agentIsActive(agent) ? 'text-primary-foreground' : 'text-foreground'}
        >
          {agentIsActive(agent) ? 'Active' : 'Inactive'}
        </Badge>
        {template && <Badge variant="outline" className="text-foreground">{template.slug}</Badge>}
      </div>

      {template?.description && (
        <Card className="mb-6">
          <CardContent>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-[0.9375rem] font-bold">Run history</h2>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Bot className="size-6" />
            </div>
            <CardTitle>No runs yet</CardTitle>
            <CardDescription>Run this agent to see execution history here.</CardDescription>
            <Button size="sm" disabled={!agentIsActive(agent)} onClick={runAgent} className="text-primary-foreground">
              <Play className="size-3.5" />
              Run agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge
                      variant={agentRunStatusBadge(r.status)}
                      className={agentRunStatusBadge(r.status) === 'default' ? 'text-primary-foreground' : 'text-foreground'}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{r.creditsUsed}</TableCell>
                  <TableCell className="text-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
