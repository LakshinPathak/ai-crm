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
    card: 'from-violet-500/8 via-card to-card hover:shadow-violet-500/10',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_65%)]',
    progress: '**:data-[slot=progress-indicator]:bg-gradient-to-r **:data-[slot=progress-indicator]:from-violet-600 **:data-[slot=progress-indicator]:to-violet-400',
  },
  green: {
    card: 'from-emerald-500/8 via-card to-card hover:shadow-emerald-500/10',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_65%)]',
    progress: '**:data-[slot=progress-indicator]:bg-gradient-to-r **:data-[slot=progress-indicator]:from-emerald-600 **:data-[slot=progress-indicator]:to-emerald-400',
  },
  blue: {
    card: 'from-blue-500/8 via-card to-card hover:shadow-blue-500/10',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_65%)]',
    progress: '**:data-[slot=progress-indicator]:bg-gradient-to-r **:data-[slot=progress-indicator]:from-blue-600 **:data-[slot=progress-indicator]:to-blue-400',
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
        'relative overflow-hidden border-border/60 bg-gradient-to-br shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        styles.card,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 opacity-80', styles.glow)}
      />
      <CardHeader className="relative gap-1 pb-0">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-extrabold tracking-tight tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3 pt-2">
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {progress !== undefined && (
          <Progress value={progress} className={cn('h-1.5', styles.progress)} />
        )}
        {sparkline && <Sparkline data={sparkline} />}
      </CardContent>
    </Card>
  );
}
