import { test, expect } from '@playwright/test';

test.describe('blog', () => {
  test('blog index loads', async ({ page }) => {
    await page.goto('/blog');

    await expect(
      page.getByRole('heading', { name: 'Presales insights for revenue teams' }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Latest posts')).toBeVisible();
  });

  test('blog post slug loads', async ({ page }) => {
    await page.goto('/blog/unified-deal-context');

    await expect(
      page.getByRole('heading', {
        name: 'Why unified deal context beats another CRM field',
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: '← Back to all posts' })).toBeVisible();
  });
});
