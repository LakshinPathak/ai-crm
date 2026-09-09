'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { HomeResponse, MeResponse } from '@/lib/types';
import { formatMoney, initials } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { DealKanbanCard } from '@/components/ui/DealKanbanCard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarGradient } from '@/lib/colors';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatActivityType(type: string) {
  return type.replace(/_/g, ' ');
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function HomeDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="mt-5 h-px w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="mt-3 h-1.5 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function StageProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  const [from, to] = avatarGradient(name);
  return (
    <Avatar size="sm">
      <AvatarFallback
        className="text-[10px] font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export default function DashboardHomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [home, setHome] = useState<HomeResponse | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGet<MeResponse>('/me', token),
      apiGet<HomeResponse>('/home', token),
    ]).then(([meData, homeData]) => {
      setMe(meData);
      setHome(homeData);
    });
  }, []);

  if (!me || !home) return <HomeDashboardSkeleton />;

  const pipelinePct = home.pipelineSnapshot.dealCount > 0
    ? Math.round((home.pipelineSnapshot.hotCount / home.pipelineSnapshot.dealCount) * 100)
    : 0;

  const maxStageCount = Math.max(1, ...home.pipelineSnapshot.stages.map((s) => s.dealCount));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = me.user.displayName.split(' ')[0];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <PageHeader
          title={`${greeting}, ${firstName}`}
          subtitle={`${me.workspace?.name} · Here's what's happening in your pipeline`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/deals">
                View pipeline
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Open pipeline"
            value={formatMoney(home.pipelineSnapshot.totalAmount)}
            sub={`${home.pipelineSnapshot.dealCount} deals · ${home.pipelineSnapshot.hotCount} hot`}
            progress={pipelinePct}
            accent="purple"
          />
          <Link href="/approvals" className="block transition-transform hover:scale-[1.01]">
            <KpiCard
              label="Pending approvals"
              value={home.approvalCount}
              sub="Awaiting your review"
              accent="blue"
              className="h-full"
            />
          </Link>
          <KpiCard
            label="At-risk deals"
            value={home.pipelineSnapshot.atRiskCount}
            sub="Stalled or red sentiment"
            accent="green"
          />
          <KpiCard
            label="Focus deals"
            value={home.focusDeals.length}
            sub="Priority this week"
            accent="purple"
          />
        </div>

        {home.approvalCount > 0 && (
          <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
            <CheckSquare className="text-primary" />
            <AlertTitle>
              {home.approvalCount} approval{home.approvalCount > 1 ? 's' : ''} need your attention
            </AlertTitle>
            <AlertDescription>Review and approve agent actions</AlertDescription>
            <AlertAction>
              <Button size="sm" asChild>
                <Link href="/approvals">Review</Link>
              </Button>
            </AlertAction>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Flame className="size-4" />
                </div>
                <h2 className="text-base font-bold tracking-tight">Focus deals</h2>
                <Badge variant="secondary">{home.focusDeals.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/deals">See all</Link>
              </Button>
            </div>

            {home.focusDeals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {home.focusDeals.map((deal) => (
                  <DealKanbanCard key={deal.id} deal={deal} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No focus deals right now. Check back after your pipeline updates.
                </CardContent>
              </Card>
            )}

            {home.atRiskDeals.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-4" />
                  </div>
                  <h2 className="text-base font-bold tracking-tight">At-risk deals</h2>
                  <Badge variant="destructive" className="bg-destructive/10 text-destructive">
                    {home.atRiskDeals.length}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {home.atRiskDeals.map((deal) => (
                    <DealKanbanCard key={`risk-${deal.id}`} deal={deal} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-5">
            <Card className="overflow-hidden border-border/70 bg-gradient-to-b from-card to-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <TrendingUp className="size-4 text-primary" />
                  Pipeline snapshot
                </CardTitle>
                <CardDescription>
                  {home.pipelineSnapshot.dealCount} deals · {formatMoney(home.pipelineSnapshot.totalAmount)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {home.pipelineSnapshot.stages.map((stage) => {
                  const pct = Math.round((stage.dealCount / maxStageCount) * 100);
                  return (
                    <div key={stage.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{stage.name}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="h-5 px-1.5 tabular-nums">
                              {stage.dealCount}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{stage.dealCount} deals in {stage.name}</TooltipContent>
                        </Tooltip>
                      </div>
                      <StageProgressBar value={pct} color={stage.color} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <Activity className="size-4 text-primary" />
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-0">
                {home.recentActivity.length > 0 ? (
                  <ScrollArea className="h-[min(420px,50vh)] px-4 pb-4">
                    <div className="space-y-1">
                      {home.recentActivity.map((a, index) => (
                        <div key={`${a.type}-${a.dealId}-${a.at}`}>
                          <div className="flex gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-muted/50">
                            <UserAvatar name={a.title} />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <Link
                                href={`/deals/${a.dealId}`}
                                className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
                              >
                                {a.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {formatActivityType(a.type)} · {formatRelativeTime(a.at)}
                              </p>
                              {a.description && (
                                <p className="line-clamp-2 text-xs text-muted-foreground/90">
                                  {a.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {index < home.recentActivity.length - 1 && (
                            <Separator className="ml-11" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">No recent activity yet.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}
