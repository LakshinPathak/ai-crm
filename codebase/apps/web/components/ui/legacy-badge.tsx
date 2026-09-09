type BadgeVariant =
  | 'default' | 'green' | 'yellow' | 'red' | 'teal' | 'blue'
  | 'hot' | 'blocker' | 'process' | 'risk' | 'signals' | 'reporting'
  | 'enabled' | 'warning' | 'coming_soon';

export function Badge({
  children,
  variant = 'default',
  dot,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: 'green' | 'yellow' | 'red' | 'teal' | 'purple' | 'blue';
}) {
  return (
    <span className={`ui-badge ui-badge--${variant}`}>
      {dot && <span className={`ui-dot ui-dot--${dot}`} />}
      {children}
    </span>
  );
}
