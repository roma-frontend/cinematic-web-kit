import { test, expect } from '@playwright/test';

// Marketing landing at "/" — public, read-only, data-independent.
test.describe('home', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/');
    // Body is visible and the page produced a non-empty title.
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/.+/, { timeout: 15_000 });
  });

  test('has a route into the app (login/register/dashboard link)', async ({ page }) => {
    await page.goto('/');
    const authLink = page.locator('a[href*="/login"]:visible, a[href*="/register"]:visible, a[href*="/dashboard"]:visible').first();
    await expect(authLink).toBeVisible({ timeout: 15_000 });
  });
});
