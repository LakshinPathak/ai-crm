'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/page-skeleton';

type ActivityItem = {
  id: string;
  eventType: string;
  summary: string;
  occurredAt: string;
};

function formatEventType(eventType: string) {
  return eventType.replace(/\./g, ' · ').replace(/_/g, ' ');
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActivityTab({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ items: ActivityItem[] }>(`/deals/${dealId}/activity`, token)
      .then((r) => {
        setItems(r.items ?? []);
        setUnavailable(false);
      })
      .catch(() => {
        setItems([]);
        setUnavailable(true);
      });
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  if (loading) {
    return (
      <div>
        <Skeleton style={{ height: 40, marginBottom: 16 }} />
        <Skeleton style={{ height: 200 }} />
      </div>
    );
  }

  if (unavailable || items.length === 0) {
    return (
      <EmptyState
        icon={<Activity size={24} />}
        title="No activity yet"
        description={
          unavailable
            ? 'Calls, emails, and deal events will show in a timeline once the activity API is connected.'
            : 'Calls, emails, and deal events will show in a timeline once synced.'
        }
      />
    );
  }

  return (
    <Card>
      {items.map((item) => (
        <div key={item.id} className="ui-activity">
          <div className="ui-activity__dot" />
          <div>
            <div className="ui-activity__title">{item.summary}</div>
            <div className="ui-activity__time">
              {formatEventType(item.eventType)} · {formatRelativeTime(item.occurredAt)}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
