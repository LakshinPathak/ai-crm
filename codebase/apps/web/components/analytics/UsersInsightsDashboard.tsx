'use client';

import { PerformanceDashboard, type PerformanceData } from './PerformanceDashboard';

export type UsersInsightsData = {
  users: PerformanceData['users'];
};

function toPerformanceData(data: UsersInsightsData): PerformanceData {
  const users = data.users;
  const memberCount = Math.max(users.length, 1);
  const activeDeals = users.reduce((sum, u) => sum + u.activeDeals.value, 0);
  const openPipeline = users.reduce((sum, u) => sum + u.openPipeline.value, 0);
  const closedWon = users.reduce((sum, u) => sum + u.closedWon.value, 0);
  const totalActivityHours = users.reduce((sum, u) => sum + u.totalHours.value, 0);
  const winRate = users.length
    ? Math.round(users.reduce((sum, u) => sum + u.winRate.value, 0) / users.length)
    : 0;

  return {
    orgKpis: {
      members: users.length,
      activeDeals,
      activeDealsAvg: Math.round(activeDeals / memberCount),
      openPipeline,
      openPipelineAvg: Math.round(openPipeline / memberCount),
      closedWon,
      closedWonAvg: Math.round(closedWon / memberCount),
      winRate,
      totalActivityHours: Math.round(totalActivityHours * 10) / 10,
      totalActivityHoursAvg: Math.round((totalActivityHours / memberCount) * 10) / 10,
    },
    users,
    teams: [],
  };
}

export function UsersInsightsDashboard({
  data,
  compareOrg,
}: {
  data: UsersInsightsData;
  compareOrg: boolean;
}) {
  if (data.users.length === 0) {
    return (
      <div className="analytics-placeholder">
        <p>No active team members found. Invite members to see user-level insights.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <PerformanceDashboard data={toPerformanceData(data)} view="users" compareOrg={compareOrg} />
    </div>
  );
}
