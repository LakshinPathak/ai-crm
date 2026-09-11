import { Deal, IntegrationConnection } from '@ai-crm/db';
import { log } from '../logger.js';
import { enqueueJob } from './mongo-queue.js';

export const GOOGLE_CALENDAR_SYNC_QUEUE = 'google-calendar-sync';

export interface GoogleCalendarSyncJobData {
  workspaceId: string;
  connectionId: string;
}

export async function enqueueGoogleCalendarSync(data: GoogleCalendarSyncJobData): Promise<void> {
  const jobId = `${data.workspaceId}:google_calendar:sync`;
  await enqueueJob({
    queue: GOOGLE_CALENDAR_SYNC_QUEUE,
    name: 'sync',
    jobId,
    payload: data,
    maxAttempts: 3,
  });
}

type PlannedMeetingEvent = {
  dealId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  type: 'meeting';
  source: 'google_calendar';
};

function planDemoMeetingEventsForDeals(
  deals: Array<{ id: string; title: string }>,
): PlannedMeetingEvent[] {
  const now = Date.now();
  return deals.map((deal, index) => {
    const startAt = new Date(now + (index + 1) * 86400000);
    const endAt = new Date(startAt.getTime() + 3600000);
    return {
      dealId: deal.id,
      title: `Demo calendar meeting — ${deal.title}`,
      startAt,
      endAt,
      type: 'meeting',
      source: 'google_calendar',
    };
  });
}

/** Demo stub: logs planned meeting DealEvents; no Google API or DB writes yet. */
export async function processGoogleCalendarSync(data: GoogleCalendarSyncJobData): Promise<void> {
  const conn = await IntegrationConnection.findOne({
    _id: data.connectionId,
    workspaceId: data.workspaceId,
    providerKey: 'google_calendar',
    status: 'connected',
  });
  if (!conn) {
    log('google-calendar-sync', 'skip — connection not found or not connected', {
      workspaceId: data.workspaceId,
      connectionId: data.connectionId,
    });
    return;
  }

  const deals = await Deal.find({
    workspaceId: data.workspaceId,
    deletedAt: null,
    status: 'open',
    crmExternalId: { $exists: true, $ne: null },
  })
    .select('_id title')
    .limit(25)
    .lean();

  const linked = deals.map((d) => ({ id: String(d._id), title: d.title }));
  const planned = planDemoMeetingEventsForDeals(linked);

  for (const event of planned) {
    log('google-calendar-sync', 'demo: would create DealEvent', {
      workspaceId: data.workspaceId,
      dealId: event.dealId,
      type: event.type,
      source: event.source,
      title: event.title,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
    });
  }

  if (planned.length === 0) {
    log('google-calendar-sync', 'demo: no CRM-linked open deals to match', {
      workspaceId: data.workspaceId,
    });
  } else {
    log('google-calendar-sync', 'demo sync complete', {
      workspaceId: data.workspaceId,
      plannedMeetings: planned.length,
    });
  }

  await IntegrationConnection.updateOne(
    { _id: conn._id },
    { $set: { lastSyncAt: new Date() } },
  );
}
