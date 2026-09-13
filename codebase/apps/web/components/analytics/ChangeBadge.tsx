export function ChangeBadge({ pct }: { pct: number }) {
  if (pct === 0) {
    return (
      <span className="rounded px-1.5 py-px text-[0.7rem] font-semibold text-foreground/70">
        0%
      </span>
    );
  }
  const positive = pct > 0;
  return (
    <span
      className="rounded px-1.5 py-px text-[0.7rem] font-semibold"
      style={{
        color: positive
          ? 'color-mix(in oklch, var(--green-text) 55%, var(--foreground))'
          : 'color-mix(in oklch, var(--red-text) 55%, var(--foreground))',
        background: positive ? 'var(--green-bg)' : 'var(--red-bg)',
      }}
    >
      {positive ? '+' : ''}
      {pct}%
    </span>
  );
}
