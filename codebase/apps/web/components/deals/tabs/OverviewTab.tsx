'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import {
  consumeMeddpiccStream,
  createInitialStreamSteps,
  MeddpiccStreamLoader,
  type MeddpiccStreamStep,
} from '@/components/deals/MeddpiccStreamLoader';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { formatMoney, fitScore, sentimentLabel } from '@/lib/format';
import type { MeddpiccLetter } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';

type DealHeader = {
  title: string;
  companyName: string;
  amount: number;
  stageId?: string;
  winProbability: number;
  meddpiccCompleteness: number;
  sentiment: string;
  blockerCount?: number;
};

type Stage = { id: string; name: string };
type Task = { id: string; title: string; status: string };

function citationHref(letter: MeddpiccLetter): string | null {
  const callId = letter.callId?.trim();
  if (callId) return `/calls/${callId}`;
  return null;
}

function MeddpiccLetterCitation({ letter }: { letter: MeddpiccLetter }) {
  const excerpt = letter.excerpt?.trim();
  if (!excerpt) return null;

  const href = citationHref(letter);

  return (
    <div className="mt-3 min-w-0 border-t border-border pt-2">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Source
        </span>
        {href ? (
          <Link
            href={href}
            className="text-[0.6875rem] font-medium text-primary underline-offset-2 hover:underline"
          >
            View call
          </Link>
        ) : null}
      </div>
      <p className="m-0 min-w-0 break-words text-xs italic leading-relaxed text-muted-foreground">
        “{excerpt}”
      </p>
    </div>
  );
}

export function OverviewTab({
  dealId,
  header,
  stages,
}: {
  dealId: string;
  header: DealHeader;
  stages: Stage[];
}) {
  const { toast } = useToast();
  const [meddpicc, setMeddpicc] = useState<Record<string, MeddpiccLetter>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamSteps, setStreamSteps] = useState<MeddpiccStreamStep[] | null>(null);

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return Promise.resolve();
    return Promise.all([
      apiGet<{ letters: Record<string, MeddpiccLetter> }>(`/deals/${dealId}/meddpicc`, token).then((r) => setMeddpicc(r.letters)),
      apiGet<{ tasks: Task[] }>(`/deals/${dealId}/tasks`, token).then((r) => setTasks(r.tasks)),
    ]);
  }, [dealId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  function updateStreamStep(letter: string, status: MeddpiccStreamStep['status']) {
    setStreamSteps((prev) =>
      prev?.map((step) => (step.letter === letter ? { ...step, status } : step)) ?? null,
    );
  }

  async function refreshMeddpicc() {
    const token = getToken();
    if (!token) return;
    setStreaming(true);
    setStreamSteps(createInitialStreamSteps());
    try {
      const { streamUrl } = await apiPost<{ streamUrl: string }>(
        `/deals/${dealId}/meddpicc/refresh`,
        token,
        {},
      );
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiBase}${streamUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let streamError: string | null = null;
      await consumeMeddpiccStream(res, {
        onStepStarted: (letter) => updateStreamStep(letter, 'active'),
        onStepCompleted: (letter) => updateStreamStep(letter, 'complete'),
        onSectionCompleted: (letter, section) => {
          setMeddpicc((prev) => ({ ...prev, [letter]: section }));
        },
        onError: (message) => {
          streamError = message;
        },
      });

      if (streamError) throw new Error(streamError);

      const updated = await apiGet<{ letters: Record<string, MeddpiccLetter> }>(
        `/deals/${dealId}/meddpicc`,
        token,
      );
      setMeddpicc(updated.letters);
      toast('MEDDPICC updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Refresh failed', 'error');
    } finally {
      setStreaming(false);
      setStreamSteps(null);
    }
  }

  async function toggleTask(taskId: string, current: string) {
    const token = getToken();
    if (!token) return;
    await apiPatch(`/deals/${dealId}/tasks/${taskId}`, token, {
      status: current === 'done' ? 'open' : 'done',
    });
    await reload();
  }

  if (loading) {
    return (
      <>
        <div className="ui-metrics" style={{ marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[72px]" />)}
        </div>
        <Skeleton className="h-[280px]" />
      </>
    );
  }

  const fit = fitScore(header.winProbability);
  const weighted = header.amount * (header.winProbability / 100);
  const currentStageIdx = stages.findIndex((s) => s.id === header.stageId);

  return (
    <>
      <div className="ui-metrics">
        <div className="ui-metric"><div className="ui-metric__label"><span className="ui-dot ui-dot--blue" /> Deal Value</div><div className="ui-metric__value">{formatMoney(header.amount)}</div></div>
        <div className="ui-metric"><div className="ui-metric__label"><span className="ui-dot ui-dot--purple" /> Weighted</div><div className="ui-metric__value">{formatMoney(weighted)}</div></div>
        <div className="ui-metric"><div className="ui-metric__label"><span className="ui-dot ui-dot--yellow" /> Win %</div><div className="ui-metric__value">{header.winProbability}%</div></div>
        <div className="ui-metric"><div className="ui-metric__label"><span className="ui-dot ui-dot--green" /> MEDDPICC</div><div className="ui-metric__value">{header.meddpiccCompleteness}%</div></div>
        <div className="ui-metric"><div className="ui-metric__label"><span className="ui-dot ui-dot--red" /> Blockers</div><div className="ui-metric__value">{header.blockerCount ?? 0}</div></div>
      </div>

      <div className="ui-stage-bar">
        {stages.filter((s) => !['Closed Won', 'Closed Lost'].includes(s.name)).map((stage, i) => {
          const pct = i < currentStageIdx ? 100 : i === currentStageIdx ? header.winProbability : 0;
          return (
            <div key={stage.id} className={`ui-stage-step${i <= currentStageIdx ? ' active' : ''}`}>
              <div className="ui-stage-step__label">{stage.name}</div>
              <div className="ui-stage-step__track"><div className="ui-stage-step__fill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <div className="ui-deal-layout">
        <Card>
          <div className="ui-meta-panel">
            <h4>Deal Details</h4>
            <div className="ui-meta-row"><span className="label">Sentiment</span><span className="value"><span className={`ui-dot ui-dot--${header.sentiment}`} />{sentimentLabel(header.sentiment)}</span></div>
            <div className="ui-meta-row"><span className="label">Technical Fit</span><span className="value"><span className={`ui-dot ui-dot--${fit.color}`} />{fit.label}</span></div>
            <div className="ui-meta-row"><span className="label">Win Probability</span><span className="value">{header.winProbability}%</span></div>
          </div>
        </Card>

        <div className="ui-ai-card">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="m-0 text-base font-bold">
              AI Deal Summary {streaming && <span className="live">Refreshing</span>}
            </h3>
            <Button size="sm" className="w-full shrink-0 sm:w-auto" onClick={refreshMeddpicc} disabled={streaming}>
              <RefreshCw size={14} />
              {streaming ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          {streaming && streamSteps ? (
            <MeddpiccStreamLoader steps={streamSteps} />
          ) : Object.entries(meddpicc).length > 0 ? (
            Object.entries(meddpicc).map(([key, letter]) => (
              <div key={key} className="ui-meddpicc-item"><strong>{key} — {letter.label}:</strong> {letter.summary}</div>
            ))
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: 0 }}>Click Refresh to generate MEDDPICC from deal context.</p>
          )}
        </div>

        <Card>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 700 }}>Recent Tasks</h4>
          {tasks.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8125rem' }}>No tasks yet.</p>
          ) : (
            tasks.slice(0, 5).map((t) => (
              <div key={t.id} className="ui-task">
                <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleTask(t.id, t.status)} />
                <span style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      {Object.entries(meddpicc).length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700 }}>MEDDPICC Breakdown</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(meddpicc).map(([key, letter]) => (
              <Card key={key} className="min-w-0 transition-shadow hover:shadow-md">
                <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                  <strong className="min-w-0 break-words">{key} — {letter.label}</strong>
                  <Badge variant="default" className="shrink-0">{Math.round(letter.confidence * 100)}%</Badge>
                </div>
                <p className="m-0 min-w-0 break-words text-[0.8125rem] leading-relaxed text-muted-foreground">{letter.summary}</p>
                <MeddpiccLetterCitation letter={letter} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
