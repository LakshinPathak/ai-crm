import { refreshIfNeeded } from './tokens.js';
import { refreshGongToken } from './gong-oauth.js';
import { refreshHubSpotToken } from './hubspot-oauth.js';
import { refreshSlackToken } from './slack-oauth.js';

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
    default:
      return null;
  }
}
