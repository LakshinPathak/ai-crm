'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderKanban } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';

type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';

type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  dealId: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On hold',
};

export function ProjectsTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ projects: Project[] }>(`/deals/${dealId}/projects`, token).then((r) =>
      setProjects(r.projects),
    );
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !title.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/projects`, token, {
        title: title.trim(),
        status,
      });
      setTitle('');
      setStatus('planning');
      await reload();
      toast('Project added', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add project', 'error');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={addProject} className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="min-w-0 flex-1"
          placeholder="Project title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Add</Button>
      </form>
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title="No linked projects"
          description="POC and delivery projects associated with this deal will show here."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="ui-table min-w-[480px]">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="cell-title">{p.title}</td>
                  <td>
                    <Badge variant="default">{STATUS_LABELS[p.status] ?? p.status}</Badge>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
