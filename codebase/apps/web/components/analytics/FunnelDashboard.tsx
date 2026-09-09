'use client';

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/format';
import { KpiCard } from '@/components/ui/KpiCard';

export type FunnelData = {
  totalDeals: number;
  stages: Array<{
    stageId: string;
    name: string;
    position: number;
    stageType: string;
    count: number;
    value: number;
    conversionRate: number;
  }>;
};

const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#3b82f6', '#14b8a6', '#f59e0b', '#94a3b8'];

export function FunnelDashboard({ data }: { data: FunnelData }) {
  const isEmpty = data.totalDeals === 0 || data.stages.every((s) => s.count === 0);
  const chartData = data.stages.map((stage) => ({
    name: stage.name,
    count: stage.count,
    value: stage.value,
    conversionRate: stage.conversionRate,
  }));

  return (
    <div className="analytics-funnel min-w-0 overflow-hidden">
      <div className="analytics-kpi-row">
        <KpiCard label="Total deals" value={data.totalDeals} sub="Across all pipeline stages" accent="purple" />
        <KpiCard
          label="Pipeline value"
          value={formatMoney(data.stages.reduce((sum, s) => sum + s.value, 0), true)}
          sub="Sum of stage values"
          accent="blue"
        />
        <KpiCard
          label="Stages"
          value={data.stages.length}
          sub="Configured in sales process"
          accent="green"
        />
      </div>

      <div className="analytics-activity__chart-card min-w-0 overflow-hidden">
        <div className="analytics-activity__chart-header">
          <h3>Stage conversion funnel</h3>
        </div>
        {isEmpty ? (
          <p className="analytics-placeholder" style={{ margin: 0 }}>
            No deals in the pipeline yet. Deals will appear here as they move through stages.
          </p>
        ) : (
          <div className="min-w-0 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaef" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Deals') return [value ?? 0, 'Deals'];
                  if (name === 'Conversion') return [`${value ?? 0}%`, 'Conversion'];
                  return [value ?? 0, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversionRate"
                name="Conversion"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Type</th>
              <th>Deals</th>
              <th>Value</th>
              <th>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {data.stages.map((stage, index) => (
              <tr key={stage.stageId}>
                <td>
                  <strong>{stage.name}</strong>
                  <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: '0.75rem' }}>
                    #{stage.position + 1}
                  </span>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{stage.stageType.replace(/_/g, ' ')}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      marginRight: 6,
                      background: STAGE_COLORS[index % STAGE_COLORS.length],
                    }}
                  />
                  {stage.count}
                </td>
                <td>{formatMoney(stage.value, true)}</td>
                <td>{stage.conversionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
