import { Deal, DealEvent, IntegrationConnection } from '@ai-crm/db';
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

/** Demo persist: upserts planned meeting DealEvents (no Google Calendar REST). */
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
    .sort({ _id: 1 })
    .limit(25)
    .lean();

  const linked = deals.map((d) => ({ id: String(d._id), title: d.title }));
  const planned = planDemoMeetingEventsForDeals(linked);

  const { created, skipped } = await persistPlannedDemoMeetings(data.workspaceId, planned);

  if (planned.length === 0) {
    log('google-calendar-sync', 'demo: no CRM-linked open deals to match', {
      workspaceId: data.workspaceId,
    });
  }

  log('google-calendar-sync', 'demo sync complete', {
    workspaceId: data.workspaceId,
    plannedMeetings: planned.length,
    created,
    skipped,
  });

  await IntegrationConnection.updateOne(
    { _id: conn._id },
    { $set: { lastSyncAt: new Date() } },
  );
}

/**
 * Demo meetings use wall-clock startAt on first insert. Re-sync matches
 * workspace + deal + source + title (not startAt) so Date.now() offsets stay idempotent.
 */
async function persistPlannedDemoMeetings(
  workspaceId: string,
  planned: PlannedMeetingEvent[],
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const event of planned) {
    const result = await DealEvent.updateOne(
      {
        workspaceId,
        dealId: event.dealId,
        source: event.source,
        title: event.title,
      },
      {
        $setOnInsert: {
          workspaceId,
          dealId: event.dealId,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          type: event.type,
          source: event.source,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount === 1) {
      created += 1;
    } else {
      skipped += 1;
    }
  }

  return { created, skipped };
}
