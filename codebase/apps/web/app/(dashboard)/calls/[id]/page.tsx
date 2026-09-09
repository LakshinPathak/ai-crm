'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !id) {
      setLoading(false);
      return;
    }

    apiGet<{ call: CallDetail }>(`/calls/${id}`, token)
      .then((r) => setCall(r.call))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load call'))
      .finally(() => setLoading(false));
  }, [id]);

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
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Deal</span>
              {call.dealId && call.dealTitle ? (
                <Link href={`/deals/${call.dealId}`} className="font-medium hover:underline">
                  {call.dealTitle}
                </Link>
              ) : (
                <span className="text-muted-foreground">Not linked</span>
              )}
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
