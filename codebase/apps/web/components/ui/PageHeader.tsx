import { type ReactNode } from 'react';
import { cn } from 'cn';
import { Separator } from '@/components/ui/separator';

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {breadcrumb}
          <h1 className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      <Separator className="mt-5 bg-gradient-to-r from-primary/20 via-border to-transparent" />
    </header>
  );
}
