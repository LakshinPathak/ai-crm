import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

export type ShadcnBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export function agentCategoryBadge(cat: string): ShadcnBadgeVariant {
  const map: Record<string, ShadcnBadgeVariant> = {
    process: 'secondary',
    risk: 'destructive',
    signals: 'outline',
    reporting: 'secondary',
  };
  return map[cat] ?? 'outline';
}

export function agentRunStatusBadge(status: string): ShadcnBadgeVariant {
  if (status === 'completed') return 'default';
  if (status === 'running') return 'secondary';
  if (status === 'awaiting_approval' || status === 'failed') return 'destructive';
  return 'outline';
}

export function integrationStatusBadge(status: string): ShadcnBadgeVariant | null {
  if (status === 'available') return null;
  if (status === 'connected' || status === 'enabled') return 'default';
  if (status === 'warning') return 'outline';
  return 'outline';
}

/** Maps legacy CSS badge variant names to shadcn variants. */
export function legacyBadgeVariant(variant: string): ShadcnBadgeVariant {
  const map: Record<string, ShadcnBadgeVariant> = {
    default: 'secondary',
    green: 'default',
    enabled: 'default',
    blue: 'secondary',
    teal: 'secondary',
    yellow: 'outline',
    warning: 'outline',
    red: 'destructive',
    hot: 'destructive',
    blocker: 'destructive',
    risk: 'destructive',
    process: 'secondary',
    signals: 'outline',
    reporting: 'outline',
    coming_soon: 'outline',
  };
  return map[variant] ?? 'secondary';
}
