import { type ReactNode } from 'react';

export function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`ui-card${hover ? ' ui-card--hover' : ''}${padding ? '' : ' ui-card--flush'} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
