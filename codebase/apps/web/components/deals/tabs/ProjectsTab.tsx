'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderKanban } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <form onSubmit={addProject} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="ui-input"
          placeholder="Project title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: '1 1 200px' }}
        />
        <select
          className="ui-input"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          style={{ flex: '0 0 auto' }}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <Button type="submit">Add</Button>
      </form>
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title="No linked projects"
          description="POC and delivery projects associated with this deal will show here."
        />
      ) : (
        <Card>
          <table className="ui-table">
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
