export function ChangeBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="analytics-change analytics-change--flat">0%</span>;
  const positive = pct > 0;
  return (
    <span className={`analytics-change ${positive ? 'analytics-change--up' : 'analytics-change--down'}`}>
      {positive ? '+' : ''}{pct}%
    </span>
  );
}
