import { test, expect } from '@playwright/test';

// Auth flows — read-only. A rejected login mutates nothing, so this is safe
// even against a populated instance. Uses role/text selectors (Russian UI).
test.describe('login', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('rejects invalid credentials with an error and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(`nobody+${Date.now()}@example.com`);
    await page.locator('input[type="password"]').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('links to registration', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a[href*="/register"]').first().click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('registration wizard', () => {
  test('renders step 1 and validates before advancing', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: 'Далее' })).toBeVisible({ timeout: 15_000 });
    // Advancing with an empty form must surface a validation error and not move on.
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
  });
});
