import { test, expect } from '@playwright/test';
import { ensureOnboardedUser, setAuthToken } from './helpers/auth';

const DEALS_USER_EMAIL = 'e2e-deals@ai-crm.test';

test.describe('deals', () => {
  test.beforeEach(async ({ page }) => {
    const token = await ensureOnboardedUser(DEALS_USER_EMAIL, 'E2E Deals User');
    await setAuthToken(page, token);
  });

  test('shows kanban board after dev login and workspace seed', async ({ page }) => {
    await page.goto('/deals');

    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Board view')).toBeVisible();
    await expect(page.getByText('Qualification')).toBeVisible({ timeout: 15_000 });
  });

  test('can switch to table list view', async ({ page }) => {
    await page.goto('/deals');

    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText('Table view').click();

    await expect(page.getByRole('columnheader', { name: 'Deal' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
