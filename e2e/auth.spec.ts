import { test, expect } from '@playwright/test';

// Auth flows — read-only. A rejected login mutates nothing, so this is safe
// even against a populated instance. Uses stable data-testid selectors.
test.describe.serial('login', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('rejects invalid credentials with an error and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(`nobody+${Date.now()}@example.com`);
    await page.getByTestId('login-password').fill('definitely-wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('links to registration', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('to-register').click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('registration wizard', () => {
  test('renders step 1 and validates before advancing', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByTestId('register-next')).toBeVisible({ timeout: 15_000 });
    // Advancing with an empty form must surface a validation error and not move on.
    await page.getByTestId('register-next').click();
    await expect(page.getByTestId('register-error')).toBeVisible({ timeout: 15_000 });
  });

  test('advances through the steps with valid input', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('register-name').fill('E2E User');
    await page.getByTestId('register-email').fill(`e2e+${Date.now()}@example.com`);
    await page.getByTestId('register-next').click();
    // Step 2: password fields appear.
    await expect(page.getByTestId('register-password')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('register-password').fill('password123');
    await page.getByTestId('register-confirm').fill('password123');
    await page.getByTestId('register-next').click();
    // Step 3: final submit button is shown.
    await expect(page.getByTestId('register-submit')).toBeVisible({ timeout: 15_000 });
  });
});
