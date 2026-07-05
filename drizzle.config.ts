import { defineConfig } from 'drizzle-kit';

// Schema changes are applied at runtime via the idempotent SQL in
// lib/db/index.ts; this config exists so `npx drizzle-kit studio` / `generate`
// can be used for inspection and future migration files.
export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_FILE || './data/app.db' },
});
