import { test, expect } from '@playwright/test';
import { API_URL, ensureOnboardedUser, setAuthToken } from './helpers/auth';

const DEAL_ASK_USER_EMAIL = 'e2e-deal-ask@ai-crm.test';

test.describe('deal ask', () => {
  test.beforeEach(async ({ page }) => {
    const token = await ensureOnboardedUser(DEAL_ASK_USER_EMAIL, 'E2E Deal Ask User');
    await setAuthToken(page, token);
  });

  test('insights tab shows ask panel', async ({ page, request }) => {
    const token = await ensureOnboardedUser(DEAL_ASK_USER_EMAIL, 'E2E Deal Ask User');

    const dealsRes = await request.get(`${API_URL}/api/v1/deals?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dealsRes.ok()).toBeTruthy();
    const { deals } = (await dealsRes.json()) as { deals: { id: string }[] };
    expect(deals.length).toBeGreaterThan(0);

    const dealId = deals[0].id;
    await page.goto(`/deals/${dealId}?tab=insights`);

    await expect(page.getByRole('heading', { name: 'Ask about this deal' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByPlaceholder(/what objections came up/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask' })).toBeVisible();
  });
});
