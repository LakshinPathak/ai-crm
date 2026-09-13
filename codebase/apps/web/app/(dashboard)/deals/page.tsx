'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Filter, Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type {
  BoardResponse,
  DealCard,
  DealMetricsResponse,
  DealSearchResponse,
} from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { DealKanbanBoard } from '@/components/deals/DealKanbanBoard';
import { DealTable } from '@/components/DealTable';
import { CreateDealModal } from '@/components/CreateDealModal';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const PIPELINE_SELECT_OPTIONS = [{ value: 'deals', label: 'Deals pipeline' }] as const;

const CLOSED_STAGES = ['Closed Won', 'Closed Lost'];

function visibleStages(stages: BoardResponse['stages']) {
  return stages.filter((s) => s.deals.length > 0 || !CLOSED_STAGES.includes(s.name));
}

function groupSearchByStage(
  stages: BoardResponse['stages'],
  searchDeals: DealSearchResponse['deals'],
) {
  const byStage = new Map<string, DealCard[]>();
  for (const deal of searchDeals) {
    const list = byStage.get(deal.stageId) ?? [];
    list.push(deal);
    byStage.set(deal.stageId, list);
  }
  return visibleStages(stages).map((stage) => ({
    ...stage,
    deals: byStage.get(stage.id) ?? [],
  }));
}

function DealSearchCombobox({
  search,
  onSearchChange,
  results,
  loading,
}: {
  search: string;
  onSearchChange: (q: string) => void;
  results: DealSearchResponse['deals'] | null;
  loading: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isSearching = search.trim().length > 0;
  const options = results ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-between font-normal sm:w-52"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-muted-foreground">
              {search.trim() || 'Search deals'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(100vw-2rem,20rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search deals"
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandGroup>
              {options.map((deal) => (
                <CommandItem
                  key={deal.id}
                  value={deal.id}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/deals/${deal.id}`);
                  }}
                >
                  <span className="min-w-0 truncate">{deal.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {isSearching && loading ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Searching…</p>
            ) : null}
            {isSearching && !loading && options.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">No matching deals</p>
            ) : null}
            {!isSearching ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                Type to search deals
              </p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DealsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function DealsPage() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [tableDeals, setTableDeals] = useState<DealCard[]>([]);
  const [dealMetrics, setDealMetrics] = useState<DealMetricsResponse['metrics'] | null>(null);
  const [searchResults, setSearchResults] = useState<DealSearchResponse['deals'] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [pipeline, setPipeline] = useState<'crm' | 'opine'>('crm');
  const [search, setSearch] = useState('');
  const [filterHot, setFilterHot] = useState(false);
  const [filterSentiment, setFilterSentiment] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadBoard = useCallback(() => {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams();
    if (filterHot) params.set('is_hot', 'true');
    if (filterSentiment) params.set('sentiment', filterSentiment);
    const qs = params.toString() ? `?${params}` : '';
    apiGet<BoardResponse>(`/deals/board${qs}`, token)
      .then(setBoard)
      .catch((e) => setError(e.message));
    apiGet<{ deals: DealCard[] }>('/deals?limit=100', token)
      .then((r) => setTableDeals(r.deals));
    apiGet<DealMetricsResponse>('/deals/metrics', token)
      .then((r) => setDealMetrics(r.metrics))
      .catch(() => undefined);
  }, [filterHot, filterSentiment]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  useEffect(() => {
    const token = getToken();
    const q = search.trim();
    if (!token || !q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      apiGet<DealSearchResponse>(`/deals/search?q=${encodeURIComponent(q)}&limit=100`, token)
        .then((r) => setSearchResults(r.deals))
        .catch((e) => setError(e.message))
        .finally(() => setSearchLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const isSearching = search.trim().length > 0;

  const boardStages = useMemo(() => {
    if (!board) return [];
    if (!isSearching) {
      return visibleStages(board.stages);
    }
    return groupSearchByStage(board.stages, searchResults ?? []);
  }, [board, isSearching, searchResults]);

  const tableRows = isSearching ? (searchResults ?? []) : tableDeals;
  const hasActiveFilters = filterHot || filterSentiment !== '';

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!board) return <DealsPageSkeleton />;

  const metrics = dealMetrics ?? {
    openCount: board.metrics.dealCount,
    totalValue: board.metrics.totalAmount,
    wonCount: 0,
    lostCount: 0,
  };

  const metricCards = [
    { label: 'Open deals', value: String(metrics.openCount), dot: 'bg-[var(--teal)]' },
    { label: 'Total value', value: formatMoney(metrics.totalValue), dot: 'bg-primary' },
    { label: 'Won', value: String(metrics.wonCount), dot: 'bg-[var(--green)]' },
    { label: 'Lost', value: String(metrics.lostCount), dot: 'bg-[var(--red)]' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deals"
        subtitle="Pipeline overview"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2">
            {PIPELINE_SELECT_OPTIONS.length > 1 ? (
              <Select defaultValue="deals">
                <SelectTrigger size="sm" className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_SELECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <ToggleGroup
              type="single"
              value={pipeline}
              onValueChange={(v) => v && setPipeline(v as 'crm' | 'opine')}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="crm">CRM</ToggleGroupItem>
              <ToggleGroupItem value="opine">Opine</ToggleGroupItem>
            </ToggleGroup>
            <DealSearchCombobox
              search={search}
              onSearchChange={setSearch}
              results={searchResults}
              loading={searchLoading}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? 'border-primary' : ''}>
                  <Filter className="size-4" />
                  Filter
                  {hasActiveFilters && (
                    <span className="ml-1 size-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="grid gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Filters</p>
                    <p className="text-xs text-muted-foreground">Narrow your pipeline view</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="filter-hot"
                      checked={filterHot}
                      onCheckedChange={(v) => setFilterHot(v === true)}
                    />
                    <Label htmlFor="filter-hot" className="font-normal">
                      Hot deals only
                    </Label>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="filter-sentiment">Sentiment</Label>
                    <Select
                      value={filterSentiment || 'all'}
                      onValueChange={(v) => setFilterSentiment(v === 'all' ? '' : v)}
                    >
                      <SelectTrigger id="filter-sentiment" className="w-full">
                        <SelectValue placeholder="All sentiments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sentiments</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start px-0"
                    onClick={() => {
                      setFilterHot(false);
                      setFilterSentiment('');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="size-4" />
              New deal
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} size="sm">
            <CardHeader className="pb-1">
              <CardDescription className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${metric.dot}`} />
                {metric.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(v) => v && setViewMode(v as 'board' | 'table')}
        variant="outline"
        size="sm"
        className="flex w-full flex-wrap sm:w-auto"
      >
        <ToggleGroupItem value="board">Board view</ToggleGroupItem>
        <ToggleGroupItem value="table">Table view</ToggleGroupItem>
      </ToggleGroup>

      {searchLoading && isSearching ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : null}

      {viewMode === 'table' ? (
        <DealTable deals={tableRows} />
      ) : (
        <DealKanbanBoard
          stages={boardStages}
          showOpine={pipeline === 'opine'}
          dragEnabled={!isSearching}
          onStagesChange={(updatedStages) => {
            const byId = new Map(updatedStages.map((s) => [s.id, s.deals]));
            setBoard((prev) =>
              prev
                ? {
                    ...prev,
                    stages: prev.stages.map((s) =>
                      byId.has(s.id) ? { ...s, deals: byId.get(s.id)! } : s,
                    ),
                  }
                : prev,
            );
          }}
        />
      )}

      <CreateDealModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadBoard} />
    </div>
  );
}
