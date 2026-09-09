import { batchAssociate, batchCreate, hubspotRequest } from './client.js';
import { SEED_COMPANIES, SEED_CONTACTS, SEED_DEALS, SEED_NOTES, SEED_TASKS } from './seed-payloads.js';

type PipelineStage = { id: string; label: string; displayOrder: number };

export type HubSpotSeedResult = {
  pipelineId: string;
  stages: PipelineStage[];
  companyIds: string[];
  contactIds: string[];
  dealIds: string[];
  taskIds: string[];
  noteIds: string[];
};

export async function seedHubSpotCrm(): Promise<HubSpotSeedResult> {
  const pipelines = await hubspotRequest<{
    results: Array<{ id: string; stages: PipelineStage[] }>;
  }>('GET', '/crm/v3/pipelines/deals');

  const pipeline = pipelines.results[0];
  if (!pipeline) throw new Error('No deal pipeline found in HubSpot account');

  const stages = [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder);
  const stageIds = stages.map((s) => s.id);

  const companies = await batchCreate(
    'companies',
    SEED_COMPANIES.map((c) => ({
      properties: { name: c.name, domain: c.domain, industry: c.industry },
    })),
  );

  const contacts = await batchCreate(
    'contacts',
    SEED_CONTACTS.map((c) => ({
      properties: {
        email: c.email,
        firstname: c.firstname,
        lastname: c.lastname,
        jobtitle: c.jobtitle,
      },
    })),
  );

  const companyIds = companies.results.map((r) => r.id);
  const contactIds = contacts.results.map((r) => r.id);

  const deals = await batchCreate(
    'deals',
    SEED_DEALS.map((d) => ({
      properties: {
        dealname: d.name,
        amount: d.amount,
        dealstage: stageIds[Math.min(d.stageIndex, stageIds.length - 1)],
        pipeline: pipeline.id,
        closedate: d.closeDate,
      },
    })),
  );

  const dealIds = deals.results.map((r) => r.id);

  await batchAssociate(
    'companies',
    'contacts',
    SEED_CONTACTS.map((_, i) => ({
      from: { id: companyIds[i] },
      to: { id: contactIds[i] },
      type: 'company_to_contact',
    })),
  );

  await batchAssociate(
    'deals',
    'companies',
    SEED_DEALS.map((d, i) => ({
      from: { id: dealIds[i] },
      to: { id: companyIds[d.companyIndex] },
      type: 'deal_to_company',
    })),
  );

  await batchAssociate(
    'deals',
    'contacts',
    SEED_DEALS.map((d, i) => ({
      from: { id: dealIds[i] },
      to: { id: contactIds[d.contactIndex] },
      type: 'deal_to_contact',
    })),
  );

  const tasks = await batchCreate(
    'tasks',
    SEED_TASKS.map((t, i) => ({
      properties: {
        hs_task_subject: t.subject,
        hs_task_body: t.body,
        hs_task_status: t.status,
        hs_timestamp: String(Date.now() + (i + 1) * 86400000),
      },
    })),
  );

  const taskIds = tasks.results.map((r) => r.id);

  await batchAssociate(
    'tasks',
    'deals',
    taskIds.map((id, i) => ({
      from: { id },
      to: { id: dealIds[i % dealIds.length] },
      type: 'task_to_deal',
    })),
  );

  const notes = await batchCreate(
    'notes',
    SEED_NOTES.map((body) => ({
      properties: {
        hs_note_body: body,
        hs_timestamp: String(Date.now()),
      },
    })),
  );

  const noteIds = notes.results.map((r) => r.id);

  await batchAssociate(
    'notes',
    'deals',
    noteIds.map((id, i) => ({
      from: { id },
      to: { id: dealIds[i % dealIds.length] },
      type: 'note_to_deal',
    })),
  );

  return {
    pipelineId: pipeline.id,
    stages,
    companyIds,
    contactIds,
    dealIds,
    taskIds,
    noteIds,
  };
}
