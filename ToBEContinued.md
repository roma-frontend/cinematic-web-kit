● Это крупный набор из четырёх отдельных релизов. Я уже начал с version history и подтвердил, что для корректной реализации нужны:

    * новая таблица snapshots с миграцией;
    * API создания, списка, получения и восстановления версии;
    * UI истории и compare в Builder;
    * тесты изоляции владельца сайта.

  Продолжу это отдельным безопасным изменением, затем перейду к консолидации palette, landing demo и Lighthouse budgets.

> давай

> продолжай

● Добавляю серверный фундамент истории: автоматические snapshots при сохранении, максимум 50 версий на сайт, и API списка/восстановления с проверкой
  владельца.

┃ ← Edit lib/db/index.ts
┃            @@ -49,6 +49,16 @@
┃   49  49   CREATE UNIQUE INDEX IF NOT EXISTS sites_slug_idx ON sites (slug);
┃   50  50   CREATE INDEX IF NOT EXISTS sites_user_idx ON sites (user_id);
┃   51  51
┃       52 + CREATE TABLE IF NOT EXISTS site_versions (
┃       53 +   id TEXT PRIMARY KEY,
┃       54 +   site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
┃       55 +   created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
┃       56 +   label TEXT NOT NULL DEFAULT '',
┃       57 +   doc TEXT NOT NULL,
┃       58 +   created_at INTEGER NOT NULL
┃       59 + );
┃       60 + CREATE INDEX IF NOT EXISTS site_versions_site_created_idx ON site_versions (site_id, created_at DESC);
┃       61 +
┃   52  62   CREATE TABLE IF NOT EXISTS domains (
┃   53  63     id TEXT PRIMARY KEY,
┃   54  64     site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

┃ ← Edit lib/db/schema.ts
┃            @@ -93,6 +93,20 @@
┃   93  93     (t) => [uniqueIndex('sites_slug_idx').on(t.slug), index('sites_user_idx').on(t.userId)],
┃   94  94   );
┃   95  95
┃       96 + export const siteVersions = sqliteTable(
┃       97 +   'site_versions',
┃       98 +   {
┃       99 +     id: text('id').primaryKey(),
┃      100 +     siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
┃      101 +     createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
┃      102 +     label: text('label').notNull().default(''),
┃      103 +     doc: text('doc').notNull(),
┃      104 +     createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
┃      105 +   },
┃      106 +   (t) => [index('site_versions_site_created_idx').on(t.siteId, t.createdAt)],
┃      107 + );
┃      108 + export type SiteVersion = typeof siteVersions.$inferSelect;
┃      109 +
┃   96 110   export const domains = sqliteTable(
┃   97 111     'domains',
┃   98 112     {

┃ ← Edit lib/sites.ts
┃            @@ -4,7 +4,7 @@
┃    4   4
┃    5   5   import 'server-only';
┃    6   6   import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
┃    7     - import { getDb, newId, sites, domains, submissions, type Site, type Domain } from '@/lib/db';
┃        7 + import { getDb, newId, sites, domains, submissions, siteVersions, type Site, type Domain, type SiteVersion } from '@/lib/db';
┃    8   8   import { type BuilderDoc, type BuilderNode } from '@/lib/builder/types';
┃    9   9   import { legalPages } from '@/lib/builder/templates';
┃   10  10   import { trc, translatePage } from '@/lib/builder/templates-i18n';

┃ ← Edit lib/sites.ts
┃            @@ -155,6 +155,24 @@
┃  155 155       .run();
┃  156 156   }
┃  157 157
┃      158 + const MAX_SITE_VERSIONS = 50;
┃      159 +
┃      160 + export function createSiteVersion(siteId: string, userId: string, doc: BuilderDoc, label = ''): void {
┃      161 +   const db = getDb();
┃      162 +   db.insert(siteVersions).values({ id: newId('sv'), siteId, createdBy: userId, label, doc: JSON.stringify(doc), createdAt: new Date() }).run();
┃      163 +   const excess = db.select({ id: siteVersions.id }).from(siteVersions).where(eq(siteVersions.siteId, siteId)).orderBy(desc(siteVersions.created
┃            At)).all().slice(MAX_SITE_VERSIONS);
┃      164 +   for (const version of excess) db.delete(siteVersions).where(eq(siteVersions.id, version.id)).run();
┃      165 + }
┃      166 +
┃      167 + export function listSiteVersions(siteId: string): Omit<SiteVersion, 'doc'>[] {
┃      168 +   return getDb().select({ id: siteVersions.id, siteId: siteVersions.siteId, createdBy: siteVersions.createdBy, label: siteVersions.label, creat
┃            edAt: siteVersions.createdAt })
┃      169 +     .from(siteVersions).where(eq(siteVersions.siteId, siteId)).orderBy(desc(siteVersions.createdAt)).limit(MAX_SITE_VERSIONS).all();
┃      170 + }
┃      171 +
┃      172 + export function getSiteVersion(siteId: string, versionId: string): SiteVersion | null {
┃      173 +   return getDb().select().from(siteVersions).where(and(eq(siteVersions.siteId, siteId), eq(siteVersions.id, versionId))).get() ?? null;
┃      174 + }
┃      175 +
┃  158 176   /** Copy the draft over the published snapshot. */
┃  159 177   export function publishSite(site: Site): void {
┃  160 178     const doc = syncBuilderPricingPlans(site.id, parseDoc(site.draftDoc) ?? JSON.parse(site.draftDoc) as BuilderDoc);

● Снимок создаётся перед каждой явной записью черновика, поэтому восстановление тоже сохраняет текущую версию и остаётся обратимым.

┃ ← Edit app/api/builder/route.ts
┃            @@ -1,6 +1,6 @@
┃    1   1   import { NextResponse } from 'next/server';
┃    2   2   import { getCurrentUser } from '@/lib/auth';
┃    3     - import { getSiteForUser, parseDoc, saveDraft, publishSite } from '@/lib/sites';
┃        3 + import { createSiteVersion, getSiteForUser, parseDoc, saveDraft, publishSite } from '@/lib/sites';
┃    4   4   import { syncsLiveOnSave } from '@/lib/landing-site';
┃    5   5   import type { BuilderDoc } from '@/lib/builder/types';
┃    6   6   import { DEFAULT_DOC } from '@/lib/builder/types';

┃ ← Edit app/api/builder/route.ts
┃            @@ -60,6 +60,9 @@
┃   60  60       paths.add(p.path);
┃   61  61     }
┃   62  62     try {
┃       63 +     // Snapshot the previous persisted draft so every save is reversible.
┃       64 +     const previous = parseDoc(site.draftDoc);
┃       65 +     if (previous) createSiteVersion(site.id, site.userId, previous, 'Autosave');
┃   63  66       saveDraft(site, doc);
┃   64  67       // If the site is already live, keep the published snapshot in sync on every
┃   65  68       // save (and autosave) so edits appear on /s/<slug> immediately — no extra

┃ ← Create directory app/api/builder/versions

┃ ← Create app/api/builder/versions/route.ts
┃   import { NextResponse } from 'next/server';
┃   import { getCurrentUser } from '@/lib/auth';
┃   import { createSiteVersion, getSiteForUser, getSiteVersion, listSiteVersions, parseDoc, saveDraft } from '@/lib/sites';
┃   import { getLocale } from '@/lib/i18n';
┃   import { apiErrors } from '@/lib/api-errors-dict';
┃   (truncated)

● Проверяю типы серверной части history.