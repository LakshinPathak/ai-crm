import type { Types } from 'mongoose';

export const ACTIVITY_TYPES = [
  'customerMeeting',
  'internalMeeting',
  'dealPrep',
  'logged',
  'other',
] as const;

export const ACTIVITY_LABELS = [
  'POC',
  'Customer Demo',
  'Kickoff Call',
  'Workshop',
  'External',
  'Internal',
] as const;

export type ActivityBreakdown = Record<(typeof ACTIVITY_TYPES)[number], number>;

export type MetricWithChange = { value: number; changePct: number };

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function inRange(d: Date, start: Date, end: Date): boolean {
  return d >= start && d < end;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  const dow = day.getDay();
  day.setDate(day.getDate() - dow);
  return day;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function bucketKey(d: Date, granularity: 'daily' | 'weekly' | 'monthly'): string {
  if (granularity === 'daily') return startOfDay(d).toISOString().slice(0, 10);
  if (granularity === 'weekly') return startOfWeek(d).toISOString().slice(0, 10);
  return monthKey(d);
}

function bucketLabel(d: Date, granularity: 'daily' | 'weekly' | 'monthly'): string {
  if (granularity === 'monthly') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  if (granularity === 'weekly') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function emptyTimeSeriesBucket(label: string): ActivityTimeSeriesBucket {
  return {
    label,
    customerDemo: 0,
    external: 0,
    internal: 0,
    kickoff: 0,
    logged: 0,
    other: 0,
    poc: 0,
    postSales: 0,
    prep: 0,
    workshop: 0,
    total: 0,
  };
}

export function buildUserActivityProfile(params: {
  noteCount: number;
  taskCount: number;
  agentRunCount: number;
  dealCount: number;
  discoveryDeals: number;
  proposalDeals: number;
}): { breakdown: ActivityBreakdown; labels: { label: string; hours: number }[]; totalHours: number } {
  const { noteCount, taskCount, agentRunCount, dealCount, discoveryDeals, proposalDeals } = params;

  const logged = noteCount * 0.5;
  const dealPrep = taskCount * 1.0 + dealCount * 0.3;
  const internalMeeting = agentRunCount * 1.5;
  const customerMeeting = dealCount * 2.0;
  const other = dealCount * 0.5;

  const breakdown: ActivityBreakdown = {
    customerMeeting: round(customerMeeting),
    internalMeeting: round(internalMeeting),
    dealPrep: round(dealPrep),
    logged: round(logged),
    other: round(other),
  };

  const labels = [
    { label: 'POC', hours: round(proposalDeals * 3.0) },
    { label: 'Customer Demo', hours: round(discoveryDeals * 2.0) },
    { label: 'Kickoff Call', hours: round(dealCount * 0.8) },
    { label: 'Workshop', hours: round(dealCount * 0.5) },
    { label: 'External', hours: round(breakdown.customerMeeting * 0.7) },
    { label: 'Internal', hours: round(breakdown.internalMeeting * 0.9) },
  ]
    .filter((l) => l.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const totalHours = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { breakdown, labels, totalHours: round(totalHours) };
}

export function buildActivitySparkline(
  notes: Array<{ createdAt?: Date | null }>,
  tasks: Array<{ createdAt?: Date | null }>,
  deals: Array<{ lastActivityAt?: Date | null; updatedAt?: Date | null; createdAt?: Date | null }>,
  points = 12,
): number[] {
  const now = new Date();
  const buckets: number[] = [];

  for (let i = points - 1; i >= 0; i -= 1) {
    const weekStart = startOfWeek(new Date(now));
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let count = 0;
    for (const note of notes) {
      if (note.createdAt && inRange(note.createdAt, weekStart, weekEnd)) count += 1;
    }
    for (const task of tasks) {
      if (task.createdAt && inRange(task.createdAt, weekStart, weekEnd)) count += 1;
    }
    for (const deal of deals) {
      const at = deal.lastActivityAt ?? deal.updatedAt ?? deal.createdAt;
      if (at && inRange(at, weekStart, weekEnd)) count += 1;
    }
    buckets.push(count);
  }

  return buckets;
}

export type DealDoc = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  amount?: number;
  status: string;
  sentiment?: string;
  isHot?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastActivityAt?: Date | null;
  stageId?: Types.ObjectId;
};

export type StageDoc = { _id: Types.ObjectId; name: string; stageType: string };

function dealActivityAt(deal: DealDoc): Date | undefined {
  return deal.lastActivityAt ?? deal.updatedAt ?? deal.createdAt;
}

function stageName(stageMap: Map<string, StageDoc>, stageId?: Types.ObjectId): string | undefined {
  return stageMap.get(stageId?.toString() ?? '')?.name;
}

export function computeUserPerformance(
  userId: string,
  displayName: string,
  email: string,
  deals: DealDoc[],
  stages: StageDoc[],
  userNotes: Array<{ createdAt?: Date | null }>,
  userTasks: Array<{ createdAt?: Date | null; status?: string; title?: string }>,
  agentRunCount: number,
  prevAgentRunCount: number,
  periodStart: Date,
  prevStart: Date,
  now: Date,
) {
  const stageMap = new Map(stages.map((s) => [s._id.toString(), s]));
  const open = deals.filter((d) => d.status === 'open');
  const won = deals.filter((d) => d.status === 'won');

  const openPipeline = open.reduce((s, d) => s + (d.amount ?? 0), 0);
  const closedWon = won.reduce((s, d) => s + (d.amount ?? 0), 0);
  const winRate =
    open.length + won.length > 0 ? Math.round((won.length / (open.length + won.length)) * 100) : 0;

  const currNotes = userNotes.filter((n) => n.createdAt && inRange(n.createdAt, periodStart, now));
  const prevNotes = userNotes.filter((n) => n.createdAt && inRange(n.createdAt, prevStart, periodStart));
  const currTasks = userTasks.filter((t) => t.createdAt && inRange(t.createdAt, periodStart, now));
  const prevTasks = userTasks.filter((t) => t.createdAt && inRange(t.createdAt, prevStart, periodStart));

  const currDeals = deals.filter((d) => {
    const t = dealActivityAt(d);
    return t && inRange(t, periodStart, now);
  });
  const prevDeals = deals.filter((d) => {
    const t = dealActivityAt(d);
    return t && inRange(t, prevStart, periodStart);
  });

  const currOpen = currDeals.filter((d) => d.status === 'open');
  const prevOpen = prevDeals.filter((d) => d.status === 'open');
  const currWon = currDeals.filter((d) => d.status === 'won');
  const prevWon = prevDeals.filter((d) => d.status === 'won');

  const currPipeline = currOpen.reduce((s, d) => s + (d.amount ?? 0), 0);
  const prevPipeline = prevOpen.reduce((s, d) => s + (d.amount ?? 0), 0);
  const currClosedWon = currWon.reduce((s, d) => s + (d.amount ?? 0), 0);
  const prevClosedWon = prevWon.reduce((s, d) => s + (d.amount ?? 0), 0);

  const currClosedCount = currDeals.filter((d) => d.status === 'won' || d.status === 'lost').length;
  const prevClosedCount = prevDeals.filter((d) => d.status === 'won' || d.status === 'lost').length;
  const currWinRate =
    currClosedCount > 0 ? Math.round((currWon.length / currClosedCount) * 100) : 0;
  const prevWinRate =
    prevClosedCount > 0 ? Math.round((prevWon.length / prevClosedCount) * 100) : 0;

  const discoveryDeals = open.filter((d) => stageName(stageMap, d.stageId) === 'Discovery').length;
  const proposalDeals = open.filter((d) => stageName(stageMap, d.stageId) === 'Proposal').length;
  const prevOpenDeals = prevDeals.filter((d) => d.status === 'open');
  const prevDiscoveryDeals = prevOpenDeals.filter((d) => stageName(stageMap, d.stageId) === 'Discovery').length;
  const prevProposalDeals = prevOpenDeals.filter((d) => stageName(stageMap, d.stageId) === 'Proposal').length;

  const activity = buildUserActivityProfile({
    noteCount: currNotes.length,
    taskCount: currTasks.length,
    agentRunCount,
    dealCount: deals.length,
    discoveryDeals,
    proposalDeals,
  });

  const prevActivity = buildUserActivityProfile({
    noteCount: prevNotes.length,
    taskCount: prevTasks.length,
    agentRunCount: prevAgentRunCount,
    dealCount: prevDeals.length,
    discoveryDeals: prevDiscoveryDeals,
    proposalDeals: prevProposalDeals,
  });

  return {
    id: userId,
    name: displayName,
    email,
    activeDeals: { value: open.length, changePct: pctChange(currOpen.length, prevOpen.length) },
    openPipeline: { value: openPipeline, changePct: pctChange(currPipeline, prevPipeline) },
    closedWon: { value: closedWon, changePct: pctChange(currClosedWon, prevClosedWon) },
    winRate: { value: winRate, changePct: pctChange(currWinRate, prevWinRate) },
    totalHours: { value: activity.totalHours, changePct: pctChange(activity.totalHours, prevActivity.totalHours) },
    activitySparkline: buildActivitySparkline(userNotes, userTasks, deals),
    activityBreakdown: activity.breakdown,
    topLabels: activity.labels,
  };
}

export type ActivityTimeSeriesBucket = {
  label: string;
  customerDemo: number;
  external: number;
  internal: number;
  kickoff: number;
  logged: number;
  other: number;
  poc: number;
  postSales: number;
  prep: number;
  workshop: number;
  total: number;
};

type ActivityBucketField = keyof Omit<ActivityTimeSeriesBucket, 'label' | 'total'>;

function classifyTask(
  title: string | undefined,
  status: string | undefined,
): { field: ActivityBucketField; hours: number } {
  const normalized = (title ?? '').toLowerCase();
  if (normalized.includes('demo') || normalized.includes('discovery')) {
    return { field: 'customerDemo', hours: 1.5 };
  }
  if (normalized.includes('kickoff') || normalized.includes('proposal')) {
    return { field: 'kickoff', hours: 1 };
  }
  if (normalized.includes('poc') || normalized.includes('pilot')) {
    return { field: 'poc', hours: 2 };
  }
  if (normalized.includes('workshop')) {
    return { field: 'workshop', hours: 1.25 };
  }
  if (normalized.includes('internal')) {
    return { field: 'internal', hours: 1 };
  }
  return { field: 'prep', hours: status === 'done' ? 0.75 : 1.25 };
}

function createTimeSeriesBuckets(
  granularity: 'daily' | 'weekly' | 'monthly',
  monthsBack = 8,
): { buckets: ActivityTimeSeriesBucket[]; keyToIndex: Map<string, number> } {
  const now = new Date();
  const buckets: ActivityTimeSeriesBucket[] = [];
  const keyToIndex = new Map<string, number>();

  if (granularity === 'daily') {
    const days = 30;
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = startOfDay(now);
      d.setDate(d.getDate() - i);
      const key = bucketKey(d, 'daily');
      keyToIndex.set(key, buckets.length);
      buckets.push(emptyTimeSeriesBucket(bucketLabel(d, 'daily')));
    }
  } else if (granularity === 'weekly') {
    const weeks = 12;
    for (let i = weeks - 1; i >= 0; i -= 1) {
      const d = startOfWeek(now);
      d.setDate(d.getDate() - i * 7);
      const key = bucketKey(d, 'weekly');
      keyToIndex.set(key, buckets.length);
      buckets.push(emptyTimeSeriesBucket(bucketLabel(d, 'weekly')));
    }
  } else {
    for (let i = monthsBack - 1; i >= 0; i -= 1) {
      const d = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const key = bucketKey(d, 'monthly');
      keyToIndex.set(key, buckets.length);
      buckets.push(emptyTimeSeriesBucket(bucketLabel(d, 'monthly')));
    }
  }

  return { buckets, keyToIndex };
}

function addToBucket(
  buckets: ActivityTimeSeriesBucket[],
  idx: number,
  field: ActivityBucketField,
  hours: number,
) {
  if (idx < 0 || idx >= buckets.length) return;
  buckets[idx][field] = round(buckets[idx][field] + hours);
  buckets[idx].total = round(
    buckets[idx].customerDemo +
      buckets[idx].external +
      buckets[idx].internal +
      buckets[idx].kickoff +
      buckets[idx].logged +
      buckets[idx].other +
      buckets[idx].poc +
      buckets[idx].postSales +
      buckets[idx].prep +
      buckets[idx].workshop,
  );
}

/** Aggregate notes, tasks, and deals into Opine-style activity buckets. */
export function buildActivityTimeSeriesFromData(params: {
  notes: Array<{ createdAt?: Date }>;
  tasks: Array<{ createdAt?: Date; status?: string; title?: string }>;
  deals: Array<{ lastActivityAt?: Date; updatedAt?: Date }>;
  granularity: 'daily' | 'weekly' | 'monthly';
  monthsBack?: number;
}): ActivityTimeSeriesBucket[] {
  const { notes, tasks, deals, granularity, monthsBack = 8 } = params;
  const { buckets, keyToIndex } = createTimeSeriesBuckets(granularity, monthsBack);

  function bucketIndex(date: Date): number {
    const key = bucketKey(date, granularity);
    const idx = keyToIndex.get(key);
    return idx ?? -1;
  }

  for (const note of notes) {
    const at = note.createdAt;
    if (!at) continue;
    addToBucket(buckets, bucketIndex(at), 'logged', 0.5);
    addToBucket(buckets, bucketIndex(at), 'external', 0.25);
  }

  for (const task of tasks) {
    const at = task.createdAt;
    if (!at) continue;
    const { field, hours } = classifyTask(task.title, task.status);
    addToBucket(buckets, bucketIndex(at), field, hours);
  }

  for (const deal of deals) {
    const at = deal.lastActivityAt ?? deal.updatedAt;
    if (!at) continue;
    addToBucket(buckets, bucketIndex(at), 'customerDemo', 2);
    addToBucket(buckets, bucketIndex(at), 'external', 1);
  }

  return buckets;
}

const BREAKDOWN_EVENT_TYPES = [
  'External',
  'Internal',
  'Customer Demo',
  'POC',
  'Kickoff Call',
  'Deal Prep',
  'Workshop',
  'Logged',
  'Other',
] as const;

type BreakdownEventType = (typeof BREAKDOWN_EVENT_TYPES)[number];

const EVENT_TYPE_TO_BUCKET: Record<BreakdownEventType, ActivityBucketField> = {
  External: 'external',
  Internal: 'internal',
  'Customer Demo': 'customerDemo',
  POC: 'poc',
  'Kickoff Call': 'kickoff',
  'Deal Prep': 'prep',
  Workshop: 'workshop',
  Logged: 'logged',
  Other: 'other',
};

function classifyBreakdownEventType(title: string | undefined, status: string | undefined): BreakdownEventType {
  const normalized = (title ?? '').toLowerCase();
  if (normalized.includes('demo') || normalized.includes('discovery')) return 'Customer Demo';
  if (normalized.includes('kickoff') || normalized.includes('proposal')) return 'Kickoff Call';
  if (normalized.includes('poc') || normalized.includes('pilot')) return 'POC';
  if (normalized.includes('workshop')) return 'Workshop';
  if (normalized.includes('internal')) return 'Internal';
  if (status === 'done') return 'Deal Prep';
  return 'Deal Prep';
}

function trendFromTimeSeries(
  buckets: ActivityTimeSeriesBucket[],
  field: ActivityBucketField,
  points = 8,
): number[] {
  const slice = buckets.slice(-points);
  return slice.map((b) => b[field]);
}

export function buildActivityBreakdownFromData(params: {
  notes: Array<{ createdAt?: Date }>;
  tasks: Array<{ createdAt?: Date; status?: string; title?: string }>;
  deals: Array<{ lastActivityAt?: Date; updatedAt?: Date }>;
  granularity?: 'daily' | 'weekly' | 'monthly';
}) {
  const tallies: Record<BreakdownEventType, { events: number; hours: number }> = {
    External: { events: 0, hours: 0 },
    Internal: { events: 0, hours: 0 },
    'Customer Demo': { events: 0, hours: 0 },
    POC: { events: 0, hours: 0 },
    'Kickoff Call': { events: 0, hours: 0 },
    'Deal Prep': { events: 0, hours: 0 },
    Workshop: { events: 0, hours: 0 },
    Logged: { events: 0, hours: 0 },
    Other: { events: 0, hours: 0 },
  };

  for (const _note of params.notes) {
    tallies.Logged.events += 1;
    tallies.Logged.hours += 0.5;
    tallies.External.events += 1;
    tallies.External.hours += 0.25;
  }

  for (const task of params.tasks) {
    const eventType = classifyBreakdownEventType(task.title, task.status);
    tallies[eventType].events += 1;
    tallies[eventType].hours += task.status === 'done' ? 0.75 : 1.25;
  }

  for (const deal of params.deals) {
    if (!deal.lastActivityAt && !deal.updatedAt) continue;
    tallies['Customer Demo'].events += 1;
    tallies['Customer Demo'].hours += 2;
    tallies.External.events += 1;
    tallies.External.hours += 1;
  }

  const totalHours = Object.values(tallies).reduce((s, t) => s + t.hours, 0);
  if (totalHours === 0) return [];

  const timeSeries = buildActivityTimeSeriesFromData({
    notes: params.notes,
    tasks: params.tasks,
    deals: params.deals,
    granularity: params.granularity ?? 'monthly',
  });

  return Object.entries(tallies)
    .filter(([, t]) => t.events > 0)
    .map(([eventType, t]) => ({
      eventType,
      events: t.events,
      hours: round(t.hours),
      avgPerEvent: round(t.hours / t.events),
      percentOfTotal: Math.round((t.hours / totalHours) * 100),
      trend: trendFromTimeSeries(timeSeries, EVENT_TYPE_TO_BUCKET[eventType as BreakdownEventType]),
    }))
    .sort((a, b) => b.hours - a.hours);
}

export function buildDonutFromBreakdown(
  rows: Array<{ eventType: string; hours: number; percentOfTotal: number }>,
) {
  const colors: Record<string, string> = {
    External: '#3b82f6',
    Internal: '#60a5fa',
    'Customer Demo': '#8b5cf6',
    POC: '#a855f7',
    'Kickoff Call': '#6366f1',
    'Deal Prep': '#7c3aed',
    Workshop: '#d946ef',
    Logged: '#f59e0b',
    Other: '#94a3b8',
  };
  return rows.map((r) => ({
    name: r.eventType,
    hours: r.hours,
    percent: r.percentOfTotal,
    color: colors[r.eventType] ?? '#94a3b8',
  }));
}

export function buildLabelDonutFromTasks(tasks: Array<{ title?: string }>) {
  const labels: Record<string, number> = {};
  for (const task of tasks) {
    const title = task.title ?? 'Task';
    const key = title.length > 24 ? `${title.slice(0, 22)}…` : title;
    labels[key] = (labels[key] ?? 0) + 1.25;
  }
  const entries = Object.entries(labels)
    .map(([name, hours]) => ({ name, hours: round(hours) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);
  const total = entries.reduce((s, e) => s + e.hours, 0) || 1;
  const palette = ['#7c3aed', '#3b82f6', '#d946ef', '#6366f1', '#94a3b8'];
  return entries.map((e, i) => ({
    name: e.name,
    hours: e.hours,
    percent: Math.round((e.hours / total) * 100),
    color: palette[i % palette.length],
  }));
}

/** @deprecated Synthetic demo data — not used by production insights handlers. */
export function buildActivityTimeSeries(
  workspaceId: string,
  granularity: 'daily' | 'weekly' | 'monthly',
  monthsBack = 8,
) {
  void workspaceId;
  return createTimeSeriesBuckets(granularity, monthsBack).buckets;
}

/** @deprecated Synthetic demo data — not used by production insights handlers. */
export function buildActivityBreakdownTable(_workspaceId: string) {
  return [] as Array<{
    eventType: string;
    events: number;
    hours: number;
    avgPerEvent: number;
    percentOfTotal: number;
    trend: number[];
  }>;
}

/** @deprecated Synthetic demo data — not used by production insights handlers. */
export function buildDonutByType(_workspaceId: string) {
  return [] as Array<{ name: string; hours: number; percent: number; color: string }>;
}

/** @deprecated Synthetic demo data — not used by production insights handlers. */
export function buildDonutByLabel(_workspaceId: string) {
  return [] as Array<{ name: string; hours: number; percent: number; color: string }>;
}

export function computeOrgPeriodMetrics(
  deals: DealDoc[],
  notes: Array<{ createdAt?: Date | null }>,
  tasks: Array<{ createdAt?: Date | null; status?: string; title?: string }>,
  agentRuns: Array<{ createdAt?: Date | null; dealId?: Types.ObjectId | null }>,
  periodStart: Date,
  prevStart: Date,
  now: Date,
) {
  const open = deals.filter((d) => d.status === 'open');
  const won = deals.filter((d) => d.status === 'won');
  const openPipeline = open.reduce((s, d) => s + (d.amount ?? 0), 0);
  const closedWon = won.reduce((s, d) => s + (d.amount ?? 0), 0);
  const winRate =
    open.length + won.length > 0 ? Math.round((won.length / (open.length + won.length)) * 100) : 0;

  const currDeals = deals.filter((d) => {
    const t = dealActivityAt(d);
    return t && inRange(t, periodStart, now);
  });
  const prevDeals = deals.filter((d) => {
    const t = dealActivityAt(d);
    return t && inRange(t, prevStart, periodStart);
  });

  const currOpen = currDeals.filter((d) => d.status === 'open');
  const prevOpen = prevDeals.filter((d) => d.status === 'open');
  const currWon = currDeals.filter((d) => d.status === 'won');
  const prevWon = prevDeals.filter((d) => d.status === 'won');

  const currClosedCount = currDeals.filter((d) => d.status === 'won' || d.status === 'lost').length;
  const prevClosedCount = prevDeals.filter((d) => d.status === 'won' || d.status === 'lost').length;

  const currNotes = notes.filter((n) => n.createdAt && inRange(n.createdAt, periodStart, now)).length;
  const prevNotes = notes.filter((n) => n.createdAt && inRange(n.createdAt, prevStart, periodStart)).length;
  const currTasks = tasks.filter((t) => t.createdAt && inRange(t.createdAt, periodStart, now)).length;
  const prevTasks = tasks.filter((t) => t.createdAt && inRange(t.createdAt, prevStart, periodStart)).length;
  const currRuns = agentRuns.filter((r) => r.createdAt && inRange(r.createdAt, periodStart, now)).length;
  const prevRuns = agentRuns.filter((r) => r.createdAt && inRange(r.createdAt, prevStart, periodStart)).length;

  const currActivity = buildUserActivityProfile({
    noteCount: currNotes,
    taskCount: currTasks,
    agentRunCount: currRuns,
    dealCount: deals.length,
    discoveryDeals: 0,
    proposalDeals: 0,
  });
  const prevActivity = buildUserActivityProfile({
    noteCount: prevNotes,
    taskCount: prevTasks,
    agentRunCount: prevRuns,
    dealCount: prevDeals.length,
    discoveryDeals: 0,
    proposalDeals: 0,
  });

  return {
    activeDeals: { value: open.length, changePct: pctChange(currOpen.length, prevOpen.length) },
    openPipeline: {
      value: openPipeline,
      changePct: pctChange(
        currOpen.reduce((s, d) => s + (d.amount ?? 0), 0),
        prevOpen.reduce((s, d) => s + (d.amount ?? 0), 0),
      ),
    },
    closedWon: {
      value: closedWon,
      changePct: pctChange(
        currWon.reduce((s, d) => s + (d.amount ?? 0), 0),
        prevWon.reduce((s, d) => s + (d.amount ?? 0), 0),
      ),
    },
    winRate: {
      value: winRate,
      changePct: pctChange(
        currClosedCount > 0 ? Math.round((currWon.length / currClosedCount) * 100) : 0,
        prevClosedCount > 0 ? Math.round((prevWon.length / prevClosedCount) * 100) : 0,
      ),
    },
    totalHours: {
      value: currActivity.totalHours,
      changePct: pctChange(currActivity.totalHours, prevActivity.totalHours),
    },
  };
}

export { pctChange, monthKey, inRange };
