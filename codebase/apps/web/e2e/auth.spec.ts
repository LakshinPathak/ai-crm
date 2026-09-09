import { test, expect } from '@playwright/test';
import { devLoginViaApi, ensureOnboardedUser, setAuthToken } from './helpers/auth';

test.describe('auth', () => {
  test('dev login via sign-in form redirects new user to onboarding', async ({ page }) => {
    const email = `e2e-ui-${Date.now()}@ai-crm.test`;

    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    const submit = page.getByRole('button', { name: /sign in with email/i });
    await expect(submit).toBeEnabled();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Display name' }).fill('E2E UI User');
    await submit.click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  });

  test('dev login via API redirects to home when onboarding is complete', async ({ page }) => {
    const email = `e2e-api-${Date.now()}@ai-crm.test`;
    const token = await ensureOnboardedUser(email, 'E2E API User');

    await setAuthToken(page, token);
    await page.goto('/home');

    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
    await expect(page.getByRole('link', { name: /view pipeline/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('dev login via API redirects to onboarding when workspace is missing', async ({
    page,
  }) => {
    const email = `e2e-nows-${Date.now()}@ai-crm.test`;
    const token = await devLoginViaApi(email, 'E2E No Workspace');

    await setAuthToken(page, token);
    await page.goto('/deals');

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  });
});
