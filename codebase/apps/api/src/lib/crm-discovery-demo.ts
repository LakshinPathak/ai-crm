import { DEFAULT_PIPELINE_STAGES } from './seed.js';

export type DemoCrmPipeline = { externalId: string; name: string };
export type DemoCrmStage = {
  externalId: string;
  label: string;
  pipelineExternalId: string;
};
export type DemoCrmOwner = { externalId: string; email: string; name: string };

const OPEN_STAGE_NAMES = DEFAULT_PIPELINE_STAGES.filter((s) => s.stageType === 'open').map((s) => s.name);
const CLOSED_STAGE_NAMES = DEFAULT_PIPELINE_STAGES.filter((s) => s.stageType !== 'open').map((s) => s.name);

export function getDemoCrmPipelines(providerKey: string): DemoCrmPipeline[] {
  if (providerKey === 'pipedrive') {
    return [
      { externalId: 'pd-pipeline-sales', name: 'Sales Pipeline' },
      { externalId: 'pd-pipeline-partner', name: 'Partner Pipeline' },
    ];
  }
  return [{ externalId: 'default', name: 'Default Pipeline' }];
}

export function getDemoCrmStages(providerKey: string, pipelineExternalId = 'default'): DemoCrmStage[] {
  const prefix = providerKey.slice(0, 2);
  const stages = [...OPEN_STAGE_NAMES, ...CLOSED_STAGE_NAMES];
  return stages.map((label, idx) => ({
    externalId: `${prefix}-stage-${idx + 1}`,
    label,
    pipelineExternalId,
  }));
}

export function getDemoCrmOwners(providerKey: string): DemoCrmOwner[] {
  const prefix = providerKey.slice(0, 2);
  return [
    { externalId: `${prefix}-owner-1`, email: 'alex.morgan@example.com', name: 'Alex Morgan' },
    { externalId: `${prefix}-owner-2`, email: 'jordan.lee@example.com', name: 'Jordan Lee' },
    { externalId: `${prefix}-owner-3`, email: 'sam.patel@example.com', name: 'Sam Patel' },
  ];
}

/** Fuzzy match CRM stage label to internal pipeline stage name. */
export function suggestInternalStageId(
  crmLabel: string,
  internalStages: Array<{ id: string; name: string }>,
): string | null {
  const normalized = crmLabel.trim().toLowerCase();
  const exact = internalStages.find((s) => s.name.toLowerCase() === normalized);
  if (exact) return exact.id;

  const contains = internalStages.find(
    (s) => normalized.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(normalized),
  );
  return contains?.id ?? internalStages[0]?.id ?? null;
}
