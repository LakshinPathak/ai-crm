/**
 * Pull HubSpot CRM data into AI CRM MongoDB workspace.
 * Usage: pnpm hubspot:sync
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

import { connectDb, User, Workspace } from '@ai-crm/db';
import { getHubSpotAccessToken } from '../src/lib/hubspot/client.js';
import { syncHubSpotToWorkspace } from '../src/lib/hubspot/sync.js';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@ai-crm.test';

async function main() {
  getHubSpotAccessToken();
  await connectDb();

  let user = await User.findOne({ email: EMAIL });
  if (!user?.workspaceId) {
    const login = await fetch(`${API}/api/v1/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, displayName: 'Demo User' }),
    }).then((r) => r.json()) as { token: string; needsWorkspace: boolean };

    let token = login.token;
    if (login.needsWorkspace) {
      const ws = await fetch(`${API}/api/v1/onboarding/workspace`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Demo Workspace', timezone: 'America/New_York' }),
      }).then((r) => r.json()) as { token: string };
      token = ws.token;
    }
    user = await User.findOne({ email: EMAIL });
  }

  if (!user?.workspaceId) throw new Error('No workspace found — run populate-demo first');

  const workspace = await Workspace.findById(user.workspaceId);
  console.log(`→ Syncing HubSpot → workspace "${workspace?.name}"…`);

  const result = await syncHubSpotToWorkspace({
    workspaceId: user.workspaceId,
    ownerId: user._id,
  });

  console.log('\n✓ Sync complete');
  console.log(`  Companies: +${result.companiesCreated} new, ${result.companiesUpdated} updated`);
  console.log(`  Deals:     +${result.dealsCreated} new, ${result.dealsUpdated} updated`);
  console.log(`  Notes:     +${result.notesCreated}`);
  console.log(`  Tasks:     +${result.tasksCreated}`);
  if (result.skipped) console.log(`  Skipped:   ${result.skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Sync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
