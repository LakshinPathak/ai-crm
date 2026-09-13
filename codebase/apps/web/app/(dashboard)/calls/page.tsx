'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, Settings } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CallRow = {
  id: string;
  title: string;
  source: string;
  date: string;
  dealId: string | null;
  dealTitle: string | null;
};

type CallsResponse = {
  calls: CallRow[];
  source: 'db' | 'demo';
};

function CallsPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiGet<CallsResponse>('/calls', token)
      .then((r) => setCalls(r.calls))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CallsPageSkeleton />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div>
      <PageHeader title="Calls" subtitle="Call recordings and transcripts" />

      {calls.length === 0 ? (
        <EmptyState
          icon={<Phone size={32} strokeWidth={1.5} />}
          title="No calls yet"
          description="Connect Gong in Settings to sync call recordings and transcripts into your workspace."
          action={
            <Button size="sm" asChild className="text-primary-foreground">
              <Link href="/settings/integrations" className="text-primary-foreground">
                <Settings className="size-4" />
                Go to Integrations → Gong
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="py-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow
                  key={call.id}
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => router.push(`/calls/${call.id}`)}
                >
                  <TableCell className="font-medium text-foreground">{call.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{call.source}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(call.date).toLocaleDateString()}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {call.dealId && call.dealTitle ? (
                      <Link href={`/deals/${call.dealId}`} className="font-medium text-foreground hover:underline">
                        {call.dealTitle}
                      </Link>
                    ) : (
                      <Badge variant="outline">Unlinked</Badge>
                    )}
                  </TableCell>
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
