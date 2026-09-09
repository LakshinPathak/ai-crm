import { test, expect } from '@playwright/test';
import { ensureOnboardedUser, setAuthToken } from './helpers/auth';

const AGENTS_USER_EMAIL = 'e2e-agents@ai-crm.test';

test.describe('agents', () => {
  test.beforeEach(async ({ page }) => {
    const token = await ensureOnboardedUser(AGENTS_USER_EMAIL, 'E2E Agents User');
    await setAuthToken(page, token);
  });

  test('template modal groups by category and links to wizard', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /start from template/i }).first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Pick a pre-built agent to kickstart setup')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Process' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Signals' })).toBeVisible();
    await expect(page.getByText('POC Plan Generator')).toBeVisible();
    await expect(page.getByText('Closed Won Handoff')).toBeVisible();

    await page.getByText('Closed Won Handoff').click();

    await expect(page).toHaveURL(/\/agents\/new\?template=closed-won-handoff/, { timeout: 15_000 });
    await expect(page.getByLabel('Agent name')).toHaveValue(/handoff/i, { timeout: 10_000 });
  });

  test('NL generate prefills agent wizard from description', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/agents/new');

    await expect(page.getByText('Describe your agent')).toBeVisible({ timeout: 15_000 });

    const nlBox = page.getByPlaceholder(/every morning/i);
    await nlBox.fill(
      'Every morning Slack me my top 5 stalled deals over fifty thousand dollars with no activity',
    );

    const draftResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/agents/draft-from-nl') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Generate' }).click();
    const response = await draftResponse;
    expect(response.ok()).toBeTruthy();

    await expect(page.getByLabel('Agent name')).not.toHaveValue('', { timeout: 10_000 });
    await expect(page.getByText('AI suggested')).toBeVisible();
  });

  test('draft-from-nl API returns valid schema', async ({ request }) => {
    const token = await ensureOnboardedUser(`e2e-nl-api-${Date.now()}@ai-crm.test`, 'E2E NL API');
    const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000';

    const res = await request.post(`${apiUrl}/api/v1/agents/draft-from-nl`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        description: 'Daily Slack digest of at-risk deals with no activity in 10 days',
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.draft).toBeDefined();
    expect(body.draft.templateSlug).toBeTruthy();
    expect(body.draft.name).toBeTruthy();
    expect(['schedule', 'event', 'manual', 'webhook']).toContain(body.draft.triggerType);
  });
});
