'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { DealCard } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/Toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TeamRequest = {
  id: string;
  title: string;
  department: string;
  status: string;
  dealId: string;
  createdAt: string;
};

type ProductRequest = {
  id: string;
  title: string;
  status: string;
  dealId: string;
  createdAt: string;
};

type RequestRow = {
  id: string;
  title: string;
  type: 'team' | 'product';
  status: string;
  detail: string;
  dealId: string;
  dealTitle: string;
  createdAt: string;
};

export default function RequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiGet<{ deals: DealCard[] }>('/deals?limit=20', token)
      .then(async ({ deals }) => {
        const results = await Promise.all(
          deals.map(async (deal) => {
            const [teamRes, productRes] = await Promise.all([
              apiGet<{ teamRequests: TeamRequest[] }>(`/deals/${deal.id}/team-requests`, token).catch(
                () => ({ teamRequests: [] as TeamRequest[] }),
              ),
              apiGet<{ productRequests: ProductRequest[] }>(
                `/deals/${deal.id}/product-requests`,
                token,
              ).catch(() => ({ productRequests: [] as ProductRequest[] })),
            ]);

            const teamRows: RequestRow[] = teamRes.teamRequests.map((r) => ({
              id: r.id,
              title: r.title,
              type: 'team',
              status: r.status,
              detail: r.department,
              dealId: r.dealId,
              dealTitle: deal.title,
              createdAt: r.createdAt,
            }));

            const productRows: RequestRow[] = productRes.productRequests.map((r) => ({
              id: r.id,
              title: r.title,
              type: 'product',
              status: r.status,
              detail: 'Product',
              dealId: r.dealId,
              dealTitle: deal.title,
              createdAt: r.createdAt,
            }));

            return [...teamRows, ...productRows];
          }),
        );
        setRequests(results.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(row: RequestRow, status: string) {
    const token = getToken();
    if (!token) return;
    const path =
      row.type === 'team'
        ? `/deals/${row.dealId}/team-requests/${row.id}`
        : `/deals/${row.dealId}/product-requests/${row.id}`;
    try {
      await apiPatch(path, token, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === row.id && r.type === row.type ? { ...r, status } : r)),
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update request', 'error');
    }
  }

  return (
    <>
      <PageHeader title="Requests" subtitle="Product and team requests across deals" />

      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : requests.length > 0 ? (
        <Card className="py-0">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Recent deal requests</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={`${r.type}-${r.id}`}>
                  <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.detail}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r, v)}>
                      <SelectTrigger className="h-8 w-[140px]" aria-label={`Status for ${r.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {r.type === 'team' ? (
                          <>
                            <SelectItem value="open">open</SelectItem>
                            <SelectItem value="in_progress">in progress</SelectItem>
                            <SelectItem value="completed">completed</SelectItem>
                            <SelectItem value="cancelled">cancelled</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="open">open</SelectItem>
                            <SelectItem value="submitted">submitted</SelectItem>
                            <SelectItem value="in_progress">in progress</SelectItem>
                            <SelectItem value="done">done</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Link href={`/deals/${r.dealId}`} className="font-medium text-foreground hover:underline">
                      {r.dealTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No deal requests yet"
          description="Open a deal to create product or team requests."
        />
      )}
    </>
  );
}
