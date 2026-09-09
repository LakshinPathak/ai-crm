'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Button } from '@/components/ui/legacy-button';
import { PerformanceDashboard, type PerformanceData } from '@/components/analytics/PerformanceDashboard';
import { ActivityDashboard, type ActivityData } from '@/components/analytics/ActivityDashboard';
import { FunnelDashboard, type FunnelData } from '@/components/analytics/FunnelDashboard';
import { LossDashboard, type LossData } from '@/components/analytics/LossDashboard';
import { UsersInsightsDashboard, type UsersInsightsData } from '@/components/analytics/UsersInsightsDashboard';
import { Download } from 'lucide-react';

type MainTab = 'performance' | 'activity' | 'funnel' | 'loss' | 'users';

export default function InsightsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('performance');
  const [perfView, setPerfView] = useState<'users' | 'teams'>('users');
  const [compareOrg, setCompareOrg] = useState(true);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loss, setLoss] = useState<LossData | null>(null);
  const [usersInsights, setUsersInsights] = useState<UsersInsightsData | null>(null);
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const loadCore = useCallback(() => {
    const token = getToken();
    if (!token) return;
    setLoadError(null);
    Promise.all([
      apiGet<PerformanceData>('/insights/performance', token),
      apiGet<ActivityData>(`/insights/activity?granularity=${granularity}`, token),
    ])
      .then(([perf, act]) => {
        setPerformance(perf);
        setActivity(act);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load insights');
      });
  }, [granularity]);

  const loadTabData = useCallback((tab: MainTab) => {
    const token = getToken();
    if (!token) return;

    if (tab === 'funnel' && funnel) return;
    if (tab === 'loss' && loss) return;
    if (tab === 'users' && usersInsights) return;

    setTabError(null);
    setTabLoading(true);

    const request =
      tab === 'funnel'
        ? apiGet<FunnelData>('/insights/funnel', token)
        : tab === 'loss'
          ? apiGet<LossData>('/insights/loss', token)
          : tab === 'users'
            ? apiGet<UsersInsightsData>('/insights/users', token)
            : null;

    if (!request) {
      setTabLoading(false);
      return;
    }

    request
      .then((data) => {
        if (tab === 'funnel') setFunnel(data as FunnelData);
        if (tab === 'loss') setLoss(data as LossData);
        if (tab === 'users') setUsersInsights(data as UsersInsightsData);
      })
      .catch((err) => {
        setTabError(err instanceof Error ? err.message : 'Failed to load tab data');
      })
      .finally(() => setTabLoading(false));
  }, [funnel, loss, usersInsights]);

  useEffect(() => { loadCore(); }, [loadCore]);

  useEffect(() => {
    if (mainTab === 'funnel' || mainTab === 'loss' || mainTab === 'users') {
      loadTabData(mainTab);
    }
  }, [mainTab, loadTabData]);

  if (loadError) {
    return (
      <div className="analytics-page">
        <PageHeader title="Insights" subtitle="Pipeline, activity, funnel & loss analytics" />
        <p style={{ color: 'var(--red)' }}>{loadError}</p>
        <Button size="sm" onClick={loadCore} style={{ marginTop: 12 }}>Retry</Button>
      </div>
    );
  }

  if (!performance || !activity) return <PageSkeleton />;

  function exportCsv() {
    const rows = performance!.users.map((u) =>
      [u.name, u.email, u.activeDeals.value, u.openPipeline.value, u.closedWon.value, u.winRate.value, u.totalHours.value].join(','),
    );
    const blob = new Blob([`Name,Email,Active Deals,Pipeline,Closed Won,Win Rate,Hours\n${rows.join('\n')}`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'performance-export.csv';
    a.click();
  }

  function selectTab(tab: MainTab) {
    setMainTab(tab);
    setTabError(null);
  }

  const tabs: { id: MainTab; label: string }[] = [
    { id: 'performance', label: 'Performance' },
    { id: 'activity', label: 'Activity' },
    { id: 'funnel', label: 'Funnel' },
    { id: 'loss', label: 'Loss' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div className="analytics-page">
      <PageHeader
        title="Insights"
        subtitle="Pipeline, activity, funnel & loss analytics"
        actions={
          mainTab === 'performance' ? (
            <Button size="sm" variant="soft" onClick={exportCsv}>
              <Download size={14} style={{ marginRight: 6 }} />
              Export
            </Button>
          ) : undefined
        }
      />

      <div className="analytics-main-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`analytics-main-tab ${mainTab === tab.id ? 'analytics-main-tab--active' : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === 'performance' && (
        <>
          <div className="analytics-toolbar">
            <div className="analytics-segmented">
              <button type="button" className={perfView === 'users' ? 'active' : ''} onClick={() => setPerfView('users')}>Users</button>
              <button type="button" className={perfView === 'teams' ? 'active' : ''} onClick={() => setPerfView('teams')}>Teams</button>
            </div>
            <label className="analytics-checkbox">
              <input type="checkbox" checked={compareOrg} onChange={(e) => setCompareOrg(e.target.checked)} />
              Comparisons vs org average
            </label>
          </div>
          <PerformanceDashboard data={performance} view={perfView} compareOrg={compareOrg} />
        </>
      )}

      {mainTab === 'activity' && (
        <div className="analytics-split">
          <div className="analytics-split__users">
            <PerformanceDashboard data={performance} view="users" compareOrg={compareOrg} compact />
          </div>
          <div className="analytics-split__charts">
            <ActivityDashboard data={activity} onGranularityChange={setGranularity} />
          </div>
        </div>
      )}

      {mainTab === 'funnel' && (
        tabLoading && !funnel ? <PageSkeleton /> : tabError ? (
          <div>
            <p style={{ color: 'var(--red)' }}>{tabError}</p>
            <Button size="sm" onClick={() => loadTabData('funnel')} style={{ marginTop: 12 }}>Retry</Button>
          </div>
        ) : funnel ? <FunnelDashboard data={funnel} /> : null
      )}

      {mainTab === 'loss' && (
        tabLoading && !loss ? <PageSkeleton /> : tabError ? (
          <div>
            <p style={{ color: 'var(--red)' }}>{tabError}</p>
            <Button size="sm" onClick={() => loadTabData('loss')} style={{ marginTop: 12 }}>Retry</Button>
          </div>
        ) : loss ? <LossDashboard data={loss} /> : null
      )}

      {mainTab === 'users' && (
        <>
          <div className="analytics-toolbar">
            <label className="analytics-checkbox">
              <input type="checkbox" checked={compareOrg} onChange={(e) => setCompareOrg(e.target.checked)} />
              Comparisons vs org average
            </label>
          </div>
          {tabLoading && !usersInsights ? <PageSkeleton /> : tabError ? (
            <div>
              <p style={{ color: 'var(--red)' }}>{tabError}</p>
              <Button size="sm" onClick={() => loadTabData('users')} style={{ marginTop: 12 }}>Retry</Button>
            </div>
          ) : usersInsights ? (
            <UsersInsightsDashboard data={usersInsights} compareOrg={compareOrg} />
          ) : null}
        </>
      )}
    </div>
  );
}
