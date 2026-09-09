'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
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

type DealProject = {
  id: string;
  title: string;
  status: string;
  dealId: string;
  createdAt: string;
};

type ProjectRow = DealProject & { dealTitle: string };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
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
            const { projects: dealProjects } = await apiGet<{ projects: DealProject[] }>(
              `/deals/${deal.id}/projects`,
              token,
            );
            return dealProjects.map((p) => ({
              ...p,
              dealTitle: deal.title,
            }));
          }),
        );
        setProjects(results.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Projects" subtitle="POC and implementation projects across deals" />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2 text-muted-foreground">
              <FolderKanban className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">Workspace projects — coming soon</CardTitle>
              <CardDescription>
                Full workspace-wide project tracking is on the way. For now, manage projects on individual deals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : projects.length > 0 ? (
        <Card className="py-0">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Recent deal projects</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/deals/${p.dealId}`} className="hover:underline">
                      {p.dealTitle}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No deal projects yet. Open a deal to create a POC or implementation project.
          </CardContent>
        </Card>
      )}
    </>
  );
}
