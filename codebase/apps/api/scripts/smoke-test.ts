/**
 * API smoke test — requires API running on localhost:4000.
 * Usage: pnpm smoke
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.DEMO_USER_EMAIL ?? 'smoke@ai-crm.test';

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
  console.log(`API smoke test → ${API}\n`);

  await test('GET /health', async () => {
    const res = await fetch(`${API}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { status?: string };
    if (body.status !== 'ok') throw new Error(`Unexpected body: ${JSON.stringify(body)}`);
  });

  let token: string | undefined;

  if (process.env.NODE_ENV === 'development') {
    await test('POST /auth/dev-login', async () => {
      const res = await fetch(`${API}/api/v1/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, displayName: 'Smoke Test User' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        needsWorkspace?: boolean;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`);
      }
      if (!data.token) throw new Error('No token in response');
      token = data.token;

      if (data.needsWorkspace) {
        const wsRes = await fetch(`${API}/api/v1/onboarding/workspace`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Smoke Test Workspace', timezone: 'UTC' }),
        });
        const wsData = (await wsRes.json().catch(() => ({}))) as {
          token?: string;
          error?: { message?: string };
        };
        if (!wsRes.ok) {
          throw new Error(
            `Workspace setup failed HTTP ${wsRes.status}: ${wsData.error?.message ?? JSON.stringify(wsData)}`,
          );
        }
        if (wsData.token) token = wsData.token;
      }
    });
  } else {
    token = process.env.SMOKE_TEST_TOKEN;
    console.log('  ○ POST /auth/dev-login (skipped — NODE_ENV !== development)');
  }

  if (token) {
    await test('GET /deals/board', async () => {
      const res = await fetch(`${API}/api/v1/deals/board`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        stages?: unknown;
        metrics?: unknown;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`);
      }
      if (!Array.isArray(data.stages) || !data.metrics) {
        throw new Error(`Unexpected response shape: ${JSON.stringify(data)}`);
      }
    });

    await test('POST /api/v1/agents/:id/webhook rejects unsigned request (401)', async () => {
      const createRes = await fetch(`${API}/api/v1/agents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Smoke Webhook Agent',
          templateSlug: 'deal-focus',
        }),
      });
      const createData = (await createRes.json().catch(() => ({}))) as {
        agent?: { id: string };
        error?: { message?: string };
      };
      if (!createRes.ok) {
        throw new Error(
          `Create agent HTTP ${createRes.status}: ${createData.error?.message ?? JSON.stringify(createData)}`,
        );
      }
      const agentId = createData.agent?.id;
      if (!agentId) throw new Error('No agent id in create response');

      const res = await fetch(`${API}/api/v1/agents/${agentId}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: {} }),
      });
      if (res.status !== 401) {
        const body = await res.text().catch(() => '');
        throw new Error(`Expected HTTP 401, got ${res.status}: ${body}`);
      }
    });
  } else {
    console.log('  ○ GET /deals/board (skipped — no auth token)');
    console.log('  ○ POST /api/v1/agents/:id/webhook 401 (skipped — no auth token)');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error('Failed:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
