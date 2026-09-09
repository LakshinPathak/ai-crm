'use client';

import { useCallback, useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';
import type { ShadcnBadgeVariant } from '@/lib/ui-badge';

type ProductRequestStatus = 'open' | 'submitted' | 'in_progress' | 'done';
type ProductRequestPriority = 'low' | 'medium' | 'high';

type ProductRequest = {
  id: string;
  title: string;
  description: string | null;
  status: ProductRequestStatus;
  priority: ProductRequestPriority;
  createdAt: string;
};

function statusVariant(status: ProductRequestStatus): ShadcnBadgeVariant {
  if (status === 'done') return 'default';
  if (status === 'in_progress') return 'secondary';
  if (status === 'submitted') return 'outline';
  return 'secondary';
}

function priorityVariant(priority: ProductRequestPriority): ShadcnBadgeVariant {
  if (priority === 'high') return 'destructive';
  if (priority === 'medium') return 'outline';
  return 'secondary';
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export function ProductRequestsTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ProductRequestPriority>('medium');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ productRequests: ProductRequest[] }>(`/deals/${dealId}/product-requests`, token)
      .then((r) => {
        setRequests(r.productRequests);
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
    if (!token || !title.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/product-requests`, token, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setTitle('');
      setDescription('');
      setPriority('medium');
      await reload();
      toast('Product request created', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create product request', 'error');
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
        icon={<Package size={24} />}
        title="Product requests not available yet"
        description="Feature gaps and product feedback tied to this deal will show here once the product requests API is connected."
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
          <select
            className="ui-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as ProductRequestPriority)}
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <textarea
            className="ui-input"
            rows={2}
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ gridColumn: '1 / -1' }}
          />
        </div>
        <Button type="submit">Create request</Button>
      </form>
      {requests.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="No product requests"
          description="Capture feature gaps and product feedback tied to this deal."
        />
      ) : (
        <Card>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="cell-title">
                    <div>{r.title}</div>
                    {r.description && (
                      <small style={{ color: 'var(--muted-light)' }}>{r.description}</small>
                    )}
                  </td>
                  <td>
                    <Badge variant={priorityVariant(r.priority)}>{formatLabel(r.priority)}</Badge>
                  </td>
                  <td>
                    <Badge variant={statusVariant(r.status)}>{formatLabel(r.status)}</Badge>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
