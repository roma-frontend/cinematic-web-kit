import { test, expect } from '@playwright/test';

// Routing / access-gate behavior — deterministic, data-independent.
test.describe('routing', () => {
  test('unknown route shows the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz');
    await expect(page.getByText('Страница не найдена')).toBeVisible({ timeout: 15_000 });
  });

  test('protected /dashboard redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // proxy.ts cookie gate bounces to /login with a ?next param.
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('protected /studio redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/studio');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
