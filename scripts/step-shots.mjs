// Capture real product screenshots for the "How it works" showcase steps, in
// both light and dark schemes. Requires the dev/prod server running.
//
//   npm run dev            # in another terminal
//   node scripts/step-shots.mjs
//
// Steps 1 & 2 (brief / builder) live behind auth, so we log in first — the
// login endpoint sets the session cookie on the browser context, so subsequent
// navigations to /studio are authenticated. Credentials come from env:
//   SHOTS_EMAIL, SHOTS_PASSWORD
//
// Output: step-shots/step-<n>-<scheme>.png  (uploaded to R2 by upload-steps.mjs)

import { chromium } from '@playwright/test';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || 'step-shots';
const EMAIL = process.env.SHOTS_EMAIL;
const PASSWORD = process.env.SHOTS_PASSWORD;
// Real site to show in the builder for step 2 ("Соберите страницы").
const BUILDER_SITE = process.env.SHOTS_SITE || 's_s9Cv8OOSKeDG';
fs.mkdirSync(OUT, { recursive: true });

// The authenticated app applies the account's saved theme (PrefsSync), which
// overrides any localStorage seed. So we set the user's stored theme pref to
// match the scheme before each pass, then restore the original at the end.
const db = new Database('./data/app.db');
const user = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL);
const USER_ID = user?.id;
function readPrefs() {
  const row = db.prepare('SELECT prefs FROM user_prefs WHERE user_id = ?').get(USER_ID);
  try { return row ? JSON.parse(row.prefs) : {}; } catch { return {}; }
}
function writeTheme(theme) {
  if (!USER_ID) return;
  const prefs = readPrefs();
  prefs.theme = theme;
  const json = JSON.stringify(prefs);
  const now = Date.now();
  db.prepare(
    'INSERT INTO user_prefs (user_id, prefs, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(user_id) DO UPDATE SET prefs = excluded.prefs, updated_at = excluded.updated_at',
  ).run(USER_ID, json, now);
}
const ORIGINAL_THEME = readPrefs().theme ?? 'dark';

// tabIndex: index of the studio tab bar button to click before shooting.
//   studio tabs order: 0 landing · 1 generate · 2 images · 3 theme · 4 content · 5 layout · 6 config
const STEPS = [
  { n: 1, url: '/studio', tabIndex: 1, wait: 3500 },                     // 01 Опишите идею — AI brief / prompt
  { n: 2, url: `/studio/builder?site=${BUILDER_SITE}`, wait: 5000 },     // 02 Соберите страницы — real site in builder
  { n: 3, url: '/s/__landing__', wait: 4000 },                          // 03 Опубликуйте — the user's own published site
];

const browser = await chromium.launch();

for (const scheme of ['dark', 'light']) {
  writeTheme(scheme); // make PrefsSync apply the scheme in the authed app
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 2 });
  await context.addInitScript((s) => {
    try { localStorage.setItem('theme', s); } catch { /* ignore */ }
  }, scheme);

  // Log in → sets the session cookie on this context.
  const login = await context.request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  console.log(`auth (${scheme}): login ${login.status()}`);

  const page = await context.newPage();

  for (const step of STEPS) {
    const sep = step.url.includes('?') ? '&' : '?';
    const url = `${BASE}${step.url}${scheme === 'light' ? `${sep}scheme=light` : ''}`;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(1500);
      if (step.tabIndex !== undefined) {
        const tab = page.locator('.flex.flex-wrap.gap-1').first().locator('> button').nth(step.tabIndex);
        await tab.click({ timeout: 8000 }).catch((e) => console.log(`  tab click: ${e.message}`));
      }
      await page.waitForTimeout(step.wait);
      const file = path.join(OUT, `step-${step.n}-${scheme}.png`);
      await page.screenshot({ path: file });
      console.log(`\u2713 step ${step.n} (${scheme})`);
    } catch (e) {
      console.log(`\u2717 step ${step.n} (${scheme}): ${e.message}`);
    }
  }
  await context.close();
}

await browser.close();
writeTheme(ORIGINAL_THEME); // restore the account's saved theme
db.close();
console.log(`\nSaved to ${OUT}/  (theme pref restored to '${ORIGINAL_THEME}')`);
