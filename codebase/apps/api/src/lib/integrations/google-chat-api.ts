import { log } from '../logger.js';
import { googleChatOAuthConfigured } from './google-chat-oauth.js';
import { resolveWorkspaceAccessToken } from './workspace-tokens.js';

const CHAT_API_BASE = 'https://chat.googleapis.com/v1';
const SPACES_PAGE_SIZE = 100;
const MAX_SPACES_PAGES = 5;

export type GoogleChatSpace = { id: string; name: string };

type GoogleChatErrorBody = { error?: { code?: number; message?: string; status?: string } };

type GoogleChatSpaceResource = {
  name?: string;
  displayName?: string;
};

type GoogleChatSpacesListResponse = GoogleChatErrorBody & {
  spaces?: GoogleChatSpaceResource[];
  nextPageToken?: string;
};

type GoogleChatMessageResponse = GoogleChatErrorBody & {
  name?: string;
};

/** Normalize deliveryConfig.channelId to `spaces/{spaceId}`. */
export function resolveGoogleChatSpaceName(channelId: string): string | null {
  const trimmed = channelId.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('spaces/')) {
    return trimmed;
  }
  return `spaces/${trimmed}`;
}

export async function listGoogleChatSpaces(workspaceId: string): Promise<GoogleChatSpace[]> {
  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'google_chat');
  if (!accessToken) {
    return [];
  }

  const spaces: GoogleChatSpace[] = [];
  let pageToken: string | undefined;

  try {
    for (let page = 0; page < MAX_SPACES_PAGES; page += 1) {
      const params = new URLSearchParams({ pageSize: String(SPACES_PAGE_SIZE) });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const res = await fetch(`${CHAT_API_BASE}/spaces?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as GoogleChatSpacesListResponse;

      if (!res.ok) {
        log('google-chat-api', 'spaces.list failed', {
          workspaceId,
          status: res.status,
          error: data.error?.message ?? data.error?.status ?? 'unknown',
        });
        break;
      }

      for (const space of data.spaces ?? []) {
        if (!space.name) continue;
        spaces.push({
          id: space.name,
          name: space.displayName?.trim() || space.name,
        });
      }

      const next = data.nextPageToken?.trim();
      if (!next) break;
      pageToken = next;
    }
  } catch (err) {
    log('google-chat-api', 'spaces.list error', { workspaceId, error: String(err) });
  }

  return spaces;
}

export async function postGoogleChatMessage(
  workspaceId: string,
  channelId: string,
  text: string,
): Promise<boolean> {
  if (!googleChatOAuthConfigured()) {
    log('google-chat-api', 'postMessage skipped — Google Chat OAuth client credentials not configured', {
      workspaceId,
      channelId,
    });
    return false;
  }

  const spaceName = resolveGoogleChatSpaceName(channelId);
  if (!spaceName) {
    log('google-chat-api', 'postMessage skipped — empty channelId (expected spaces/{spaceId})', {
      workspaceId,
    });
    return false;
  }

  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'google_chat');
  if (!accessToken) {
    log('google-chat-api', 'no access token for postMessage', { workspaceId, channelId });
    return false;
  }

  try {
    const res = await fetch(`${CHAT_API_BASE}/${spaceName}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = (await res.json()) as GoogleChatMessageResponse;
    if (!res.ok || !data.name) {
      log('google-chat-api', 'spaces.messages.create failed', {
        workspaceId,
        channelId,
        status: res.status,
        error: data.error?.message ?? data.error?.status ?? 'unknown',
      });
      return false;
    }

    return true;
  } catch (err) {
    log('google-chat-api', 'spaces.messages.create error', {
      workspaceId,
      channelId,
      error: String(err),
    });
    return false;
  }
}
