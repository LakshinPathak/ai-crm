/**
 * Test HubSpot Free-tier API use cases (read + write smoke tests).
 * Usage: pnpm hubspot:test
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

import {
  batchCreate,
  getHubSpotAccessToken,
  hubspotRequest,
  searchObjects,
} from '../src/lib/hubspot/client.js';

type TestResult = { name: string; ok: boolean; detail?: string };

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, detail: msg });
    console.log(`  ✗ ${name}: ${msg}`);
  }
}

async function main() {
  getHubSpotAccessToken();
  console.log('HubSpot API test suite (Free tier)\n');

  await test('crm.pipelines — read deal pipeline', async () => {
    const p = await hubspotRequest<{ results: unknown[] }>('GET', '/crm/v3/pipelines/deals');
    if (!p.results?.length) throw new Error('No pipelines');
  });

  await test('crm.objects.companies — search', async () => {
    const r = await searchObjects('companies', { properties: ['name'], limit: 5 });
    if (!Array.isArray(r.results)) throw new Error('Bad response');
  });

  await test('crm.objects.deals — search', async () => {
    const r = await searchObjects('deals', { properties: ['dealname', 'amount'], limit: 5 });
    if (!Array.isArray(r.results)) throw new Error('Bad response');
  });

  await test('crm.objects.contacts — search', async () => {
    const r = await searchObjects('contacts', { properties: ['email'], limit: 5 });
    if (!Array.isArray(r.results)) throw new Error('Bad response');
  });

  await test('crm.objects.tasks — search', async () => {
    const r = await searchObjects('tasks', { properties: ['hs_task_subject'], limit: 5 });
    if (!Array.isArray(r.results)) throw new Error('Bad response');
  });

  await test('crm.objects.notes — search', async () => {
    const r = await searchObjects('notes', { properties: ['hs_note_body'], limit: 5 });
    if (!Array.isArray(r.results)) throw new Error('Bad response');
  });

  let tempCompanyId: string | undefined;
  await test('crm.objects.companies — batch create + read + delete', async () => {
    const created = await batchCreate('companies', [
      { properties: { name: `AI-CRM Test Co ${Date.now()}`, domain: 'test-ai-crm.example' } },
    ]);
    tempCompanyId = created.results[0]?.id;
    if (!tempCompanyId) throw new Error('No id returned');
    await hubspotRequest('GET', `/crm/v3/objects/companies/${tempCompanyId}?properties=name`);
    await hubspotRequest('DELETE', `/crm/v3/objects/companies/${tempCompanyId}`);
    tempCompanyId = undefined;
  });

  await test('crm.associations — read deal→company', async () => {
    const deals = await searchObjects<{ id: string }>('deals', { properties: ['dealname'], limit: 1 });
    if (!deals.results[0]) return;
    await hubspotRequest('GET', `/crm/v4/objects/deals/${deals.results[0].id}/associations/companies`);
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
