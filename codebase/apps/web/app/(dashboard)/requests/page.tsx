'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { DealCard } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

  return (
    <>
      <PageHeader title="Requests" subtitle="Product and team requests across deals" />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2 text-muted-foreground">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">Workspace requests — coming soon</CardTitle>
              <CardDescription>
                Full workspace-wide request tracking is on the way. For now, manage requests on individual deals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : requests.length > 0 ? (
        <Card className="py-0">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Recent deal requests</CardTitle>
          </CardHeader>
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
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.detail}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/deals/${r.dealId}`} className="hover:underline">
                      {r.dealTitle}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No deal requests yet. Open a deal to create product or team requests.
          </CardContent>
        </Card>
      )}
    </>
  );
}
