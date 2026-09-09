/**
 * Populate workspace with demo CRM data via API.
 * Usage: pnpm populate-demo
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@ai-crm.test';

async function api<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

async function main() {
  console.log('→ Dev login…');
  const login = await fetch(`${API}/api/v1/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, displayName: 'Demo User' }),
  }).then((r) => r.json()) as { token: string; needsWorkspace: boolean };

  let token = login.token;

  if (login.needsWorkspace) {
    console.log('→ Creating workspace…');
    const ws = await api<{ token: string }>('/onboarding/workspace', token, 'POST', {
      name: 'Demo Workspace',
      timezone: 'America/New_York',
    });
    token = ws.token;
  }

  console.log('→ Completing onboarding…');
  try {
    await api('/onboarding/complete', token, 'POST', {});
  } catch {
    // already completed
  }

  for (const provider of ['hubspot', 'salesforce', 'zoho'] as const) {
    console.log(`→ Connecting ${provider} (demo)…`);
    await IntegrationConnect(provider, token);
    console.log(`→ Syncing ${provider} dummy data…`);
    const sync = await api<{
      imported: { companies: number; deals: number; notes: number; skipped: number };
    }>('/integrations/crm/sync', token, 'POST', {});
    console.log(
      `   +${sync.imported.companies} companies, +${sync.imported.deals} deals, +${sync.imported.notes} notes (${sync.imported.skipped} skipped)`,
    );
    await api(`/integrations/crm/connect/${provider}`, token, 'DELETE');
  }

  console.log('→ Final connect: HubSpot + sync…');
  await IntegrationConnect('hubspot', token);
  const final = await api<{ imported: { companies: number; deals: number } }>(
    '/integrations/crm/sync',
    token,
    'POST',
    {},
  );
  console.log(`   +${final.imported.companies} companies, +${final.imported.deals} deals`);

  const board = await api<{ metrics: { dealCount: number; totalAmount: number } }>(
    '/deals/board',
    token,
  );
  console.log(`\n✓ Done — ${board.metrics.dealCount} open deals, $${board.metrics.totalAmount.toLocaleString()} pipeline`);
  console.log(`  Token (for browser): ${token.slice(0, 20)}…`);
  console.log(`  Open: http://localhost:3000/auth/callback and paste token from dev-login`);
}

async function IntegrationConnect(provider: string, token: string) {
  await api(`/integrations/crm/connect/${provider}`, token, 'POST', {});
}

main().catch((err) => {
  console.error('Populate failed:', err);
  process.exit(1);
});
