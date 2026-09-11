import { refreshGoogleCalendarToken } from './google-calendar-oauth.js';
import { refreshGoogleChatToken } from './google-chat-oauth.js';
import { refreshGongToken } from './gong-oauth.js';
import { refreshHubSpotToken } from './hubspot-oauth.js';
import { refreshSlackToken } from './slack-oauth.js';
import { refreshTeamsToken } from './teams-oauth.js';
import { refreshIfNeeded } from './tokens.js';

export async function resolveWorkspaceAccessToken(
  workspaceId: string,
  providerKey: string,
): Promise<string | null> {
  switch (providerKey) {
    case 'hubspot':
      return refreshIfNeeded(workspaceId, providerKey, refreshHubSpotToken);
    case 'slack':
      return refreshIfNeeded(workspaceId, providerKey, refreshSlackToken);
    case 'gong':
      return refreshIfNeeded(workspaceId, providerKey, refreshGongToken);
    case 'teams':
      return refreshIfNeeded(workspaceId, providerKey, refreshTeamsToken);
    case 'google_chat':
      return refreshIfNeeded(workspaceId, providerKey, refreshGoogleChatToken);
    case 'google_calendar':
      return refreshIfNeeded(workspaceId, providerKey, refreshGoogleCalendarToken);
    default:
      return null;
  }
}
