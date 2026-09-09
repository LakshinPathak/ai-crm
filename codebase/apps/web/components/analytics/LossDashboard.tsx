'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/format';
import { KpiCard } from '@/components/ui/KpiCard';

export type LossData = {
  won: { count: number; value: number };
  lost: { count: number; value: number };
  winRate: number;
  totalLost: number;
  totalLostValue: number;
  reasons: Array<{
    reason: string;
    count: number;
    value: number;
    percent: number;
  }>;
};

const OUTCOME_COLORS = { won: '#14b8a6', lost: '#ef4444' };
const REASON_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#94a3b8'];

export function LossDashboard({ data }: { data: LossData }) {
  const closedCount = data.won.count + data.lost.count;
  const isEmpty = closedCount === 0;
  const outcomeData = [
    { name: 'Won', count: data.won.count, value: data.won.value, color: OUTCOME_COLORS.won },
    { name: 'Lost', count: data.lost.count, value: data.lost.value, color: OUTCOME_COLORS.lost },
  ];
  const reasonChartData = data.reasons.slice(0, 8).map((r) => ({
    reason: r.reason,
    count: r.count,
    percent: r.percent,
  }));

  return (
    <div className="analytics-loss">
      <div className="analytics-kpi-row">
        <KpiCard label="Won deals" value={data.won.count} sub={formatMoney(data.won.value, true)} accent="green" />
        <KpiCard label="Lost deals" value={data.lost.count} sub={formatMoney(data.lost.value, true)} accent="blue" />
        <KpiCard label="Win rate" value={`${data.winRate}%`} sub={`${closedCount} closed deals`} accent="purple" />
        <KpiCard
          label="Lost value"
          value={formatMoney(data.totalLostValue, true)}
          sub={`${data.totalLost} lost deals`}
          accent="blue"
        />
      </div>

      {isEmpty ? (
        <div className="analytics-placeholder">
          <p>No closed deals yet. Won and lost outcomes will appear here once deals close.</p>
        </div>
      ) : (
        <div className="analytics-breakdown-grid">
          <div className="analytics-donut-card">
            <h4>Won vs lost</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {outcomeData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, _name, props) => {
                  const item = props.payload as { name: string; value: number };
                  return [`${v ?? 0} deals`, item?.name ?? ''];
                }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="analytics-breakdown-legend" style={{ justifyContent: 'center' }}>
              {outcomeData.map((d) => (
                <span key={d.name} className="analytics-breakdown-legend__item">
                  <span className="analytics-breakdown-legend__dot" style={{ background: d.color }} />
                  {d.name}: {d.count} ({formatMoney(d.value, true)})
                </span>
              ))}
            </div>
          </div>

          <div className="analytics-activity__chart-card">
            <div className="analytics-activity__chart-header">
              <h3>Loss reasons</h3>
            </div>
            {data.reasons.length === 0 ? (
              <p className="analytics-placeholder" style={{ margin: 0 }}>
                No loss reasons recorded yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, reasonChartData.length * 36)}>
                <BarChart data={reasonChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaef" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                  <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => [`${v ?? 0} deals`, 'Count']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {reasonChartData.map((entry, index) => (
                      <Cell key={entry.reason} fill={REASON_COLORS[index % REASON_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="analytics-table-wrap analytics-table-wrap--wide">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Loss reason</th>
                  <th>Deals</th>
                  <th>Value</th>
                  <th>% of losses</th>
                </tr>
              </thead>
              <tbody>
                {data.reasons.map((row, index) => (
                  <tr key={row.reason}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          marginRight: 8,
                          background: REASON_COLORS[index % REASON_COLORS.length],
                        }}
                      />
                      <strong>{row.reason}</strong>
                    </td>
                    <td>{row.count}</td>
                    <td>{formatMoney(row.value, true)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
