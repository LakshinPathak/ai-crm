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

type Agent = { id: string; name: string; templateSlug: string; category: string; isActive: boolean; ownerId?: string };
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

  function load() {
    const token = getToken();
    if (!token) return;
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
    });
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
    if (!token) return;
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
  }

  const inactiveCount = (stats?.totalAgents ?? agents.length) - (stats?.activeAgents ?? 0);
  const activePct = stats && stats.totalAgents > 0 ? Math.round((stats.activeAgents / stats.totalAgents) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="Automate deal workflows with AI agents"
        actions={
          <>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search agents…"
                className="w-48 pl-8"
              />
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/agents/new">
                <Wand2 className="size-3.5" />
                New agent
              </Link>
            </Button>
            <Button size="sm" onClick={() => setShowTemplates(true)}>
              <Plus className="size-3.5" />
              Start from template
            </Button>
          </>
        }
      />

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <KpiCard label="Total Agents" value={stats?.totalAgents ?? agents.length} sub={`${stats?.activeAgents ?? 0} active · ${inactiveCount} inactive`} progress={activePct} accent="purple" />
        <KpiCard label="Runs (30d)" value={stats?.runs30d ?? 0} sub={`${stats?.runsToday ?? 0} today`} accent="blue" />
        <KpiCard label="Credits (30d)" value={(stats?.creditsUsed30d ?? 0).toFixed(2)} accent="green" />
      </div>

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => { if (v) { setFilter(v as 'mine' | 'all'); setPage(1); } }}
        className="mb-4"
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="mine">Mine</ToggleGroupItem>
        <ToggleGroupItem value="all">All Agents</ToggleGroupItem>
      </ToggleGroup>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <Bot className="size-6" />
            </div>
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>Create a custom agent or start from a template.</CardDescription>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/agents/new">
                  <Wand2 className="size-3.5" />
                  New agent
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setShowTemplates(true)}>
                <Plus className="size-3.5" />
                Start from template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
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
                    <Link href={`/agents/${a.id}`} className="font-medium hover:underline">
                      {a.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agentCategoryBadge(a.category)}>{a.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.isActive ? 'default' : 'outline'}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{runs.filter((r) => r.agentName === a.name).length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => runAgent(a.id)}>Run</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                    <TableCell className="font-medium">{r.agentName}</TableCell>
                    <TableCell>
                      <Badge variant={agentRunStatusBadge(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.creditsUsed}</TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-3xl">
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((t) => (
                      <Card
                        key={t.slug}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => selectTemplate(t.slug)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm">{t.name}</CardTitle>
                            <Badge variant={agentCategoryBadge(t.category)}>{t.category}</Badge>
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
