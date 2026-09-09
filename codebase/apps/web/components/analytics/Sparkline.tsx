'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

export function Sparkline({ data, color = '#7c3aed' }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="analytics-sparkline">
      <ResponsiveContainer width="100%" height={36}>
        <LineChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
