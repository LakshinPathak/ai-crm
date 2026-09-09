/**
 * Seed HubSpot CRM with dummy companies, contacts, deals, tasks, notes + associations.
 * Requires HUBSPOT_ACCESS_TOKEN in codebase/.env
 *
 * Usage: pnpm --filter @ai-crm/backend hubspot:seed
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

import { getHubSpotAccessToken } from '../src/lib/hubspot/client.js';
import { seedHubSpotCrm } from '../src/lib/hubspot/seed.js';

async function main() {
  getHubSpotAccessToken();
  console.log('→ Seeding HubSpot CRM (batch APIs, Free tier)…');
  const result = await seedHubSpotCrm();
  console.log('\n✓ HubSpot seed complete');
  console.log(`  Pipeline: ${result.pipelineId}`);
  console.log(`  Stages: ${result.stages.map((s) => s.label).join(' → ')}`);
  console.log(`  Companies: ${result.companyIds.length}`);
  console.log(`  Contacts:  ${result.contactIds.length}`);
  console.log(`  Deals:     ${result.dealIds.length}`);
  console.log(`  Tasks:     ${result.taskIds.length}`);
  console.log(`  Notes:     ${result.noteIds.length}`);
  console.log('\nNext: pnpm hubspot:sync');
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
