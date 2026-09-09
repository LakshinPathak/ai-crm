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
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 text-muted-foreground">
            <Phone size={32} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold">No calls yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect Gong in Settings to sync call recordings and transcripts into your workspace.
          </p>
          <Link href="/settings/integrations" className="mt-4">
            <Button size="sm">
              <Settings className="size-4" />
              Go to Integrations → Gong
            </Button>
          </Link>
        </Card>
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
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/calls/${call.id}`)}
                >
                  <TableCell className="font-medium">{call.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{call.source}</Badge>
                  </TableCell>
                  <TableCell>{new Date(call.date).toLocaleDateString()}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {call.dealId && call.dealTitle ? (
                      <Link href={`/deals/${call.dealId}`} className="hover:underline">
                        {call.dealTitle}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
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
