'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { DealCard } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    const dealId = value === '__none__' ? null : value;

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
                <Select
                  value={call.dealId ?? '__none__'}
                  onValueChange={onDealLinkChange}
                  disabled={savingDeal}
                >
                  <SelectTrigger className="w-full min-w-[200px] sm:w-[260px]">
                    <SelectValue placeholder="Link to deal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not linked</SelectItem>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {call.dealId && call.dealTitle ? (
                  <Link
                    href={`/deals/${call.dealId}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open deal
                  </Link>
                ) : null}
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
