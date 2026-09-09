'use client';

const COLORS = {
  customerMeeting: '#3b82f6',
  internalMeeting: '#60a5fa',
  dealPrep: '#8b5cf6',
  logged: '#f59e0b',
  other: '#cbd5e1',
};

type Breakdown = {
  customerMeeting: number;
  internalMeeting: number;
  dealPrep: number;
  logged: number;
  other: number;
};

export function ActivityStackedBar({ breakdown }: { breakdown: Breakdown }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const segments = [
    { key: 'customerMeeting', value: breakdown.customerMeeting },
    { key: 'internalMeeting', value: breakdown.internalMeeting },
    { key: 'dealPrep', value: breakdown.dealPrep },
    { key: 'logged', value: breakdown.logged },
    { key: 'other', value: breakdown.other },
  ].filter((s) => s.value > 0);

  return (
    <div className="analytics-stacked-bar" title={`${total.toFixed(1)}h total`}>
      {segments.map((s) => (
        <div
          key={s.key}
          className="analytics-stacked-bar__seg"
          style={{
            width: `${(s.value / total) * 100}%`,
            background: COLORS[s.key as keyof typeof COLORS],
          }}
        />
      ))}
    </div>
  );
}
