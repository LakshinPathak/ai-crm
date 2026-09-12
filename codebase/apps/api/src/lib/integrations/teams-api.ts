import { log } from '../logger.js';
import { teamsOAuthConfigured } from './teams-oauth.js';
import { resolveWorkspaceAccessToken } from './workspace-tokens.js';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const MAX_TEAMS = 20;
const MAX_CHANNELS_PER_TEAM = 50;

export type TeamsChannel = { id: string; name: string };

type GraphErrorBody = { error?: { code?: string; message?: string } };

type GraphCollectionResponse<T> = GraphErrorBody & {
  value?: T[];
  '@odata.nextLink'?: string;
};

type GraphTeam = { id?: string; displayName?: string };
type GraphChannel = { id?: string; displayName?: string };

type GraphPostMessageResponse = GraphErrorBody & {
  id?: string;
};

/** Build Graph path segment `teams/{teamId}/channels/{channelId}` from deliveryConfig.channelId. */
export function resolveTeamsChannelPath(channelId: string): string | null {
  const trimmed = channelId.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('teams/')) {
    return trimmed;
  }
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `teams/${parts[0]}/channels/${parts[1]}`;
  }
  return null;
}

async function collectGraphPages<T>(
  initialUrl: string,
  accessToken: string,
  maxItems: number,
  logCtx: { workspaceId: string; operation: string; teamId?: string },
): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl && items.length < maxItems) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as GraphCollectionResponse<T>;
    if (!res.ok) {
      log('teams-api', `${logCtx.operation} failed`, {
        workspaceId: logCtx.workspaceId,
        teamId: logCtx.teamId,
        status: res.status,
        error: data.error?.message ?? data.error?.code ?? 'unknown',
      });
      break;
    }

    const page = data.value ?? [];
    const remaining = maxItems - items.length;
    items.push(...page.slice(0, remaining));
    nextUrl = items.length < maxItems ? data['@odata.nextLink'] : undefined;
  }

  return items;
}

export async function listTeamsChannels(workspaceId: string): Promise<TeamsChannel[]> {
  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'teams');
  if (!accessToken) {
    return [];
  }

  const channels: TeamsChannel[] = [];

  try {
    const teams = await collectGraphPages<GraphTeam>(
      `${GRAPH_API_BASE}/me/joinedTeams?$select=id,displayName`,
      accessToken,
      MAX_TEAMS,
      { workspaceId, operation: 'joinedTeams' },
    );

    for (const team of teams) {
      if (!team.id) continue;

      const teamChannels = await collectGraphPages<GraphChannel>(
        `${GRAPH_API_BASE}/teams/${encodeURIComponent(team.id)}/channels?$select=id,displayName`,
        accessToken,
        MAX_CHANNELS_PER_TEAM,
        { workspaceId, operation: 'team channels', teamId: team.id },
      );

      const teamName = team.displayName?.trim() || team.id;
      for (const channel of teamChannels) {
        if (!channel.id) continue;
        const channelName = channel.displayName?.trim() || channel.id;
        channels.push({
          id: `teams/${team.id}/channels/${channel.id}`,
          name: `${teamName} / ${channelName}`,
        });
      }
    }
  } catch (err) {
    log('teams-api', 'list channels error', { workspaceId, error: String(err) });
  }

  return channels;
}

export async function postTeamsMessage(
  workspaceId: string,
  channelId: string,
  text: string,
): Promise<boolean> {
  if (!teamsOAuthConfigured()) {
    log('teams-api', 'postMessage skipped — TEAMS_CLIENT_ID / TEAMS_CLIENT_SECRET not configured', {
      workspaceId,
      channelId,
    });
    return false;
  }

  const channelPath = resolveTeamsChannelPath(channelId);
  if (!channelPath) {
    log('teams-api', 'postMessage skipped — invalid channelId (expected teams/{teamId}/channels/{channelId} or {teamId}/{channelId})', {
      workspaceId,
      channelId,
    });
    return false;
  }

  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'teams');
  if (!accessToken) {
    log('teams-api', 'no access token for postMessage', { workspaceId, channelId });
    return false;
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${channelPath}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: {
          contentType: 'html',
          content: text.replace(/\n/g, '<br/>'),
        },
      }),
    });

    const data = (await res.json()) as GraphPostMessageResponse;
    if (!res.ok || !data.id) {
      log('teams-api', 'channel message post failed', {
        workspaceId,
        channelId,
        status: res.status,
        error: data.error?.message ?? data.error?.code ?? 'unknown',
      });
      return false;
    }

    return true;
  } catch (err) {
    log('teams-api', 'channel message post error', { workspaceId, channelId, error: String(err) });
    return false;
  }
}
