'use client';

import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Sparkline } from './Sparkline';
import { CHART_AXIS_COLOR, CHART_LEGEND_STYLE, CHART_TICK } from './chartAppearance';

export type ActivityData = {
  granularity: string;
  dataSource?: 'real' | 'empty';
  timeSeries: Array<{
    label: string;
    customerDemo: number;
    external: number;
    internal: number;
    kickoff: number;
    logged: number;
    other: number;
    poc: number;
    postSales: number;
    prep: number;
    workshop: number;
    total: number;
  }>;
  breakdownByType: Array<{
    eventType: string;
    events: number;
    hours: number;
    avgPerEvent: number;
    percentOfTotal: number;
    trend: number[];
  }>;
  donutByType: Array<{ name: string; hours: number; percent: number; color: string }>;
  donutByLabel: Array<{ name: string; hours: number; percent: number; color: string }>;
  tabs?: string[];
};

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

const SERIES_COLORS = {
  customerDemo: 'var(--chart-1)',
  external: 'var(--chart-4)',
  internal: 'var(--chart-2)',
  kickoff: 'var(--chart-1)',
  logged: 'var(--chart-3)',
  other: 'var(--chart-5)',
  poc: 'var(--chart-3)',
  postSales: 'var(--chart-2)',
  prep: 'var(--chart-1)',
  workshop: 'var(--chart-5)',
};

export function ActivityDashboard({
  data,
  onGranularityChange,
}: {
  data: ActivityData;
  onGranularityChange: (g: 'daily' | 'weekly' | 'monthly') => void;
}) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>(
    (data.granularity as 'daily' | 'weekly' | 'monthly') || 'monthly',
  );
  const [activeTab, setActiveTab] = useState('Activity Breakdown');
  const isEmpty = data.dataSource === 'empty' || data.timeSeries.every((b) => b.total === 0);

  function setG(g: 'daily' | 'weekly' | 'monthly') {
    setGranularity(g);
    onGranularityChange(g);
  }

  return (
    <div className="analytics-activity min-w-0 overflow-hidden">
      <div className="analytics-activity__chart-card min-w-0 overflow-hidden">
        <div className="analytics-activity__chart-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3>Activity over time</h3>
          <div className="analytics-toggle-group">
            {(['daily', 'weekly', 'monthly'] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`analytics-toggle ${granularity === g ? 'analytics-toggle--active' : ''}`}
                onClick={() => setG(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {isEmpty ? (
          <p className="analytics-empty-state">No activity recorded yet. Notes, tasks, and deal updates will appear here.</p>
        ) : (
          <div className="min-w-0 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={280} minWidth={280}>
            <ComposedChart data={data.timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={CHART_TICK} stroke={CHART_AXIS_COLOR} />
              <YAxis tick={CHART_TICK} stroke={CHART_AXIS_COLOR} />
              <Tooltip />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} />
              <Bar dataKey="external" stackId="a" fill={SERIES_COLORS.external} />
              <Bar dataKey="customerDemo" stackId="a" fill={SERIES_COLORS.customerDemo} />
              <Bar dataKey="internal" stackId="a" fill={SERIES_COLORS.internal} />
              <Bar dataKey="poc" stackId="a" fill={SERIES_COLORS.poc} />
              <Bar dataKey="kickoff" stackId="a" fill={SERIES_COLORS.kickoff} />
              <Bar dataKey="prep" stackId="a" fill={SERIES_COLORS.prep} />
              <Bar dataKey="workshop" stackId="a" fill={SERIES_COLORS.workshop} />
              <Bar dataKey="logged" stackId="a" fill={SERIES_COLORS.logged} />
              <Bar dataKey="other" stackId="a" fill={SERIES_COLORS.other} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="analytics-tabs">
        {(data.tabs ?? ['Activity Breakdown', 'Deal Breakdown', 'Event Schedule', 'Activity Log']).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`analytics-tab ${activeTab === tab ? 'analytics-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Activity Breakdown' && (
        <div className="analytics-breakdown-grid">
          {isEmpty ? (
            <p className="analytics-empty-state">No activity breakdown yet — sync notes and tasks from your CRM.</p>
          ) : (
            <>
              <div className="analytics-donut-card min-w-0 overflow-hidden">
                <h4>By event type</h4>
                <ResponsiveContainer width="100%" height={200} minWidth={200}>
                  <PieChart>
                    <Pie data={data.donutByType} dataKey="hours" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {data.donutByType.map((d, index) => (
                        <Cell key={d.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v ?? 0}h`, 'Hours']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-donut-card min-w-0 overflow-hidden">
                <h4>By label</h4>
                <ResponsiveContainer width="100%" height={200} minWidth={200}>
                  <PieChart>
                    <Pie data={data.donutByLabel} dataKey="hours" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {data.donutByLabel.map((d, index) => (
                        <Cell key={d.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v ?? 0}h`, 'Hours']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-table-wrap analytics-table-wrap--wide">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Event type</th>
                      <th>Events</th>
                      <th>Hours</th>
                      <th>Avg / event</th>
                      <th>% of total</th>
                      <th>Trend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdownByType.map((row) => (
                      <tr key={row.eventType}>
                        <td><strong>{row.eventType}</strong></td>
                        <td>{row.events}</td>
                        <td>{row.hours}</td>
                        <td>{row.avgPerEvent}h</td>
                        <td>{row.percentOfTotal}%</td>
                        <td><Sparkline data={row.trend} color="var(--chart-4)" /></td>
                        <td><button type="button" className="analytics-view-link">View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab !== 'Activity Breakdown' && (
        <div className="analytics-placeholder">
          <p>
            <strong>{activeTab}</strong> — coming soon.
            {activeTab === 'Deal Breakdown'
              ? ' Pipeline stage activity will map to HubSpot deal stages.'
              : activeTab === 'Event Schedule'
                ? ' Connect Google Calendar for scheduled meetings.'
                : activeTab === 'Activity Log'
                  ? ' Full event log from HubSpot notes, tasks, and webhooks.'
                  : ' Requires Gong / Slack integrations.'}
          </p>
        </div>
      )}
    </div>
  );
}
