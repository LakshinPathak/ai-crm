'use client';

import Link from 'next/link';
import { Building2, Smile, Star } from 'lucide-react';
import { cn } from 'cn';
import type { DealCard } from '@/lib/types';
import { avatarGradient } from '@/lib/colors';
import { formatMoney, initials, sentimentLabel, fitScore } from '@/lib/format';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SemanticColor = 'green' | 'yellow' | 'red' | 'teal';

const sentimentBadgeClass: Record<SemanticColor, string> = {
  green: 'border-transparent bg-[var(--green-bg)] text-[var(--green-text)]',
  yellow: 'border-transparent bg-[var(--yellow-bg)] text-[var(--yellow-text)]',
  red: 'border-transparent bg-[var(--red-bg)] text-[var(--red-text)]',
  teal: 'border-transparent bg-[var(--teal-bg)] text-[var(--blue-text)]',
};

function NameAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'default' }) {
  const [from, to] = avatarGradient(name);
  return (
    <Avatar size={size} className="ring-1 ring-border/60">
      <AvatarFallback
        className="text-[10px] font-semibold text-primary-foreground"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function PropRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground/80">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: SemanticColor | 'hot' | 'blocker';
}) {
  if (tone === 'hot') {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-[var(--yellow-bg)] text-[var(--yellow-text)] hover:bg-[var(--yellow-bg)]"
      >
        {children}
      </Badge>
    );
  }
  if (tone === 'blocker') {
    return (
      <Badge variant="outline" className="border-transparent bg-[var(--red-bg)] text-[var(--red-text)]">
        {children}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={sentimentBadgeClass[tone]}>
      {children}
    </Badge>
  );
}

export function DealKanbanCard({ deal, showOpine = false }: { deal: DealCard; showOpine?: boolean }) {
  const fit = fitScore(deal.winProbability);
  const winPct = Math.min(deal.winProbability, 100);

  return (
    <TooltipProvider delayDuration={200}>
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>
          <Link href={`/deals/${deal.id}`} className="block">
            <Card
              className={cn(
                'group min-w-0 overflow-hidden border-border bg-card py-0 shadow-sm transition-colors duration-200',
                'hover:border-primary/20 hover:bg-muted',
              )}
            >
              <CardHeader className="gap-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <NameAvatar name={deal.companyName} size="sm" />
                    <CardTitle className="line-clamp-2 text-sm leading-snug font-semibold">
                      {deal.title}
                    </CardTitle>
                  </div>
                  {deal.blockerCount && deal.blockerCount > 0 ? (
                    <StatusBadge tone="blocker">
                      {deal.blockerCount} blocker{deal.blockerCount > 1 ? 's' : ''}
                    </StatusBadge>
                  ) : deal.isHot ? (
                    <StatusBadge tone="hot">Hot</StatusBadge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-lg font-extrabold tracking-tight text-foreground">
                  <span className="min-w-0 truncate">{formatMoney(deal.amount)}</span>
                  {showOpine && deal.meddpiccCompleteness !== undefined && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {deal.meddpiccCompleteness}% MEDDPICC
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pb-3">
                {deal.companyName ? (
                  <PropRow icon={<Building2 className="size-3.5" />}>{deal.companyName}</PropRow>
                ) : null}
                <PropRow icon={<Smile className="size-3.5" />}>
                  <StatusBadge tone={deal.sentiment as SemanticColor}>
                    {sentimentLabel(deal.sentiment)}
                  </StatusBadge>
                </PropRow>
                <PropRow icon={<Star className="size-3.5" />}>
                  <StatusBadge tone={fit.color as SemanticColor}>
                    {fit.label}
                  </StatusBadge>
                </PropRow>
              </CardContent>

              <CardFooter className="border-t bg-muted p-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full px-0 py-0">
                      <Progress
                        value={winPct}
                        className="h-1 rounded-none bg-transparent **:data-[slot=progress-indicator]:rounded-none **:data-[slot=progress-indicator]:bg-primary"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {winPct}% win probability
                  </TooltipContent>
                </Tooltip>
              </CardFooter>
            </Card>
          </Link>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <NameAvatar name={deal.companyName} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{deal.title}</p>
                <p className="text-xs text-muted-foreground">{deal.companyName}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatMoney(deal.amount)} · {winPct}% win probability
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    </TooltipProvider>
  );
}
