export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`ui-skeleton ${className}`} style={style} />;
}

export function PageSkeleton() {
  return (
    <div className="ui-page-skeleton">
      <Skeleton style={{ height: 32, width: 200, marginBottom: 8 }} />
      <Skeleton style={{ height: 16, width: 140, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <Skeleton style={{ height: 100 }} />
        <Skeleton style={{ height: 100 }} />
        <Skeleton style={{ height: 100 }} />
      </div>
      <Skeleton style={{ height: 280 }} />
    </div>
  );
}
