import type { CrmConnectionContext, CrmProvider } from '@ai-crm/integrations-crm';
import { resolveWorkspaceAccessToken } from '../integrations/workspace-tokens.js';

const CRM_PROVIDERS = new Set<CrmProvider>(['hubspot', 'pipedrive', 'zoho', 'salesforce']);

type ConnectionSettings = {
  mode?: 'demo' | 'live';
};

export type IntegrationConnectionLike = {
  externalAccountId?: string | null;
  settings?: ConnectionSettings;
};

function resolveHubSpotAccessToken(): string | undefined {
  return process.env.HUBSPOT_ACCESS_TOKEN ?? process.env.HUBSPOT_PRIVATE_APP_TOKEN;
}

export function isCrmProvider(providerKey: string): providerKey is CrmProvider {
  return CRM_PROVIDERS.has(providerKey as CrmProvider);
}

export async function buildCrmConnectionContext(
  workspaceId: string,
  providerKey: string,
  conn?: IntegrationConnectionLike | null,
): Promise<CrmConnectionContext> {
  if (!isCrmProvider(providerKey)) {
    throw new Error(`Unknown CRM provider: ${providerKey}`);
  }

  const settings = (conn?.settings ?? {}) as ConnectionSettings;
  let mode: CrmConnectionContext['mode'] = settings.mode ?? 'demo';
  let accessToken: string | undefined;

  if (providerKey === 'hubspot') {
    const workspaceToken = await resolveWorkspaceAccessToken(workspaceId, 'hubspot');
    const envToken = resolveHubSpotAccessToken();
    const token = workspaceToken ?? envToken;
    if (token) {
      accessToken = token;
      mode = workspaceToken || settings.mode === 'live' ? 'live' : mode;
      if (conn && settings.mode !== 'demo' && (workspaceToken || envToken)) {
        mode = 'live';
      }
    }
  }

  return {
    workspaceId,
    providerKey,
    mode,
    accessToken,
    externalAccountId: conn?.externalAccountId ?? undefined,
  };
}
