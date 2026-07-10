#!/usr/bin/env node
// Capture onboarding screenshots/clips for RU/EN/HY in light and dark themes,
// optimize them, upload to R2, then delete the temp files. The asset manifest
// lives in docs/onboarding-video/manifest.json so the repo and the script stay
// in sync.

import './media-pipeline/load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import { AwsClient } from 'aws4fetch';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const ffmpeg = require('ffmpeg-static');

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'docs', 'onboarding-video', 'manifest.json');
const DB_FILE = process.env.DATABASE_FILE || path.join(ROOT, 'data', 'app.db');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || path.join(os.tmpdir(), `cwk-onboarding-${Date.now()}`);
const THEMES = (process.env.THEMES || 'light,dark').split(',').map((s) => s.trim()).filter(Boolean);
const LOCALES = (process.env.LOCALES || 'ru,en,hy').split(',').map((s) => s.trim()).filter(Boolean);
const SESSION = process.env.SESSION_TOKEN || '';
const SITE = process.env.SITE || '';
const KEEP_TEMP = process.env.KEEP_TEMP === '1';
const VW = Number(process.env.VW || 1600);
const VH = Number(process.env.VH || 900);

function usage() {
  console.log('Usage: node scripts/onboarding-video.mjs [--no-upload] [--themes light,dark] [--locales ru,en,hy]');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) { usage(); process.exit(0); }
if (args['no-upload']) process.env.UPLOAD = '0';
if (typeof args.themes === 'string') process.env.THEMES = args.themes;
if (typeof args.locales === 'string') process.env.LOCALES = args.locales;
const shouldUpload = args['no-upload'] ? false : process.env.UPLOAD !== '0';
const keepLocal = !shouldUpload || KEEP_TEMP;
if (!SESSION) {
  console.error('[onboarding] SESSION_TOKEN is required');
  process.exit(1);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`[onboarding] manifest not found: ${MANIFEST_PATH}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const outputPrefix = manifest.outputPrefix || 'media/onboarding-video';
const scenes = manifest.scenes || [];

const browser = await chromium.launch();
const browserContextCookies = [];
if (SESSION) browserContextCookies.push({ name: 'cwk_session', value: SESSION, url: BASE });

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

function getDb() {
  return new Database(DB_FILE);
}

function sessionUserId(token) {
  if (!token) return null;
  const db = getDb();
  try {
    const row = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(hashToken(token));
    return row?.user_id ?? null;
  } finally {
    db.close();
  }
}

function readPrefs(userId) {
  const db = getDb();
  try {
    const row = db.prepare('SELECT prefs FROM user_prefs WHERE user_id = ?').get(userId);
    if (!row?.prefs) return {};
    try { return JSON.parse(row.prefs); } catch { return {}; }
  } finally {
    db.close();
  }
}

function writePrefs(userId, prefs) {
  const db = getDb();
  const now = Date.now();
  const json = JSON.stringify(prefs);
  try {
    const has = db.prepare('SELECT 1 FROM user_prefs WHERE user_id = ?').get(userId);
    if (has) db.prepare('UPDATE user_prefs SET prefs = ?, updated_at = ? WHERE user_id = ?').run(json, now, userId);
    else db.prepare('INSERT INTO user_prefs (user_id, prefs, updated_at) VALUES (?, ?, ?)').run(userId, json, now);
  } finally {
    db.close();
  }
}

function setTheme(userId, theme) {
  const prefs = readPrefs(userId);
  const prev = prefs.theme ?? null;
  prefs.theme = theme;
  writePrefs(userId, prefs);
  return prev;
}

function restoreTheme(userId, previous) {
  const prefs = readPrefs(userId);
  if (previous === null) delete prefs.theme;
  else prefs.theme = previous;
  writePrefs(userId, prefs);
}

// Auto-playing product tours would pop modals over the screenshots, so mark
// every tour as "seen" for the duration of the capture and restore afterwards.
const TOUR_KEYS = ['tour:studio-builder', 'tour:site-content', 'tour:dashboard-sites', 'tour:dashboard-overview'];
function suppressTours(userId) {
  const prefs = readPrefs(userId);
  const restore = {};
  for (const k of TOUR_KEYS) {
    restore[k] = Object.prototype.hasOwnProperty.call(prefs, k) ? prefs[k] : undefined;
    prefs[k] = true;
  }
  writePrefs(userId, prefs);
  return restore;
}
function restoreTours(userId, restore) {
  const prefs = readPrefs(userId);
  for (const k of TOUR_KEYS) {
    if (restore[k] === undefined) delete prefs[k];
    else prefs[k] = restore[k];
  }
  writePrefs(userId, prefs);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function optimizePng(src, dst) {
  const r = spawnSync(ffmpeg, ['-y', '-i', src, '-vf', 'scale=1600:-1:flags=lanczos', '-compression_level', '100', dst], { stdio: 'ignore' });
  return r.status === 0 && fs.existsSync(dst);
}

function optimizeMp4(src, dst) {
  const r = spawnSync(ffmpeg, [
    '-y', '-i', src, '-an', '-c:v', 'libx264', '-crf', '28', '-preset', 'veryslow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', 'scale=1280:-2', dst,
  ], { stdio: 'ignore' });
  return r.status === 0 && fs.existsSync(dst);
}

function relKey(file) {
  return `${outputPrefix}/${path.relative(OUT, file).split(path.sep).join('/')}`;
}

async function uploadFile(file) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('R2_* env vars are required for upload');
  }
  const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
  const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
  const body = fs.readFileSync(file);
  const key = relKey(file);
  const ext = file.split('.').pop().toLowerCase();
  const res = await client.fetch(`${endpoint}/${encodeURI(key)}`, {
    method: 'PUT',
    body: new Uint8Array(body),
    headers: { 'content-type': CT[ext] || 'application/octet-stream' },
  });
  if (!res.ok) throw new Error(`R2 upload failed for ${key}: HTTP ${res.status}`);
  console.log(`  ✓ ${key} (${kb(body.length)})`);
}

async function captureScreenshot(page, file) {
  ensureDir(file);
  const raw = `${file}.raw.png`;
  await page.screenshot({ path: raw });
  if (!optimizePng(raw, file)) fs.renameSync(raw, file);
  fs.rmSync(raw, { force: true });
}

function sceneContext(locale, theme) {
  return { locale, theme, site: SITE };
}

const OVERLAY_LABELS = {
  ru: {
    'dashboard-trial': '7 дней Pro бесплатно',
    'quick-start': 'Ваш быстрый старт',
    'ai-wizard': 'Опишите бизнес здесь',
    'builder-ai': 'AI-строка для команд',
    'builder-palette': 'Блоки добавляются отсюда',
    publish: 'Кнопка публикации',
    submissions: 'Заявки клиентов',
    members: 'Участники команды',
    billing: 'Подписка и тарифы',
  },
  en: {
    'dashboard-trial': '7 days of Pro for free',
    'quick-start': 'Your quick start',
    'ai-wizard': 'Describe your business here',
    'builder-ai': 'AI command bar',
    'builder-palette': 'Add blocks from here',
    publish: 'Publish button',
    submissions: 'Customer leads',
    members: 'Team members',
    billing: 'Subscription and plans',
  },
  hy: {
    'dashboard-trial': '7 օր Pro անվճար',
    'quick-start': 'Ձեր արագ մեկնարկը',
    'ai-wizard': 'Նկարագրեք բիզնեսը այստեղ',
    'builder-ai': 'AI հրամանների տող',
    'builder-palette': 'Բլոկները այստեղից',
    publish: 'Հրապարակման կոճակ',
    submissions: 'Հաճախորդների հայտեր',
    members: 'Թիմի անդամներ',
    billing: 'Բաժանորդագրություն',
  },
};

async function injectSceneOverlay(page, sceneId, locale) {
  const labels = OVERLAY_LABELS[locale] || OVERLAY_LABELS.en;
  const label = labels[sceneId] || labels.en?.[sceneId] || sceneId;
  await page.evaluate(({ sceneId: id, label: text }) => {
    const old = document.getElementById('cwk-onboarding-arrow-overlay');
    old?.remove();

    const byText = (selector, needles) => {
      const els = Array.from(document.querySelectorAll(selector));
      return els.find((el) => needles.some((needle) => (el.textContent || '').toLowerCase().includes(needle.toLowerCase())));
    };
    const firstExisting = (selectors) => selectors.map((sel) => document.querySelector(sel)).find(Boolean);
    const targetFor = () => {
      // Point at the compact "See plans" pill in the trial banner (not the whole full-width bar).
      if (id === 'dashboard-trial') return document.querySelector('a[href="/pricing"]') || byText('*', ['Pro']);
      if (id === 'quick-start') return byText('h2', ['Быстрый старт', 'Quick start', 'Արագ մեկնարկ'])?.closest('div[class*="rounded"]');
      if (id === 'ai-wizard') return document.querySelector('textarea') || document.querySelector('input');
      if (id === 'builder-ai') return firstExisting(['[aria-label="AI-редактирование"]', '[aria-label="AI editing"]', '[aria-label="AI խմբագրում"]']);
      if (id === 'builder-palette') return document.querySelector('[data-tour="palette-search"]') || document.querySelector('[data-tour="palette"]');
      if (id === 'publish') return firstExisting(['[aria-label="Опубликовать"]', '[aria-label="Обновить"]', '[aria-label="Publish"]', '[aria-label="Update"]', '[aria-label="Հրապարակել"]', '[aria-label="Թարմացնել"]']);
      // Highlight the first seeded lead card so the arrow lands on real content.
      if (id === 'submissions') return document.querySelector('[class*="uppercase"]')?.closest('div[class*="rounded-2xl"]')
        || document.querySelector('a[href="/dashboard/submissions"]')
        || byText('h1,h2', ['Заявки', 'Leads', 'Հայտեր']);
      // Highlight the "Team" item in the left workspace nav (content shows members list).
      if (id === 'members') return document.querySelector('a[href="/dashboard/members"]')
        || byText('button', ['Добавить участника', 'Add member', 'Ավելացնել անդամ'])
        || byText('h1,h2', ['Участники', 'Organization users', 'Կազմակերպության']);
      // Point at the "See plans" CTA inside the subscription card.
      if (id === 'billing') return byText('a,button', ['тариф', 'plan', 'սակագ'])
        || byText('h1,h2', ['Подписка', 'Subscription', 'Բաժանորդագրություն']);
      return null;
    };

    const target = targetFor();
    const rect = target?.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'cwk-onboarding-arrow-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <style>
        #cwk-onboarding-arrow-overlay { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        #cwk-onboarding-arrow-overlay .ring { position: fixed; border: 3px solid var(--primary, #6366f1); border-radius: 18px; box-shadow: 0 0 0 7px color-mix(in oklch, var(--primary, #6366f1) 20%, transparent), 0 18px 60px color-mix(in oklch, var(--primary, #6366f1) 35%, transparent); animation: cwkPulse 1.35s ease-in-out infinite; }
        #cwk-onboarding-arrow-overlay .label { position: fixed; display: inline-flex; align-items: center; gap: 8px; max-width: 300px; border-radius: 999px; background: color-mix(in oklch, var(--primary, #6366f1) 92%, #0b1220); color: white; padding: 11px 16px; font-size: 15px; font-weight: 800; letter-spacing: -0.01em; box-shadow: 0 18px 55px rgba(0,0,0,.28); animation: cwkFloat 1.6s ease-in-out infinite; }
        #cwk-onboarding-arrow-overlay .dot { width: 9px; height: 9px; border-radius: 999px; background: white; box-shadow: 0 0 0 6px rgba(255,255,255,.2); }
        #cwk-onboarding-arrow-overlay .arrow { position: fixed; width: 62px; height: 62px; transform-origin: center; filter: drop-shadow(0 3px 10px rgba(0,0,0,.5)); }
        #cwk-onboarding-arrow-overlay .arrow svg { width: 100%; height: 100%; display: block; animation: cwkBlink 1s ease-in-out infinite; transform-origin: center; }
        #cwk-onboarding-arrow-overlay .arrow path { fill: var(--primary, #6366f1); stroke: #fff; stroke-width: 1.1; stroke-linejoin: round; }
        @keyframes cwkBlink { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.9); } }
        @keyframes cwkPulse { 0%,100% { transform: scale(1); opacity: .95; } 50% { transform: scale(1.018); opacity: 1; } }
        @keyframes cwkFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      </style>
      <div class="ring"></div>
      <div class="arrow"><svg viewBox="0 0 24 24"><path d="M2 8.5 L13 8.5 L13 4 L22 12 L13 20 L13 15.5 L2 15.5 Z"></path></svg></div>
      <div class="label"><span class="dot"></span><span></span></div>
    `;
    document.body.appendChild(overlay);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rawSafe = rect && rect.width > 2 && rect.height > 2
      ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      : { left: vw * 0.34, top: vh * 0.38, width: vw * 0.32, height: 90 };
    // Clamp the highlighted rect into the viewport so the ring never spills off-screen.
    const RM = 16;
    const rLeft = Math.max(RM, rawSafe.left);
    const rTop = Math.max(RM, rawSafe.top);
    const rRight = Math.min(vw - RM, rawSafe.left + rawSafe.width);
    const rBottom = Math.min(vh - RM, rawSafe.top + rawSafe.height);
    const safe = { left: rLeft, top: rTop, width: Math.max(24, rRight - rLeft), height: Math.max(24, rBottom - rTop) };
    const pad = 8;
    const ring = overlay.querySelector('.ring');
    ring.style.left = `${Math.max(6, safe.left - pad)}px`;
    ring.style.top = `${Math.max(6, safe.top - pad)}px`;
    ring.style.width = `${Math.min(vw - 12, safe.width + pad * 2)}px`;
    ring.style.height = `${Math.min(vh - 12, safe.height + pad * 2)}px`;

    const labelEl = overlay.querySelector('.label');
    labelEl.querySelector('span:last-child').textContent = text;
    // Measure the real label so placement uses true dimensions.
    const LW = Math.min(320, labelEl.offsetWidth || 260);
    const LH = labelEl.offsetHeight || 46;
    const M = 20;          // viewport margin for the label
    const TOP_SAFE = 92;   // keep clear of the fixed top header bar
    const gap = 74;        // gap between target and label — leaves room for the arrow
    const tCx = safe.left + safe.width / 2;
    const tCy = safe.top + safe.height / 2;
    const roomRight = vw - (safe.left + safe.width);
    const roomLeft = safe.left;
    const roomBelow = vh - (safe.top + safe.height);

    // Pick the side with enough room; clamp fully inside the viewport afterwards.
    let placement, labelX, labelY;
    if (roomRight >= LW + gap + M) { placement = 'right'; labelX = safe.left + safe.width + gap; labelY = tCy - LH / 2; }
    else if (roomLeft >= LW + gap + M) { placement = 'left'; labelX = safe.left - gap - LW; labelY = tCy - LH / 2; }
    else if (roomBelow >= LH + gap + M) { placement = 'bottom'; labelX = tCx - LW / 2; labelY = safe.top + safe.height + gap; }
    else { placement = 'top'; labelX = tCx - LW / 2; labelY = safe.top - gap - LH; }

    labelX = Math.max(M, Math.min(vw - LW - M, labelX));
    labelY = Math.max(TOP_SAFE, Math.min(vh - LH - M, labelY));
    labelEl.style.left = `${labelX}px`;
    labelEl.style.top = `${labelY}px`;

    // Solid block arrow sits in the gap between the label and the target,
    // rotated to point straight at the target edge (matches the builder tutorial).
    const arrowEl = overlay.querySelector('.arrow');
    const AS = 62;              // arrow box size (must match CSS)
    const edgeOffset = 20;      // arrow tip distance from the target edge
    let ax, ay, rot;
    if (placement === 'right') { rot = 180; ax = safe.left + safe.width + edgeOffset; ay = tCy; }
    else if (placement === 'left') { rot = 0; ax = safe.left - edgeOffset; ay = tCy; }
    else if (placement === 'bottom') { rot = 270; ax = tCx; ay = safe.top + safe.height + edgeOffset; }
    else { rot = 90; ax = tCx; ay = safe.top - edgeOffset; }
    ax = Math.max(AS / 2 + 4, Math.min(vw - AS / 2 - 4, ax));
    ay = Math.max(AS / 2 + 4, Math.min(vh - AS / 2 - 4, ay));
    arrowEl.style.left = `${ax - AS / 2}px`;
    arrowEl.style.top = `${ay - AS / 2}px`;
    arrowEl.style.transform = `rotate(${rot}deg)`;
  }, { sceneId, label });
  await page.waitForTimeout(300);
}

const sceneRuns = {
  'ai-wizard': async (page, { locale }) => {
    const input = page.locator('input').first();
    const brief = page.locator('textarea').first();
    await input.fill(locale === 'ru' ? 'Кофейня Утро' : locale === 'hy' ? 'Առավոտյան սրճարան' : 'Morning Coffee').catch(() => {});
    await brief.fill(locale === 'ru'
      ? 'Уютная кофейня с завтраками, доставкой и бронью столов.'
      : locale === 'hy'
        ? 'Հարմարավետ սրճարան նախաճաշերով, առաքմամբ և սեղանի ամրագրումով։'
        : 'A cozy coffee shop with breakfast, delivery and table booking.'
    ).catch(() => {});
    const btn = page.getByRole('button').last();
    await btn.click().catch(() => {});
  },
  'builder-ai': async (page, { locale }) => {
    const labels = { ru: 'AI-редактирование', en: 'AI editing', hy: 'AI խմբագրում' };
    const bar = page.getByLabel(labels[locale] || labels.en);
    await bar.fill(locale === 'ru' ? 'сделай неоновый ночной стиль' : locale === 'hy' ? 'դարձրու նեոնային գիշերային ոճ' : 'make it a neon night style').catch(() => {});
    await bar.press('Enter').catch(() => {});
  },
  'builder-palette': async (page, { locale }) => {
    await page.click('[data-tour="tab-blocks"]').catch(() => {});
    await page.waitForTimeout(650);
    await page.locator('[data-tour="palette-search"]').fill(locale === 'ru' ? 'курс' : locale === 'hy' ? 'դասընթաց' : 'course').catch(() => {});
  },
  'publish': async (page, { locale }) => {
    const labels = {
      ru: ['Опубликовать', 'Обновить'],
      en: ['Publish', 'Update'],
      hy: ['Հրապարակել', 'Թարմացնել'],
    };
    for (const label of labels[locale] || labels.en) {
      if (await page.getByLabel(label).count().catch(() => 0)) {
        await page.getByLabel(label).click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(1500);
  },
};

// Optional per-scene preparation that runs for BOTH screenshots and clips,
// right before the arrow overlay is injected (e.g. open the right tab).
const scenePrep = {
  members: async (page) => {
    await page.click('[data-tab="members"]').catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('#members')?.scrollIntoView({ block: 'start' })).catch(() => {});
    await page.waitForTimeout(400);
  },
};

const scenesById = new Map(scenes.map((scene) => [  scene.id,
  { ...scene, run: sceneRuns[scene.id] || (async () => {}) },
]));

const currentUserId = sessionUserId(SESSION);
if (!currentUserId) {
  console.error('[onboarding] SESSION_TOKEN did not resolve to a user');
  process.exit(1);
}
const previousTheme = currentUserId ? (readPrefs(currentUserId).theme ?? null) : null;
const tourRestore = currentUserId ? suppressTours(currentUserId) : null;

try {
  for (const locale of LOCALES.filter(Boolean)) {
    console.log(`» locale=${locale}`);
    for (const theme of THEMES.filter(Boolean)) {
      console.log(`  · theme=${theme}`);
      let prev = null;
      if (currentUserId) prev = setTheme(currentUserId, theme);
      try {
        for (const scene of scenes) {
          const s = scenesById.get(scene.id);
          if (!s) continue;
          const ctxOptions = { viewport: { width: VW, height: VH } };
          if (s.kind === 'clip') {
            ctxOptions.recordVideo = { dir: path.join(OUT, '_raw-videos'), size: { width: VW, height: VH } };
          }
          const ctx = await browser.newContext(ctxOptions);
          await ctx.addCookies(browserContextCookies.concat([{ name: 'NEXT_LOCALE', value: locale, url: BASE }]));
          await ctx.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              localStorage.setItem('next-themes', t);
            } catch {}
          }, theme);
          const page = await ctx.newPage();
          const route = `${BASE}${s.route}${s.route.includes('?') ? '&' : '?'}locale=${encodeURIComponent(locale)}${SITE ? `&site=${encodeURIComponent(SITE)}` : ''}`;
          await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 45_000 }).catch(() => {});
          await page.waitForTimeout(1200);
          if (scenePrep[s.id]) await scenePrep[s.id](page).catch(() => {});
          await injectSceneOverlay(page, s.id, locale);

          if (s.kind === 'screenshot') {
            const out = path.join(OUT, locale, theme, `${s.id}.png`);
            await captureScreenshot(page, out);
            if (shouldUpload) {
              await uploadFile(out);
              fs.rmSync(out, { force: true });
            }
          } else {
            await s.run(page, sceneContext(locale, theme)).catch(() => {});
            await page.waitForTimeout(1800);
            const video = page.video();
            await ctx.close();
            const videoPath = video ? await video.path().catch(() => '') : '';
            if (videoPath) {
              const out = path.join(OUT, locale, theme, `${s.id}.mp4`);
              ensureDir(out);
              if (!optimizeMp4(videoPath, out)) fs.copyFileSync(videoPath, out);
              if (shouldUpload) {
                await uploadFile(out);
                fs.rmSync(out, { force: true });
              }
            }
            continue;
          }

          await ctx.close();
        }
      } finally {
        if (currentUserId) restoreTheme(currentUserId, prev);
      }
    }
  }
  console.log('\n[onboarding] done');
} catch (err) {
  console.error(`\n[onboarding] failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (!keepLocal) fs.rmSync(OUT, { recursive: true, force: true });
  if (currentUserId && tourRestore) restoreTours(currentUserId, tourRestore);
  if (currentUserId && previousTheme !== (readPrefs(currentUserId).theme ?? null)) {
    restoreTheme(currentUserId, previousTheme);
  }
}
