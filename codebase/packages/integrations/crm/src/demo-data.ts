import type { CanonicalCrmDeal, CrmOwner, CrmPipeline, CrmStage } from './types.js';

const DEMO_STAGES = ['Qualification', 'Discovery', 'Proposal', 'Negotiation'];

export function getDemoPipelines(provider: string): CrmPipeline[] {
  if (provider === 'pipedrive') {
    return [
      { externalId: 'pd-pipeline-1', label: 'Sales Pipeline' },
      { externalId: 'pd-pipeline-2', label: 'Partner Pipeline' },
    ];
  }
  return [{ externalId: 'default', label: `${provider} Pipeline` }];
}

export function getDemoStages(provider: string, pipelineId: string): CrmStage[] {
  const prefix = provider.slice(0, 2);
  return DEMO_STAGES.map((label, i) => ({
    externalId: `${prefix}-stage-${pipelineId}-${i}`,
    label,
    pipelineExternalId: pipelineId,
    displayOrder: i,
  }));
}

export function getDemoOwners(provider: string): CrmOwner[] {
  return [
    { externalId: `${provider}-owner-1`, email: 'alex@example.com', name: 'Alex Chen' },
    { externalId: `${provider}-owner-2`, email: 'sarah@example.com', name: 'Sarah Miller' },
  ];
}

export function getDemoDeals(provider: string): CanonicalCrmDeal[] {
  const stages = getDemoStages(provider, 'default');
  const templates: Array<{ title: string; company: string; amount: number; stageIdx: number }> =
    provider === 'hubspot'
      ? [
          { title: 'TechVentures — Platform License', company: 'TechVentures Inc', amount: 95000, stageIdx: 2 },
          { title: 'CloudSync — Enterprise Rollout', company: 'CloudSync LLC', amount: 210000, stageIdx: 3 },
          { title: 'DataPulse — EMEA Expansion', company: 'DataPulse GmbH', amount: 58000, stageIdx: 1 },
          { title: 'Nimbus — POS Integration', company: 'Nimbus Retail', amount: 34000, stageIdx: 0 },
        ]
      : [
          { title: `${provider} — Enterprise Deal`, company: 'Acme Corp', amount: 120000, stageIdx: 2 },
          { title: `${provider} — Mid-market POC`, company: 'Beta LLC', amount: 45000, stageIdx: 1 },
          { title: `${provider} — Expansion`, company: 'Gamma Inc', amount: 88000, stageIdx: 0 },
        ];

  return templates.map((t, i) => ({
    externalId: `${provider}-deal-${1000 + i}`,
    provider: provider as CanonicalCrmDeal['provider'],
    pipelineExternalId: 'default',
    stageExternalId: stages[t.stageIdx]?.externalId ?? stages[0].externalId,
    title: t.title,
    amount: t.amount,
    currency: 'USD',
    status: 'open' as const,
    ownerExternalId: `${provider}-owner-1`,
    companyExternalId: `${provider}-co-${i}`,
    companyName: t.company,
    expectedCloseDate: null,
    probability: 50,
    updatedAt: new Date().toISOString(),
  }));
}
