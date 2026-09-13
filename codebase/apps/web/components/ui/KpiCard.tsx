'use client';

import { cn } from 'cn';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkline } from './Sparkline';

const accentStyles = {
  purple: {
    card: 'from-primary/10 via-card to-card',
    progress: '**:data-[slot=progress-indicator]:bg-primary',
  },
  green: {
    card: 'from-[var(--green-bg)] via-card to-card',
    progress: '**:data-[slot=progress-indicator]:bg-[var(--green)]',
  },
  blue: {
    card: 'from-[var(--blue-bg)] via-card to-card',
    progress: '**:data-[slot=progress-indicator]:bg-[var(--teal)]',
  },
} as const;

export function KpiCard({
  label,
  value,
  sub,
  progress,
  sparkline,
  accent = 'purple',
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  progress?: number;
  sparkline?: number[];
  accent?: 'purple' | 'green' | 'blue';
  className?: string;
}) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border bg-card bg-gradient-to-br text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md',
        styles.card,
        className,
      )}
    >
      <CardHeader className="relative gap-1 pb-0">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-extrabold tracking-tight text-card-foreground tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3 pt-2">
        {sub && <p className="text-xs text-[var(--text-secondary)]">{sub}</p>}
        {progress !== undefined && (
          <Progress value={progress} className={cn('h-1.5 bg-muted', styles.progress)} />
        )}
        {sparkline && <Sparkline data={sparkline} />}
      </CardContent>
    </Card>
  );
}
