import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import { sentimentLabel } from '@/lib/format';

const sentimentClass: Record<string, string> = {
  green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  yellow: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  red: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400',
};

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
      className="border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-400"
    >
      Hot
    </Badge>
  );
}

export function BlockerBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary">
      {count} blocker{count !== 1 ? 's' : ''}
    </Badge>
  );
}

export function DealOutcomeBadge({ status }: { status: 'won' | 'lost' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === 'won'
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400',
      )}
    >
      {status === 'won' ? 'Won' : 'Lost'}
    </Badge>
  );
}
