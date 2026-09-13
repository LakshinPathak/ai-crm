import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import { sentimentLabel } from '@/lib/format';

/** Dark ink on pastel wash — never white-on-light emerald. */
export const pastelBadgeClass = {
  green: 'border-[color:var(--green)]/30 bg-[var(--green-bg)] text-[var(--green-text)]',
  yellow: 'border-[color:var(--yellow)]/30 bg-[var(--yellow-bg)] text-[var(--yellow-text)]',
  red: 'border-[color:var(--red)]/30 bg-[var(--red-bg)] text-[var(--red-text)]',
} as const;

export const wonActionClassName =
  'border-transparent bg-[var(--green-bg)] text-[var(--green-text)] hover:bg-[var(--green-bg)] hover:text-[var(--green-text)] hover:opacity-90';

const sentimentClass: Record<string, string> = pastelBadgeClass;

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <Badge variant="outline" className={cn(sentimentClass[sentiment])}>
      {sentimentLabel(sentiment)}
    </Badge>
  );
}

export function HotBadge() {
  return (
    <Badge
      variant="outline"
      className="border-[color:var(--chart-3)]/35 bg-[color-mix(in_oklch,var(--chart-3)_22%,var(--card))] text-[var(--yellow-text)]"
    >
      Hot
    </Badge>
  );
}

export function BlockerBadge({ count }: { count: number }) {
  return (
    <Badge variant="outline" className={pastelBadgeClass.red}>
      {count} blocker{count !== 1 ? 's' : ''}
    </Badge>
  );
}

export function DealOutcomeBadge({ status }: { status: 'won' | 'lost' }) {
  return (
    <Badge
      variant="outline"
      className={cn(status === 'won' ? pastelBadgeClass.green : pastelBadgeClass.red)}
    >
      {status === 'won' ? 'Won' : 'Lost'}
    </Badge>
  );
}
