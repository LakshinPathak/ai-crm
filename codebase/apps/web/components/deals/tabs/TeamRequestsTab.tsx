'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';
type TeamRequest = {
  id: string;
  title: string;
  department: string;
  status: string;
  assigneeName: string | null;
  createdAt: string;
};

export function TeamRequestsTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [assigneeName, setAssigneeName] = useState('');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ teamRequests: TeamRequest[] }>(`/deals/${dealId}/team-requests`, token)
      .then((r) => {
        setRequests(r.teamRequests);
        setUnavailable(false);
      })
      .catch(() => {
        setRequests([]);
        setUnavailable(true);
      });
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  async function addRequest(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !title.trim() || !department.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/team-requests`, token, {
        title: title.trim(),
        department: department.trim(),
        assigneeName: assigneeName.trim() || undefined,
      });
      setTitle('');
      setDepartment('');
      setAssigneeName('');
      await reload();
      toast('Team request created', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create team request', 'error');
    }
  }

  async function updateStatus(requestId: string, status: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiPatch(`/deals/${dealId}/team-requests/${requestId}`, token, { status });
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update request', 'error');
    }
  }

  async function removeRequest(requestId: string) {
    if (!confirm('Delete this team request?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/deals/${dealId}/team-requests/${requestId}`, token);
      await reload();
      toast('Request deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete request', 'error');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-[88px]" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <EmptyState
        icon={<UserPlus size={24} />}
        title="Team requests not available yet"
        description="Internal asks — SE support, legal review, and more — will appear here once the team requests API is connected."
      />
    );
  }

  return (
    <>
      <form onSubmit={addRequest} className="mb-4">
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Request title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input placeholder="Department (e.g. SE, Legal)" value={department} onChange={(e) => setDepartment(e.target.value)} required />
          <Input className="sm:col-span-2" placeholder="Assignee (optional)" value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} />
        </div>
        <Button type="submit">Create request</Button>
      </form>
      {requests.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={24} />}
          title="No team requests yet"
          description="Route internal asks — SE support, legal review, security architect — to the right specialist."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="ui-table min-w-[560px]">
            <thead>
              <tr>
                <th>Request</th>
                <th>Department</th>
                <th>Assignee</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="cell-title">{r.title}</td>
                  <td>{r.department}</td>
                  <td>{r.assigneeName ?? '—'}</td>
                  <td>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="h-8 w-[140px]" aria-label={`Status for ${r.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">open</SelectItem>
                        <SelectItem value="in_progress">in progress</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="cancelled">cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeRequest(r.id)} aria-label="Delete request">
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
