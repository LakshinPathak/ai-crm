'use client';

import Link from 'next/link';
import { Building2, Smile, Star, User } from 'lucide-react';
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
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  teal: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300',
};

function NameAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'default' }) {
  const [from, to] = avatarGradient(name);
  return (
    <Avatar size={size} className="ring-1 ring-border/60">
      <AvatarFallback
        className="text-[10px] font-semibold text-white"
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
      <Badge variant="destructive" className="bg-orange-500/15 text-orange-700 hover:bg-orange-500/20 dark:text-orange-300">
        {children}
      </Badge>
    );
  }
  if (tone === 'blocker') {
    return <Badge variant="destructive">{children}</Badge>;
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
                'group overflow-hidden border-border/70 bg-card/95 py-0 shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
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

                <div className="text-lg font-extrabold tracking-tight text-foreground">
                  {formatMoney(deal.amount)}
                  {showOpine && deal.meddpiccCompleteness !== undefined && (
                    <Badge variant="secondary" className="ml-2 align-middle text-[10px]">
                      {deal.meddpiccCompleteness}% MEDDPICC
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pb-3">
                <PropRow icon={<Building2 className="size-3.5" />}>{deal.companyName}</PropRow>
                <PropRow icon={<User className="size-3.5" />}>
                  <span className="inline-flex items-center gap-1.5">
                    <NameAvatar name={deal.companyName} size="sm" />
                    Deal owner
                  </span>
                </PropRow>
                <PropRow icon={<User className="size-3.5" />}>
                  <span className="inline-flex items-center gap-1.5">
                    <NameAvatar name="Solutions Engineer" size="sm" />
                    Solutions Engineer
                  </span>
                </PropRow>
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

              <CardFooter className="border-t bg-muted/30 p-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full px-0 py-0">
                      <Progress
                        value={winPct}
                        className="h-1 rounded-none bg-transparent **:data-[slot=progress-indicator]:rounded-none **:data-[slot=progress-indicator]:bg-gradient-to-r **:data-[slot=progress-indicator]:from-violet-600 **:data-[slot=progress-indicator]:to-violet-400"
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
