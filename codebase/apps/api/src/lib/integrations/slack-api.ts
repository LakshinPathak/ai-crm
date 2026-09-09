import { log } from '../logger.js';
import { resolveWorkspaceAccessToken } from './workspace-tokens.js';

const SLACK_API_BASE = 'https://slack.com/api';

export type SlackChannel = { id: string; name: string };

export type SlackBlock = Record<string, unknown>;

type SlackConversationsListResponse = {
  ok: boolean;
  channels?: Array<{ id?: string; name?: string; is_archived?: boolean }>;
  response_metadata?: { next_cursor?: string };
  error?: string;
};

type SlackConversationsOpenResponse = {
  ok: boolean;
  channel?: { id?: string };
  error?: string;
};

type SlackPostMessageResponse = {
  ok: boolean;
  error?: string;
};

export async function listSlackChannels(workspaceId: string): Promise<SlackChannel[]> {
  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'slack');
  if (!accessToken) {
    return [];
  }

  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  try {
    do {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel',
        exclude_archived: 'true',
        limit: '200',
      });
      if (cursor) {
        params.set('cursor', cursor);
      }

      const res = await fetch(`${SLACK_API_BASE}/conversations.list?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = (await res.json()) as SlackConversationsListResponse;
      if (!data.ok) {
        log('slack-api', 'conversations.list failed', { workspaceId, error: data.error });
        return channels;
      }

      for (const channel of data.channels ?? []) {
        if (channel.id && channel.name && !channel.is_archived) {
          channels.push({ id: channel.id, name: channel.name });
        }
      }

      const nextCursor = data.response_metadata?.next_cursor;
      cursor = nextCursor && nextCursor.length > 0 ? nextCursor : undefined;
    } while (cursor);
  } catch (err) {
    log('slack-api', 'conversations.list error', { workspaceId, error: String(err) });
  }

  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

export async function openSlackDmChannel(workspaceId: string, userId: string): Promise<string | null> {
  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'slack');
  if (!accessToken) {
    return null;
  }

  try {
    const res = await fetch(`${SLACK_API_BASE}/conversations.open`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: userId }),
    });

    const data = (await res.json()) as SlackConversationsOpenResponse;
    if (!data.ok || !data.channel?.id) {
      log('slack-api', 'conversations.open failed', { workspaceId, userId, error: data.error });
      return null;
    }

    return data.channel.id;
  } catch (err) {
    log('slack-api', 'conversations.open error', { workspaceId, userId, error: String(err) });
    return null;
  }
}

export async function postSlackMessage(
  workspaceId: string,
  channelId: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<boolean> {
  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'slack');
  if (!accessToken) {
    log('slack-api', 'no access token for postMessage', { workspaceId, channelId });
    return false;
  }

  try {
    const body: Record<string, unknown> = { channel: channelId, text };
    if (blocks?.length) {
      body.blocks = blocks;
    }

    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as SlackPostMessageResponse;
    if (!data.ok) {
      log('slack-api', 'chat.postMessage failed', { workspaceId, channelId, error: data.error });
      return false;
    }

    return true;
  } catch (err) {
    log('slack-api', 'chat.postMessage error', { workspaceId, channelId, error: String(err) });
    return false;
  }
}
