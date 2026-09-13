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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          {breadcrumb}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
      <Separator className="mt-5 bg-border" />
    </header>
  );
}
