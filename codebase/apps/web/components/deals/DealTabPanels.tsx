'use client';

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DealTabId } from './deal-tabs';

const OverviewTab = lazy(() => import('./tabs/OverviewTab').then((m) => ({ default: m.OverviewTab })));
const PlanTab = lazy(() => import('./tabs/PlanTab').then((m) => ({ default: m.PlanTab })));
const ActivityTab = lazy(() => import('./tabs/ActivityTab').then((m) => ({ default: m.ActivityTab })));
const ParticipantsTab = lazy(() => import('./tabs/ParticipantsTab').then((m) => ({ default: m.ParticipantsTab })));
const NotesTab = lazy(() => import('./tabs/NotesTab').then((m) => ({ default: m.NotesTab })));
const EventsTab = lazy(() => import('./tabs/EventsTab').then((m) => ({ default: m.EventsTab })));
const ProductRequestsTab = lazy(() =>
  import('./tabs/ProductRequestsTab').then((m) => ({ default: m.ProductRequestsTab })),
);
const TeamRequestsTab = lazy(() =>
  import('./tabs/TeamRequestsTab').then((m) => ({ default: m.TeamRequestsTab })),
);
const TasksTab = lazy(() => import('./tabs/TasksTab').then((m) => ({ default: m.TasksTab })));
const FileCenterTab = lazy(() => import('./tabs/FileCenterTab').then((m) => ({ default: m.FileCenterTab })));
const ProjectsTab = lazy(() => import('./tabs/ProjectsTab').then((m) => ({ default: m.ProjectsTab })));
const InsightsTab = lazy(() => import('./tabs/InsightsTab').then((m) => ({ default: m.InsightsTab })));

type DealHeader = {
  title: string;
  companyName: string;
  amount: number;
  stageId?: string;
  isHot?: boolean;
  winProbability: number;
  meddpiccCompleteness: number;
  sentiment: string;
  blockerCount?: number;
  riskScore?: number;
};

type Stage = { id: string; name: string };

function TabFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}

function TabPanel({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div style={{ display: visible ? 'block' : 'none' }} aria-hidden={!visible}>
      {children}
    </div>
  );
}

export function DealTabPanels({
  dealId,
  tab,
  header,
  stages,
}: {
  dealId: string;
  tab: DealTabId;
  header: DealHeader;
  stages: Stage[];
}) {
  const [visited, setVisited] = useState<Set<DealTabId>>(() => new Set([tab]));

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  return (
    <Suspense fallback={<TabFallback />}>
      {visited.has('overview') && (
        <TabPanel visible={tab === 'overview'}>
          <OverviewTab dealId={dealId} header={header} stages={stages} />
        </TabPanel>
      )}
      {visited.has('plan') && (
        <TabPanel visible={tab === 'plan'}>
          <PlanTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('activity') && (
        <TabPanel visible={tab === 'activity'}>
          <ActivityTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('events') && (
        <TabPanel visible={tab === 'events'}>
          <EventsTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('participants') && (
        <TabPanel visible={tab === 'participants'}>
          <ParticipantsTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('product-requests') && (
        <TabPanel visible={tab === 'product-requests'}>
          <ProductRequestsTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('team-requests') && (
        <TabPanel visible={tab === 'team-requests'}>
          <TeamRequestsTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('insights') && (
        <TabPanel visible={tab === 'insights'}>
          <InsightsTab dealId={dealId} header={header} />
        </TabPanel>
      )}
      {visited.has('notes') && (
        <TabPanel visible={tab === 'notes'}>
          <NotesTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('tasks') && (
        <TabPanel visible={tab === 'tasks'}>
          <TasksTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('projects') && (
        <TabPanel visible={tab === 'projects'}>
          <ProjectsTab dealId={dealId} />
        </TabPanel>
      )}
      {visited.has('file-center') && (
        <TabPanel visible={tab === 'file-center'}>
          <FileCenterTab dealId={dealId} />
        </TabPanel>
      )}
    </Suspense>
  );
}
