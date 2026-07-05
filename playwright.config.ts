import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Playwright E2E config for the self-hosted app. By default it builds nothing —
 * it starts `next start` on :3000 (run `npm run build` first, or use the
 * `e2e:ci` script which builds then tests). Specs live in e2e/ and are separate
 * from the Vitest unit suite (tests/). They run against a throwaway SQLite DB so
 * they never touch data/app.db.
 *
 * Override the target with E2E_BASE_URL to run against a deployed instance.
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Only manage a local server when targeting localhost.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          // Isolated DB so e2e never mutates the real data/app.db.
          DATABASE_FILE: path.join(tmpdir(), 'cwk-e2e.db'),
          PORT: '3000',
        },
      },
});
