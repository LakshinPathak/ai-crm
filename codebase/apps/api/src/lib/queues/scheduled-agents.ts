import { Agent, AgentRun, Workspace } from '@ai-crm/db';
import { CronExpressionParser } from 'cron-parser';
import { enqueueAgentRun } from '../../modules/agents/executor.js';
import { log } from '../logger.js';

const TICK_INTERVAL_MS = 60_000;
const DEFAULT_TIMEZONE = 'America/New_York';

/** In-memory dedup: `schedule:{agentId}:{minuteKey}` — prevents double-fire in the same minute. */
const firedThisMinute = new Set<string>();

function dedupKey(agentId: string, minuteKey: string): string {
  return `schedule:${agentId}:${minuteKey}`;
}

/** Format a date as `YYYY-MM-DD HH:mm` in the given IANA timezone. */
export function formatMinuteKey(date: Date, tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * Returns true when `cronExpr` fires during the current minute in `tz`.
 * Supports standard 5-field cron and cron-parser presets (@daily, @hourly, etc.).
 */
export function shouldRunCron(cronExpr: string, tz: string, now: Date): boolean {
  try {
    const interval = CronExpressionParser.parse(cronExpr, { tz, currentDate: now });
    const prev = interval.prev().toDate();
    return formatMinuteKey(prev, tz) === formatMinuteKey(now, tz);
  } catch {
    return false;
  }
}

function pruneDedupSet(
  agents: Array<{ _id: unknown; workspaceId: unknown }>,
  tzByWorkspace: Map<string, string>,
  now: Date,
): void {
  const validKeys = new Set(
    agents.map((agent) =>
      dedupKey(
        String(agent._id),
        formatMinuteKey(now, tzByWorkspace.get(String(agent.workspaceId)) ?? DEFAULT_TIMEZONE),
      ),
    ),
  );
  for (const key of firedThisMinute) {
    if (!validKeys.has(key)) firedThisMinute.delete(key);
  }
}

async function tickScheduledAgents(): Promise<void> {
  const now = new Date();

  const agents = await Agent.find({
    isActive: true,
    'triggerConfig.type': 'schedule',
    'triggerConfig.schedule': { $exists: true, $nin: [null, ''] },
  }).lean();

  if (agents.length === 0) return;

  const workspaceIds = [...new Set(agents.map((a) => String(a.workspaceId)))];
  const workspaces = await Workspace.find({ _id: { $in: workspaceIds } })
    .select('_id timezone')
    .lean();
  const tzByWorkspace = new Map(
    workspaces.map((w) => [String(w._id), w.timezone ?? DEFAULT_TIMEZONE]),
  );

  pruneDedupSet(agents, tzByWorkspace, now);

  for (const agent of agents) {
    const triggerConfig = agent.triggerConfig as { schedule?: string } | undefined;
    const schedule = triggerConfig?.schedule;
    if (!schedule) continue;

    const ownerId = agent.ownerId ? String(agent.ownerId) : null;
    if (!ownerId) {
      log('scheduled-agents', 'skip agent without ownerId', { agentId: String(agent._id) });
      continue;
    }

    const workspaceId = String(agent.workspaceId);
    const tz = tzByWorkspace.get(workspaceId) ?? DEFAULT_TIMEZONE;

    try {
      CronExpressionParser.parse(schedule, { tz });
    } catch (err) {
      log('scheduled-agents', 'invalid cron expression, skipping', {
        agentId: String(agent._id),
        schedule,
        timezone: tz,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    if (!shouldRunCron(schedule, tz, now)) continue;

    const minuteKey = formatMinuteKey(now, tz);
    const key = dedupKey(String(agent._id), minuteKey);
    if (firedThisMinute.has(key)) continue;
    firedThisMinute.add(key);

    const run = await AgentRun.create({
      workspaceId: agent.workspaceId,
      agentId: agent._id,
      status: 'running',
      triggerType: 'cron',
      startedAt: now,
      scope: {},
    });

    enqueueAgentRun({
      runId: run.id,
      workspaceId,
      agentId: String(agent._id),
      templateSlug: agent.templateSlug ?? 'unknown',
      userId: ownerId,
    });

    log('scheduled-agents', 'enqueued scheduled agent run', {
      agentId: String(agent._id),
      workspaceId,
      templateSlug: agent.templateSlug,
      minuteKey,
      dedupKey: key,
    });
  }
}

/** Poll every 60s for schedule-triggered agents and enqueue runs. */
export function startScheduledAgentTicker(): () => void {
  let stopped = false;

  const runTick = () => {
    if (stopped) return;
    void tickScheduledAgents().catch((err) => {
      log('scheduled-agents', 'tick failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  };

  const interval = setInterval(runTick, TICK_INTERVAL_MS);
  runTick();

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
