'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';

type TeamRequest = {
  id: string;
  title: string;
  department: string;
  status: string;
  assigneeName: string | null;
  createdAt: string;
};

function statusVariant(status: string) {
  if (status === 'completed') return 'green';
  if (status === 'in_progress') return 'blue';
  if (status === 'cancelled') return 'default';
  return 'yellow';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

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

  if (loading) {
    return (
      <div>
        <Skeleton style={{ height: 88, marginBottom: 16 }} />
        <Skeleton style={{ height: 160 }} />
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
      <form onSubmit={addRequest} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input
            className="ui-input"
            placeholder="Request title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="ui-input"
            placeholder="Department (e.g. SE, Legal)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
          <input
            className="ui-input"
            placeholder="Assignee (optional)"
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            style={{ gridColumn: '1 / -1' }}
          />
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
        <Card>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Department</th>
                <th>Assignee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="cell-title">{r.title}</td>
                  <td>{r.department}</td>
                  <td>{r.assigneeName ?? '—'}</td>
                  <td>
                    <Badge variant={statusVariant(r.status)}>{formatStatus(r.status)}</Badge>
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
