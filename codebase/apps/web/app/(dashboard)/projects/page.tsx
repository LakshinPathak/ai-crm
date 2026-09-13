'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { DealCard } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';

type DealProject = {
  id: string;
  title: string;
  status: string;
  dealId: string;
  createdAt: string;
};

type ProjectRow = DealProject & { dealTitle: string };

export default function ProjectsPage() {
  const { toast } = useToast();
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

  async function updateStatus(row: ProjectRow, status: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiPatch(`/deals/${row.dealId}/projects/${row.id}`, token, { status });
      setProjects((prev) => prev.map((p) => (p.id === row.id ? { ...p, status } : p)));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update project', 'error');
    }
  }

  return (
    <>
      <PageHeader title="Projects" subtitle="POC and implementation projects across deals" />

      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : projects.length > 0 ? (
        <Card className="py-0">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Recent deal projects</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
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
                  <TableCell className="font-medium text-foreground">{p.title}</TableCell>
                  <TableCell>
                    <Select value={p.status} onValueChange={(v) => updateStatus(p, v)}>
                      <SelectTrigger className="h-8 w-[140px]" aria-label={`Status for ${p.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">planning</SelectItem>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="on_hold">on hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Link href={`/deals/${p.dealId}`} className="font-medium text-foreground hover:underline">
                      {p.dealTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title="No deal projects yet"
          description="Open a deal to create a POC or implementation project."
        />
      )}
    </>
  );
}
