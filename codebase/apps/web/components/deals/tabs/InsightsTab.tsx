'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { sentimentLabel } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type DealHeaderInsights = {
  winProbability: number;
  riskScore?: number;
  sentiment: string;
  blockerCount?: number;
  meddpiccCompleteness?: number;
};

type DealInsights = {
  winProbability: number;
  riskScore: number;
  sentiment: string;
  blockerCount: number;
};

type InsightsSummaryResponse = Partial<DealInsights> & { dealId?: string };

function riskLabel(score: number) {
  if (score >= 70) return { label: 'High', color: 'red' as const };
  if (score >= 40) return { label: 'Medium', color: 'yellow' as const };
  return { label: 'Low', color: 'green' as const };
}

function fromHeader(header: DealHeaderInsights): DealInsights {
  return {
    winProbability: header.winProbability,
    riskScore: header.riskScore ?? 0,
    sentiment: header.sentiment,
    blockerCount: header.blockerCount ?? 0,
  };
}

function isDealInsightsSummary(data: InsightsSummaryResponse): data is DealInsights {
  return (
    typeof data.winProbability === 'number' &&
    typeof data.riskScore === 'number' &&
    typeof data.sentiment === 'string'
  );
}

export function InsightsTab({
  dealId,
  header,
}: {
  dealId: string;
  header: DealHeaderInsights;
}) {
  const [insights, setInsights] = useState<DealInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const summary = await apiGet<InsightsSummaryResponse>(
        `/insights/summary?dealId=${encodeURIComponent(dealId)}`,
        token,
      );
      if (isDealInsightsSummary(summary)) {
        setInsights({
          winProbability: summary.winProbability,
          riskScore: summary.riskScore,
          sentiment: summary.sentiment,
          blockerCount: summary.blockerCount ?? 0,
        });
        return;
      }
    } catch {
      // Fall through to overview-header composition.
    }

    if (header.riskScore !== undefined) {
      setInsights(fromHeader(header));
      return;
    }

    const overview = await apiGet<{ header: DealHeaderInsights }>(
      `/deals/${dealId}/overview-header`,
      token,
    );
    setInsights(fromHeader(overview.header));
  }, [dealId, header]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <div className="ui-metrics">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    );
  }

  if (!insights) {
    return (
      <Card>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8125rem' }}>
          Unable to load deal insights.
        </p>
      </Card>
    );
  }

  const risk = riskLabel(insights.riskScore);

  return (
    <>
      <div className="ui-metrics">
        <div className="ui-metric">
          <div className="ui-metric__label">
            <span className="ui-dot ui-dot--yellow" /> Win probability
          </div>
          <div className="ui-metric__value">{insights.winProbability}%</div>
        </div>
        <div className="ui-metric">
          <div className="ui-metric__label">
            <span className={`ui-dot ui-dot--${risk.color}`} /> Risk
          </div>
          <div className="ui-metric__value">{risk.label}</div>
        </div>
        <div className="ui-metric">
          <div className="ui-metric__label">
            <span className={`ui-dot ui-dot--${insights.sentiment}`} /> Sentiment
          </div>
          <div className="ui-metric__value">{sentimentLabel(insights.sentiment)}</div>
        </div>
        <div className="ui-metric">
          <div className="ui-metric__label">
            <span className="ui-dot ui-dot--red" /> Blockers
          </div>
          <div className="ui-metric__value">{insights.blockerCount}</div>
        </div>
      </div>

      <Card style={{ marginTop: 16 }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 700 }}>
          Deal health summary
        </h4>
        <div className="ui-meta-panel">
          <div className="ui-meta-row">
            <span className="label">Win probability</span>
            <span className="value">{insights.winProbability}%</span>
          </div>
          <div className="ui-meta-row">
            <span className="label">Risk score</span>
            <span className="value">
              <span className={`ui-dot ui-dot--${risk.color}`} />
              {insights.riskScore} — {risk.label}
            </span>
          </div>
          <div className="ui-meta-row">
            <span className="label">Sentiment</span>
            <span className="value">
              <span className={`ui-dot ui-dot--${insights.sentiment}`} />
              {sentimentLabel(insights.sentiment)}
            </span>
          </div>
          <div className="ui-meta-row">
            <span className="label">Open blockers</span>
            <span className="value">{insights.blockerCount}</span>
          </div>
          {header.meddpiccCompleteness !== undefined && (
            <div className="ui-meta-row">
              <span className="label">MEDDPICC completeness</span>
              <span className="value">{header.meddpiccCompleteness}%</span>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
