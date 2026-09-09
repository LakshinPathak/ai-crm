'use client';

import { formatMoney, initials } from '@/lib/format';
import { ChangeBadge } from './ChangeBadge';
import { Sparkline } from './Sparkline';
import { ActivityStackedBar } from './ActivityStackedBar';
import { KpiCard } from '@/components/ui/KpiCard';
import { UserAvatar } from '@/components/ui/user-avatar';

type Metric = { value: number; changePct: number };

export type PerformanceData = {
  orgKpis: {
    members: number;
    activeDeals: number;
    activeDealsAvg: number;
    openPipeline: number;
    openPipelineAvg: number;
    closedWon: number;
    closedWonAvg: number;
    winRate: number;
    totalActivityHours: number;
    totalActivityHoursAvg: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    activeDeals: Metric;
    openPipeline: Metric;
    closedWon: Metric;
    winRate: Metric;
    totalHours: Metric;
    activitySparkline: number[];
    activityBreakdown: {
      customerMeeting: number;
      internalMeeting: number;
      dealPrep: number;
      logged: number;
      other: number;
    };
    topLabels: { label: string; hours: number }[];
  }>;
  teams: Array<{
    id: string;
    name: string;
    memberCount: number;
    activeDeals: Metric;
    openPipeline: Metric;
    closedWon: Metric;
    winRate: Metric;
    totalHours: Metric;
  }>;
};

const BREAKDOWN_LEGEND = [
  { key: 'customerMeeting', label: 'Customer Meeting', color: '#3b82f6' },
  { key: 'internalMeeting', label: 'Internal Deal Meeting', color: '#60a5fa' },
  { key: 'dealPrep', label: 'Deal Prep', color: '#8b5cf6' },
  { key: 'logged', label: 'Logged', color: '#f59e0b' },
  { key: 'other', label: 'Other', color: '#cbd5e1' },
] as const;

export function PerformanceDashboard({
  data,
  view,
  compareOrg,
  compact = false,
}: {
  data: PerformanceData;
  view: 'users' | 'teams';
  compareOrg: boolean;
  compact?: boolean;
}) {
  const k = data.orgKpis;

  return (
    <div className={`analytics-performance min-w-0 ${compact ? 'analytics-performance--compact' : ''}`}>
      {!compact && (
      <div className="analytics-kpi-row">
        <KpiCard label="Members" value={k.members} sub="Total members" accent="purple" />
        <KpiCard label="Active deals" value={k.activeDeals} sub={`Avg ${k.activeDealsAvg} per person`} accent="blue" />
        <KpiCard label="Open pipeline" value={formatMoney(k.openPipeline, true)} sub={`Avg ${formatMoney(k.openPipelineAvg, true)}`} accent="green" />
        <KpiCard label="Closed won" value={formatMoney(k.closedWon, true)} sub={`Avg ${formatMoney(k.closedWonAvg, true)}`} accent="green" />
        <KpiCard label="Win rate" value={`${k.winRate}%`} sub="Across members" accent="purple" />
        <KpiCard label="Activity hours" value={k.totalActivityHours} sub={`Avg ${k.totalActivityHoursAvg}h`} accent="blue" />
      </div>
      )}

      {!compact && (
        <div className="analytics-breakdown-legend">
          {BREAKDOWN_LEGEND.map((item) => (
            <span key={item.key} className="analytics-breakdown-legend__item">
              <span className="analytics-breakdown-legend__dot" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>{view === 'users' ? 'User' : 'Team'}</th>
              <th>Active deals</th>
              <th>Open pipeline</th>
              <th>Closed won</th>
              <th>Win rate</th>
              <th>Total hours</th>
              {!compact && <th>Activity</th>}
              <th>Breakdown</th>
              {!compact && <th>Top labels</th>}
            </tr>
          </thead>
          <tbody>
            {view === 'users'
              ? data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="analytics-user-cell">
                        <UserAvatar name={u.name} size="sm" />
                        <div>
                          <div className="analytics-user-name">{u.name}</div>
                          {!compact && <div className="analytics-user-email">{u.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="analytics-metric-cell">
                        <strong>{u.activeDeals.value}</strong>
                        {compareOrg && <ChangeBadge pct={u.activeDeals.changePct} />}
                      </div>
                    </td>
                    <td>
                      <div className="analytics-metric-cell">
                        <strong>{formatMoney(u.openPipeline.value, true)}</strong>
                        {compareOrg && <ChangeBadge pct={u.openPipeline.changePct} />}
                      </div>
                    </td>
                    <td>
                      <div className="analytics-metric-cell">
                        <strong>{formatMoney(u.closedWon.value, true)}</strong>
                        {compareOrg && <ChangeBadge pct={u.closedWon.changePct} />}
                      </div>
                    </td>
                    <td>
                      <div className="analytics-metric-cell">
                        <strong>{u.winRate.value}%</strong>
                        {compareOrg && <ChangeBadge pct={u.winRate.changePct} />}
                      </div>
                    </td>
                    <td>
                      <div className="analytics-metric-cell">
                        <strong>{u.totalHours.value.toFixed(compact ? 0 : 2)} hours</strong>
                        {compareOrg && <ChangeBadge pct={u.totalHours.changePct} />}
                      </div>
                    </td>
                    {!compact && <td><Sparkline data={u.activitySparkline} /></td>}
                    <td><ActivityStackedBar breakdown={u.activityBreakdown} /></td>
                    {!compact && (
                      <td>
                        <div className="analytics-labels">
                          {u.topLabels.slice(0, 3).map((l) => (
                            <span key={l.label}>{l.label}: {l.hours}h</span>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              : data.teams.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="analytics-user-cell">
                        <div className="analytics-team-icon">{initials(t.name)}</div>
                        <div>
                          <div className="analytics-user-name">{t.name}</div>
                          <div className="analytics-user-email">{t.memberCount} members</div>
                        </div>
                      </div>
                    </td>
                    <td><strong>{t.activeDeals.value}</strong> <ChangeBadge pct={t.activeDeals.changePct} /></td>
                    <td><strong>{formatMoney(t.openPipeline.value, true)}</strong></td>
                    <td><strong>{formatMoney(t.closedWon.value, true)}</strong></td>
                    <td><strong>{t.winRate.value}%</strong></td>
                    <td><strong>{t.totalHours.value}h</strong></td>
                    <td colSpan={3} />
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
