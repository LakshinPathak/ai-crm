'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PerformanceDashboard, type PerformanceData } from '@/components/analytics/PerformanceDashboard';
import { ActivityDashboard, type ActivityData } from '@/components/analytics/ActivityDashboard';
import { FunnelDashboard, type FunnelData } from '@/components/analytics/FunnelDashboard';
import { LossDashboard, type LossData } from '@/components/analytics/LossDashboard';
import { UsersInsightsDashboard, type UsersInsightsData } from '@/components/analytics/UsersInsightsDashboard';

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
      <div className="analytics-page min-w-0">
        <PageHeader title="Insights" subtitle="Pipeline, activity, funnel & loss analytics" />
        <p className="text-destructive">{loadError}</p>
        <Button size="sm" onClick={loadCore} className="mt-3">Retry</Button>
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

  return (
    <div className="analytics-page min-w-0">
      <PageHeader
        title="Insights"
        subtitle="Pipeline, activity, funnel & loss analytics"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link href="/insights/sql">SQL explorer</Link>
            </Button>
            {mainTab === 'performance' ? (
              <Button size="sm" variant="secondary" onClick={exportCsv}>
                <Download size={14} />
                Export
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs value={mainTab} onValueChange={(v) => selectTab(v as MainTab)} className="mt-4 min-w-0">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="performance" className="shrink-0">Performance</TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0">Activity</TabsTrigger>
          <TabsTrigger value="funnel" className="shrink-0">Funnel</TabsTrigger>
          <TabsTrigger value="loss" className="shrink-0">Loss</TabsTrigger>
          <TabsTrigger value="users" className="shrink-0">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <div className="analytics-toolbar mb-4 flex flex-wrap items-center gap-4">
            <ToggleGroup
              type="single"
              value={perfView}
              onValueChange={(v) => v && setPerfView(v as 'users' | 'teams')}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="users">Users</ToggleGroupItem>
              <ToggleGroupItem value="teams">Teams</ToggleGroupItem>
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <Checkbox
                id="compare-org-perf"
                checked={compareOrg}
                onCheckedChange={(checked) => setCompareOrg(checked === true)}
              />
              <Label htmlFor="compare-org-perf" className="text-sm font-normal">
                Comparisons vs org average
              </Label>
            </div>
          </div>
          <PerformanceDashboard data={performance} view={perfView} compareOrg={compareOrg} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="analytics-split">
            <div className="analytics-split__users">
              <PerformanceDashboard data={performance} view="users" compareOrg={compareOrg} compact />
            </div>
            <div className="analytics-split__charts">
              <ActivityDashboard data={activity} onGranularityChange={setGranularity} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="mt-4">
          {tabLoading && !funnel ? <PageSkeleton /> : tabError ? (
            <div>
              <p className="text-destructive">{tabError}</p>
              <Button size="sm" onClick={() => loadTabData('funnel')} className="mt-3">Retry</Button>
            </div>
          ) : funnel ? <FunnelDashboard data={funnel} /> : null}
        </TabsContent>

        <TabsContent value="loss" className="mt-4">
          {tabLoading && !loss ? <PageSkeleton /> : tabError ? (
            <div>
              <p className="text-destructive">{tabError}</p>
              <Button size="sm" onClick={() => loadTabData('loss')} className="mt-3">Retry</Button>
            </div>
          ) : loss ? <LossDashboard data={loss} /> : null}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="analytics-toolbar mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="compare-org-users"
                checked={compareOrg}
                onCheckedChange={(checked) => setCompareOrg(checked === true)}
              />
              <Label htmlFor="compare-org-users" className="text-sm font-normal">
                Comparisons vs org average
              </Label>
            </div>
          </div>
          {tabLoading && !usersInsights ? <PageSkeleton /> : tabError ? (
            <div>
              <p className="text-destructive">{tabError}</p>
              <Button size="sm" onClick={() => loadTabData('users')} className="mt-3">Retry</Button>
            </div>
          ) : usersInsights ? (
            <UsersInsightsDashboard data={usersInsights} compareOrg={compareOrg} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
