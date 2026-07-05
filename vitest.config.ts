import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { tmpdir } from 'node:os';

// Unit tests run in Node (the app uses node:crypto scrypt + better-sqlite3).
// DB-backed tests get an isolated throwaway SQLite file so they never touch the
// real data/app.db. `@` maps to the repo root (matches tsconfig paths).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
    // DB tests share one throwaway SQLite file (singleton connection on
    // globalThis), so run test files sequentially and reset tables per test.
    fileParallelism: false,
    env: {
      DATABASE_FILE: path.join(tmpdir(), `cwk-test-${process.pid}.db`),
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['lib/**/*.ts'],
      // media.ts is a type-only module (no runtime code to execute).
      exclude: ['**/*.test.ts', '**/*.d.ts', 'lib/db/schema.ts', 'lib/media.ts'],
      // Fail CI if coverage regresses below these floors (set under current
      // levels with margin so it catches real drops without being flaky).
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // `server-only` throws when imported outside a React Server env; stub it.
      'server-only': path.resolve(__dirname, 'tests/empty-module.ts'),
    },
  },
});
