'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/legacy-badge';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/page-skeleton';

type Milestone = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  description: string | null;
};

type Goal = {
  id: string;
  title: string;
  description: string | null;
};

function milestoneVariant(status: string) {
  if (status === 'done') return 'green';
  if (status === 'in_progress') return 'blue';
  return 'default';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export function PlanTab({ dealId }: { dealId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ plan: { milestones: Milestone[]; goals: Goal[] } }>(`/deals/${dealId}/plan`, token)
      .then((r) => {
        setMilestones(r.plan.milestones);
        setGoals(r.plan.goals);
        setUnavailable(false);
      })
      .catch(() => {
        setMilestones([]);
        setGoals([]);
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
        <Skeleton style={{ height: 160 }} />
      </div>
    );
  }

  if (unavailable) {
    return (
      <EmptyState
        icon={<ClipboardList size={24} />}
        title="Plan not available yet"
        description="Milestones and success criteria will appear here once the plan API is connected."
      />
    );
  }

  if (milestones.length === 0 && goals.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={24} />}
        title="No plan milestones yet"
        description="Milestones, success criteria, and plan confidence will appear here as the deal progresses."
      />
    );
  }

  return (
    <>
      {milestones.length > 0 && (
        <Card style={{ marginBottom: goals.length > 0 ? 16 : 0 }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 700 }}>Milestones</h4>
          {milestones.map((m) => (
            <div key={m.id} className="ui-task" style={{ alignItems: 'flex-start' }}>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: m.description ? 4 : 0 }}>{m.title}</div>
                {m.description && (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {m.description}
                  </p>
                )}
                {m.dueDate && (
                  <small style={{ color: 'var(--muted-light)', display: 'block', marginTop: 4 }}>
                    Due {new Date(m.dueDate).toLocaleDateString()}
                  </small>
                )}
              </span>
              <Badge variant={milestoneVariant(m.status)}>{formatStatus(m.status)}</Badge>
            </div>
          ))}
        </Card>
      )}
      {goals.length > 0 && (
        <Card>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 700 }}>Success criteria</h4>
          {goals.map((g) => (
            <div key={g.id} style={{ marginBottom: '0.65rem' }}>
              <div style={{ fontWeight: 600 }}>{g.title}</div>
              {g.description && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {g.description}
                </p>
              )}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
