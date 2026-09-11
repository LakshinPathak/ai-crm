import { log } from '../logger.js';
import { googleChatOAuthConfigured } from './google-chat-oauth.js';
import { resolveWorkspaceAccessToken } from './workspace-tokens.js';

const CHAT_API_BASE = 'https://chat.googleapis.com/v1';

export type GoogleChatSpace = { id: string; name: string };

type GoogleChatMessageResponse = {
  name?: string;
  error?: { code?: number; message?: string; status?: string };
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

export async function listGoogleChatSpaces(_workspaceId: string): Promise<GoogleChatSpace[]> {
  // TODO: list spaces via chat.googleapis.com — may require chat.spaces.readonly or admin setup beyond bot scope.
  return [];
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
