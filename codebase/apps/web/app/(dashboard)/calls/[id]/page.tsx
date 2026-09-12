'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronsUpDown, Phone } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { DealCard, DealSearchResponse } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const UNLINKED_VALUE = '__none__';

type CallDetail = {
  id: string;
  title: string;
  source: string;
  date: string;
  dealId: string | null;
  dealTitle: string | null;
  transcriptExcerpt: string;
  hasFullTranscript: boolean;
};

function CallDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

function DealLinkPicker({
  call,
  deals,
  savingDeal,
  onDealLinkChange,
}: {
  call: CallDetail;
  deals: DealCard[];
  savingDeal: boolean;
  onDealLinkChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DealCard[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    const q = query.trim();
    if (!token || !q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      apiGet<DealSearchResponse>(`/deals/search?q=${encodeURIComponent(q)}&limit=20`, token)
        .then((r) => setSearchResults(r.deals))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const searching = query.trim().length > 0;
  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.companyName?.toLowerCase().includes(q) ?? false),
    );
  }, [deals, query]);
  const options =
    searching && searchResults && searchResults.length > 0 ? searchResults : searching ? localMatches : deals;

  const triggerLabel = useMemo(() => {
    if (call.dealId && call.dealTitle) return call.dealTitle;
    return 'Unlinked';
  }, [call.dealId, call.dealTitle]);

  function selectDeal(value: string) {
    setOpen(false);
    setQuery('');
    void onDealLinkChange(value);
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={savingDeal}
            className="w-full min-w-[200px] justify-between sm:w-[260px]"
          >
            <span className="truncate">{savingDeal ? 'Saving…' : triggerLabel}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[260px] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search deals…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  value={UNLINKED_VALUE}
                  data-checked={!call.dealId || undefined}
                  onSelect={() => selectDeal(UNLINKED_VALUE)}
                >
                  Unlinked
                </CommandItem>
                {options.map((deal) => (
                  <CommandItem
                    key={deal.id}
                    value={deal.id}
                    data-checked={call.dealId === deal.id || undefined}
                    onSelect={() => selectDeal(deal.id)}
                  >
                    <span className="truncate">{deal.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {searching && searchLoading ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">Searching…</p>
              ) : null}
              {searching && !searchLoading && options.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">No matching deals</p>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!call.dealId ? (
        <Badge variant="outline">Unlinked</Badge>
      ) : call.dealTitle ? (
        <Link
          href={`/deals/${call.dealId}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Open deal
        </Link>
      ) : null}
    </div>
  );
}

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDeal, setSavingDeal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !id) {
      setLoading(false);
      return;
    }

    Promise.all([
      apiGet<{ call: CallDetail }>(`/calls/${id}`, token),
      apiGet<{ deals: DealCard[] }>('/deals?limit=50', token),
    ])
      .then(([callRes, dealsRes]) => {
        setCall(callRes.call);
        setDeals(dealsRes.deals);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load call'))
      .finally(() => setLoading(false));
  }, [id]);

  async function onDealLinkChange(value: string) {
    const token = getToken();
    if (!token || !id) return;

    setLinkError(null);
    setSavingDeal(true);
    const dealId = value === UNLINKED_VALUE ? null : value;

    try {
      const res = await apiPatch<{ call: CallDetail }>(`/calls/${id}`, token, { dealId });
      setCall(res.call);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to update deal link');
    } finally {
      setSavingDeal(false);
    }
  }

  if (loading) return <CallDetailSkeleton />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!call) return <p className="text-sm text-muted-foreground">Call not found.</p>;

  return (
    <div className="space-y-6">
      <Link
        href="/calls"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to calls
      </Link>

      <PageHeader title={call.title} subtitle="Call recording and transcript" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Source</span>
              <Badge variant="outline">{call.source}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Date</span>
              <span>{new Date(call.date).toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">Deal</span>
              <div className="flex min-w-0 flex-col items-end gap-1">
                <DealLinkPicker
                  call={call}
                  deals={deals}
                  savingDeal={savingDeal}
                  onDealLinkChange={onDealLinkChange}
                />
                {linkError ? <p className="text-xs text-destructive">{linkError}</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript</CardTitle>
            <CardDescription>
              {call.hasFullTranscript
                ? call.transcriptExcerpt.length >= 2000
                  ? 'Showing first 2,000 characters'
                  : 'Full transcript'
                : 'No transcript available yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {call.hasFullTranscript ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
                {call.transcriptExcerpt}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Phone size={28} strokeWidth={1.5} className="mb-2" />
                <p className="text-sm">Transcript will appear after Gong sync completes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {call.dealId && (
        <Link href={`/deals/${call.dealId}`}>
          <Button variant="outline">View linked deal</Button>
        </Link>
      )}
    </div>
  );
}
