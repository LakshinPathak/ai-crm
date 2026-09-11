import { log } from '../logger.js';
import { teamsOAuthConfigured } from './teams-oauth.js';
import { resolveWorkspaceAccessToken } from './workspace-tokens.js';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

export type TeamsChannel = { id: string; name: string };

type GraphPostMessageResponse = {
  id?: string;
  error?: { code?: string; message?: string };
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

export async function listTeamsChannels(_workspaceId: string): Promise<TeamsChannel[]> {
  // TODO: list channels via Graph (e.g. GET /teams/{id}/channels) — needs extra OAuth scopes beyond MVP.
  return [];
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
