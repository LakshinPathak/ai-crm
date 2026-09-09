import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'soft' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  style?: React.CSSProperties;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`.trim()}
      {...props}
    >
      {icon && <span className="ui-btn__icon">{icon}</span>}
      {children}
    </button>
  );
}
