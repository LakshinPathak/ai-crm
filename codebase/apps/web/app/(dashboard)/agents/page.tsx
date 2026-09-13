'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Plus, Search, Wand2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { agentCategoryBadge, agentRunStatusBadge } from '@/lib/ui-badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/components/ui/Toast';
import { PageSkeleton } from '@/components/ui/page-skeleton';

type Agent = {
  id: string;
  name: string;
  templateSlug: string;
  category: string;
  isActive: boolean;
  enabled?: boolean;
  ownerId?: string;
};

function agentIsActive(agent: { enabled?: boolean; isActive?: boolean }) {
  return Boolean(agent.enabled ?? agent.isActive);
}
type Template = { slug: string; name: string; category: string; description: string };
type Run = {
  id: string;
  agentName: string | null;
  status: string;
  creditsUsed: number;
  createdAt: string;
  output?: Record<string, unknown> | null;
  error?: string | null;
};
type Stats = { activeAgents: number; totalAgents: number; runsToday: number; runs30d: number; creditsUsed30d: number };

const PAGE_SIZE = 10;

const TEMPLATE_CATEGORIES = [
  { key: 'process', label: 'Process' },
  { key: 'risk', label: 'Risk' },
  { key: 'signals', label: 'Signals' },
  { key: 'reporting', label: 'Reporting' },
] as const;

export default function AgentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meId, setMeId] = useState('');
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Record<string, true>>({});

  function load() {
    const token = getToken();
    if (!token) {
      setLoaded(true);
      return;
    }
    Promise.all([
      apiGet<{ agents: Agent[] }>('/agents', token),
      apiGet<{ templates: Template[] }>('/agents/templates', token),
      apiGet<{ runs: Run[] }>('/agent-runs', token),
      apiGet<Stats>('/agents/stats', token),
      apiGet<{ user: { id: string } }>('/me', token),
    ]).then(([a, t, r, s, me]) => {
      setAgents(a.agents);
      setTemplates(t.templates);
      setRuns(r.runs);
      setStats(s);
      setMeId(me.user.id);
      setError(null);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load agents');
    }).finally(() => setLoaded(true));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = agents;
    if (filter === 'mine') list = list.filter((a) => a.ownerId === meId || !a.ownerId);
    if (search) list = list.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [agents, filter, search, meId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function selectTemplate(slug: string) {
    setShowTemplates(false);
    router.push(`/agents/new?template=${slug}`);
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
          next[idx] = { ...next[idx], ...run, agentName: run.agentName ?? next[idx].agentName };
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

  async function runAgent(agentId: string) {
    const token = getToken();
    if (!token || runningIds[agentId]) return;
    setRunningIds((prev) => ({ ...prev, [agentId]: true }));
    try {
      const { run } = await apiPost<{ run: { id: string; status: string } }>(
        `/agents/${agentId}/run`,
        token,
        { scope: {} },
      );
      const agent = agents.find((a) => a.id === agentId);
      setRuns((prev) => [
        { id: run.id, agentName: agent?.name ?? 'Agent', status: run.status, creditsUsed: 0, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      toast('Agent run started', 'success');
      void pollRunStatus(run.id, token);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start run', 'error');
    } finally {
      setRunningIds((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
    }
  }

  const inactiveCount = (stats?.totalAgents ?? agents.length) - (stats?.activeAgents ?? 0);
  const activePct = stats && stats.totalAgents > 0 ? Math.round((stats.activeAgents / stats.totalAgents) * 100) : 0;

  if (!loaded) return <PageSkeleton />;

  if (error) {
    return (
      <div>
        <PageHeader title="Agents" subtitle="Automate deal workflows with AI agents" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Bot className="size-6" />
            </div>
            <CardTitle>Could not load agents</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="Automate deal workflows with AI agents"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search agents…"
                className="w-full pl-8 sm:w-48"
              />
            </div>
            <Button size="sm" variant="outline" asChild className="flex-1 text-foreground sm:flex-none">
              <Link href="/agents/new" className="text-foreground">
                <Wand2 className="size-3.5" />
                New agent
              </Link>
            </Button>
            <Button size="sm" onClick={() => setShowTemplates(true)} className="flex-1 text-primary-foreground sm:flex-none">
              <Plus className="size-3.5" />
              Start from template
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Agents" value={stats?.totalAgents ?? agents.length} sub={`${stats?.activeAgents ?? 0} active · ${inactiveCount} inactive`} progress={activePct} accent="purple" />
        <KpiCard label="Runs (30d)" value={stats?.runs30d ?? 0} sub={`${stats?.runsToday ?? 0} today`} accent="blue" />
        <KpiCard label="Credits (30d)" value={(stats?.creditsUsed30d ?? 0).toFixed(2)} accent="green" />
      </div>

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => { if (v) { setFilter(v as 'mine' | 'all'); setPage(1); } }}
        className="mb-4 w-full flex-wrap sm:w-auto"
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="mine">Mine</ToggleGroupItem>
        <ToggleGroupItem value="all">All Agents</ToggleGroupItem>
      </ToggleGroup>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Bot className="size-6" />
            </div>
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>Create a custom agent or start from a template.</CardDescription>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="text-primary-foreground">
                <Link href="/agents/new" className="text-primary-foreground">
                  <Wand2 className="size-3.5" />
                  New agent
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setShowTemplates(true)} className="text-foreground">
                <Plus className="size-3.5" />
                Start from template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/agents/${a.id}`} className="font-medium text-foreground hover:underline">
                      {a.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={agentCategoryBadge(a.category)}
                      className={agentCategoryBadge(a.category) === 'default' ? 'text-primary-foreground' : 'text-foreground'}
                    >
                      {a.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={agentIsActive(a) ? 'default' : 'outline'}
                      className={agentIsActive(a) ? 'text-primary-foreground' : 'text-foreground'}
                    >
                      {agentIsActive(a) ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{runs.filter((r) => r.agentName === a.name).length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={Boolean(runningIds[a.id])}
                      onClick={() => runAgent(a.id)}
                      className="text-primary-foreground"
                    >
                      {runningIds[a.id] ? 'Running…' : 'Run'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          {totalPages > 1 && (
            <div className="border-t p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      )}

      {runs.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 text-[0.9375rem] font-bold">Recent runs</h2>
          <Card className="py-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.slice(0, 5).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">{r.agentName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={agentRunStatusBadge(r.status)}
                        className={agentRunStatusBadge(r.status) === 'default' ? 'text-primary-foreground' : 'text-foreground'}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{r.creditsUsed}</TableCell>
                    <TableCell className="text-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </>
      )}

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Start from template</DialogTitle>
            <DialogDescription>
              Pick a pre-built agent to kickstart setup. You can customize everything after applying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {TEMPLATE_CATEGORIES.map(({ key, label }) => {
              const items = templates.filter((t) => t.category === key);
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <h3 className="mb-3 text-sm font-semibold">{label}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {items.map((t) => (
                      <Card
                        key={t.slug}
                        className="cursor-pointer bg-card transition-colors hover:bg-muted"
                        onClick={() => selectTemplate(t.slug)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm">{t.name}</CardTitle>
                            <Badge
                              variant={agentCategoryBadge(t.category)}
                              className={agentCategoryBadge(t.category) === 'default' ? 'text-primary-foreground' : 'text-foreground'}
                            >
                              {t.category}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>{t.description}</CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
