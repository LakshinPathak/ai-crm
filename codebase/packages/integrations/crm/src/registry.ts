import { DemoCrmConnector } from './adapters/demo.js';
import { HubSpotCrmConnector } from './adapters/hubspot.js';
import type { CrmConnectionContext, CrmConnector, CrmProvider } from './types.js';

const DISPLAY_NAMES: Record<CrmProvider, string> = {
  hubspot: 'HubSpot',
  pipedrive: 'Pipedrive',
  zoho: 'Zoho CRM',
  salesforce: 'Salesforce',
};

const demoConnectors = new Map<CrmProvider, DemoCrmConnector>();
const hubspotConnector = new HubSpotCrmConnector();

function getDemoConnector(provider: CrmProvider): DemoCrmConnector {
  let connector = demoConnectors.get(provider);
  if (!connector) {
    connector = new DemoCrmConnector(provider, DISPLAY_NAMES[provider]);
    demoConnectors.set(provider, connector);
  }
  return connector;
}

function hasHubSpotToken(ctx: CrmConnectionContext): boolean {
  return Boolean(
    ctx.accessToken ??
      process.env.HUBSPOT_ACCESS_TOKEN ??
      process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  );
}

export function resolveCrmConnector(ctx: CrmConnectionContext): CrmConnector {
  if (ctx.providerKey === 'hubspot' && ctx.mode === 'live' && hasHubSpotToken(ctx)) {
    return hubspotConnector;
  }
  return getDemoConnector(ctx.providerKey);
}

export const crmConnectorRegistry = {
  resolve: resolveCrmConnector,
  listProviders: (): CrmProvider[] => Object.keys(DISPLAY_NAMES) as CrmProvider[],
};
