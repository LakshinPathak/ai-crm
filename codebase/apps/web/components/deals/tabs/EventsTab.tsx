'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

type DealEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type: string;
  source: string;
};

function formatEventRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    const date = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${startTime} – ${endTime}`;
  }

  return `${start.toLocaleString()} – ${end.toLocaleString()}`;
}

export function EventsTab({ dealId }: { dealId: string }) {
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ events: DealEvent[] }>(`/deals/${dealId}/events`, token).then((r) =>
      setEvents(r.events),
    );
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-[88px]" />
        <Skeleton className="h-30" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={24} />}
        title="No events yet"
        description="Scheduled meetings and calendar events linked to this deal will appear here."
      />
    );
  }

  return (
    <>
      {events.map((event) => (
        <Card key={event.id} className="mb-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="mb-1.5 min-w-0 flex-1 leading-relaxed">{event.title}</p>
            <Badge variant="default" className="shrink-0 self-start">{event.type}</Badge>
          </div>
          <small style={{ color: 'var(--muted-light)' }}>{formatEventRange(event.startAt, event.endAt)}</small>
          <small style={{ display: 'block', marginTop: 4, color: 'var(--muted-light)' }}>{event.source}</small>
        </Card>
      ))}
    </>
  );
}
