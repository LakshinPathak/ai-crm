export type DemoCrmRecord = {
  externalId: string;
  company: { name: string; domain: string; industry: string };
  deal: {
    title: string;
    amount: number;
    stageIndex: number;
    sentiment: 'green' | 'yellow' | 'red';
    winProbability: number;
    isHot?: boolean;
    note?: string;
  };
};

const STAGE_NAMES = ['Qualification', 'Discovery', 'Proposal', 'Negotiation'] as const;

export function stageIndexFromName(name: string): number {
  const idx = STAGE_NAMES.findIndex((s) => s.toLowerCase() === name.toLowerCase());
  return idx >= 0 ? idx : 0;
}

export function getDemoCrmRecords(providerKey: string): DemoCrmRecord[] {
  const byProvider: Record<string, DemoCrmRecord[]> = {
    hubspot: [
      {
        externalId: 'hs-deal-1001',
        company: { name: 'TechVentures Inc', domain: 'techventures.io', industry: 'SaaS' },
        deal: { title: 'TechVentures — Platform License', amount: 95000, stageIndex: 2, sentiment: 'green', winProbability: 68, isHot: true, note: 'Imported from HubSpot: champion requested pricing by Friday.' },
      },
      {
        externalId: 'hs-deal-1002',
        company: { name: 'CloudSync LLC', domain: 'cloudsync.com', industry: 'Cloud Infrastructure' },
        deal: { title: 'CloudSync — Enterprise Rollout', amount: 210000, stageIndex: 3, sentiment: 'green', winProbability: 74, isHot: true, note: 'HubSpot: legal reviewing MSA.' },
      },
      {
        externalId: 'hs-deal-1003',
        company: { name: 'DataPulse GmbH', domain: 'datapulse.de', industry: 'Analytics' },
        deal: { title: 'DataPulse — EMEA Expansion', amount: 58000, stageIndex: 1, sentiment: 'yellow', winProbability: 42, note: 'HubSpot: discovery call scheduled next week.' },
      },
      {
        externalId: 'hs-deal-1004',
        company: { name: 'Nimbus Retail', domain: 'nimbusretail.com', industry: 'Retail' },
        deal: { title: 'Nimbus — POS Integration', amount: 34000, stageIndex: 0, sentiment: 'yellow', winProbability: 35 },
      },
    ],
    salesforce: [
      {
        externalId: 'sf-opp-2001',
        company: { name: 'Apex Manufacturing', domain: 'apexmfg.com', industry: 'Manufacturing' },
        deal: { title: 'Apex — Plant Automation Suite', amount: 175000, stageIndex: 3, sentiment: 'green', winProbability: 71, isHot: true, note: 'Salesforce: CFO approved pilot budget.' },
      },
      {
        externalId: 'sf-opp-2002',
        company: { name: 'Summit Energy', domain: 'summitenergy.com', industry: 'Energy' },
        deal: { title: 'Summit — Grid Analytics', amount: 132000, stageIndex: 2, sentiment: 'yellow', winProbability: 55, note: 'Salesforce: waiting on RFP response.' },
      },
      {
        externalId: 'sf-opp-2003',
        company: { name: 'Orion SaaS', domain: 'orionsaas.io', industry: 'Software' },
        deal: { title: 'Orion — Partner Co-sell', amount: 67000, stageIndex: 1, sentiment: 'green', winProbability: 62 },
      },
      {
        externalId: 'sf-opp-2004',
        company: { name: 'Harbor Logistics', domain: 'harborlogistics.com', industry: 'Logistics' },
        deal: { title: 'Harbor — Fleet Tracking', amount: 89000, stageIndex: 0, sentiment: 'red', winProbability: 18 },
      },
      {
        externalId: 'sf-opp-2005',
        company: { name: 'Lumen Health', domain: 'lumenhealth.org', industry: 'Healthcare' },
        deal: { title: 'Lumen — Compliance Module', amount: 124000, stageIndex: 2, sentiment: 'yellow', winProbability: 49, isHot: true },
      },
    ],
    zoho: [
      {
        externalId: 'zoho-3001',
        company: { name: 'GreenLeaf Organics', domain: 'greenleaf.co', industry: 'Consumer Goods' },
        deal: { title: 'GreenLeaf — D2C CRM', amount: 28000, stageIndex: 1, sentiment: 'green', winProbability: 58, note: 'Zoho CRM: marketing team is sponsor.' },
      },
      {
        externalId: 'zoho-3002',
        company: { name: 'Velocity Motors', domain: 'velocitymotors.com', industry: 'Automotive' },
        deal: { title: 'Velocity — Dealer Network', amount: 156000, stageIndex: 2, sentiment: 'yellow', winProbability: 51, isHot: true },
      },
      {
        externalId: 'zoho-3003',
        company: { name: 'PixelCraft Studios', domain: 'pixelcraft.studio', industry: 'Media' },
        deal: { title: 'PixelCraft — Creative Ops', amount: 41000, stageIndex: 0, sentiment: 'yellow', winProbability: 33 },
      },
      {
        externalId: 'zoho-3004',
        company: { name: 'Atlas Consulting', domain: 'atlasconsulting.com', industry: 'Professional Services' },
        deal: { title: 'Atlas — Client Portal', amount: 72000, stageIndex: 3, sentiment: 'green', winProbability: 77, note: 'Zoho: verbal yes pending signature.' },
      },
    ],
    pipedrive: [
      {
        externalId: 'pd-4001',
        company: { name: 'BlueWave Media', domain: 'bluewave.media', industry: 'Advertising' },
        deal: { title: 'BlueWave — Ad Ops Platform', amount: 52000, stageIndex: 1, sentiment: 'green', winProbability: 60 },
      },
      {
        externalId: 'pd-4002',
        company: { name: 'Stonebridge Capital', domain: 'stonebridge.capital', industry: 'Finance' },
        deal: { title: 'Stonebridge — LP Reporting', amount: 98000, stageIndex: 2, sentiment: 'yellow', winProbability: 47 },
      },
      {
        externalId: 'pd-4003',
        company: { name: 'FreshBite Foods', domain: 'freshbite.com', industry: 'Food & Beverage' },
        deal: { title: 'FreshBite — Franchise CRM', amount: 36000, stageIndex: 0, sentiment: 'red', winProbability: 22 },
      },
    ],
  };

  return byProvider[providerKey] ?? byProvider.hubspot;
}
