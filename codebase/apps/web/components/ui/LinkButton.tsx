import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type Variant = 'primary' | 'ghost' | 'soft' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantMap: Record<Variant, 'default' | 'ghost' | 'secondary' | 'destructive'> = {
  primary: 'default',
  ghost: 'ghost',
  soft: 'secondary',
  success: 'default',
  danger: 'destructive',
};

const sizeMap: Record<Size, 'sm' | 'default' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

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
  className,
  children,
}: Props) {
  return (
    <Button variant={variantMap[variant]} size={sizeMap[size]} className={cn(className)} asChild>
      <Link href={href}>
        {icon}
        {children}
      </Link>
    </Button>
  );
}
