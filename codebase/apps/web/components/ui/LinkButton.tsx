import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'soft' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
}: Props) {
  return (
    <Link
      href={href}
      className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`.trim()}
    >
      {icon && <span className="ui-btn__icon">{icon}</span>}
      {children}
    </Link>
  );
}
