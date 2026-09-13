import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border border-dashed bg-card shadow-none ring-0">
      <CardContent className="flex flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-12">
        {icon && (
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-dashed border-border bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}
