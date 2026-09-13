import { Deal, DealEvent, IntegrationConnection } from '@ai-crm/db';
import { resolveWorkspaceAccessToken } from '../integrations/workspace-tokens.js';
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

type CalendarEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function parseCalendarDate(value: string | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchDeal(
  deals: Array<{ id: string; title: string }>,
  summary: string,
): { id: string; title: string } | null {
  const hay = summary.toLowerCase().trim();
  if (hay.length < 8) return null;
  const exact = deals.find((d) => d.title.toLowerCase() === hay);
  if (exact) return exact;
  const contained = deals.filter((d) => {
    const title = d.title.toLowerCase().trim();
    return title.length >= 8 && hay.includes(title);
  });
  return contained.length === 1 ? contained[0] : null;
}

/** Pull events from Google Calendar REST and upsert DealEvents matched to open deals. */
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

  const accessToken = await resolveWorkspaceAccessToken(data.workspaceId, 'google_calendar');
  if (!accessToken) {
    log('google-calendar-sync', 'skip — no access token', { workspaceId: data.workspaceId });
    return;
  }

  const timeMin = new Date(Date.now() - 7 * 86400000).toISOString();
  const timeMax = new Date(Date.now() + 60 * 86400000).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await res.json().catch(() => ({}))) as { items?: CalendarEvent[]; error?: { message?: string } };
  if (!res.ok) {
    log('google-calendar-sync', 'Google Calendar list failed', {
      workspaceId: data.workspaceId,
      status: res.status,
      error: payload.error?.message ?? res.statusText,
    });
    return;
  }

  const deals = await Deal.find({
    workspaceId: data.workspaceId,
    deletedAt: null,
    status: 'open',
  })
    .select('_id title')
    .sort({ _id: 1 })
    .limit(100)
    .lean();

  const linked = deals.map((d) => ({ id: String(d._id), title: d.title }));
  let created = 0;
  let updated = 0;
  let unmatched = 0;

  for (const event of payload.items ?? []) {
    if (!event.id) continue;
    const title = (event.summary ?? 'Meeting').trim() || 'Meeting';
    const startAt = parseCalendarDate(event.start?.dateTime ?? event.start?.date);
    const endAt =
      parseCalendarDate(event.end?.dateTime ?? event.end?.date) ??
      (startAt ? new Date(startAt.getTime() + 3600000) : null);
    if (!startAt || !endAt) continue;

    const deal = matchDeal(linked, title);
    if (!deal) {
      unmatched += 1;
      continue;
    }

    try {
      const result = await DealEvent.updateOne(
        {
          workspaceId: data.workspaceId,
          source: 'google_calendar',
          externalId: event.id,
        },
        {
          $set: {
            dealId: deal.id,
            title,
            startAt,
            endAt,
            type: 'meeting',
            source: 'google_calendar',
            externalId: event.id,
          },
          $setOnInsert: {
            workspaceId: data.workspaceId,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount === 1) created += 1;
      else updated += 1;
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 11000) {
        updated += 1;
        continue;
      }
      throw err;
    }
  }

  log('google-calendar-sync', 'sync complete', {
    workspaceId: data.workspaceId,
    events: (payload.items ?? []).length,
    created,
    updated,
    unmatched,
  });

  await IntegrationConnection.updateOne(
    { _id: conn._id },
    { $set: { lastSyncAt: new Date(), 'settings.mode': 'live' } },
  );
}
