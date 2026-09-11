import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { API_URL, ensureOnboardedUser } from './helpers/auth';

function signAgentWebhookBody(rawBody: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return `sha256=${digest}`;
}

test.describe('agent webhook', () => {
  test('POST webhook enqueues run with valid HMAC', async ({ request }) => {
    const token = await ensureOnboardedUser(
      `e2e-agent-webhook-${Date.now()}@ai-crm.test`,
      'E2E Agent Webhook',
    );

    const createRes = await request.post(`${API_URL}/api/v1/agents`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'E2E Webhook Trigger',
        templateSlug: 'deal-focus',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { agent } = (await createRes.json()) as {
      agent: { id: string; settings?: { webhookSecret?: string } };
    };

    const secret = agent.settings?.webhookSecret;
    expect(typeof secret).toBe('string');
    expect(secret!.length).toBeGreaterThan(0);

    const rawBody = JSON.stringify({ scope: {} });
    const signature = signAgentWebhookBody(rawBody, secret!);

    const webhookRes = await request.post(`${API_URL}/api/v1/agents/${agent.id}/webhook`, {
      headers: {
        'Content-Type': 'application/json',
        'x-agent-signature': signature,
      },
      data: rawBody,
    });

    expect(webhookRes.status()).toBe(202);
    const body = (await webhookRes.json()) as { run?: { id: string; status: string } };
    expect(body.run?.id).toBeTruthy();
    expect(body.run?.status).toBe('running');
  });
});
