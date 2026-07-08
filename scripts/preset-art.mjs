// Generate all imagery for the 6 redesigned preset landings and optimize to
// .webp. Free text-to-image via pollinations.ai (flux, no API key), same source
// the in-app generator uses. Idempotent: existing .webp files are skipped, so
// re-runs only fill gaps.
//
//   node scripts/preset-art.mjs            # generate everything missing
//   FORCE=1 node scripts/preset-art.mjs    # re-generate even if present
//   ONLY=pulse,arena node scripts/preset-art.mjs
//
// Output: public/media/generated/presets/<name>.webp

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');

const OUT_DIR = path.join(process.cwd(), 'public', 'media', 'generated', 'presets');
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const FORCE = process.env.FORCE === '1';
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);

fs.mkdirSync(OUT_DIR, { recursive: true });

// Shared quality tail so every render looks intentional and web-ready.
const Q = 'ultra detailed, high resolution, professional photography, sharp focus, no text, no watermark, no logo';
const Q3D = 'ultra detailed 3d render, octane, soft studio lighting, high resolution, no text, no watermark';

/** name → { prompt, w, h }. Names map 1:1 to the art config in lib/presets.ts. */
const MANIFEST = {
  // ---- Launch — SaaS / product, violet, clean 3D ----------------------------
  'launch-hero': { w: 1024, h: 1024, prompt: `friendly cartoon rocket ship blasting off through soft clouds, floating glassmorphism UI dashboard cards around it, violet purple and sky blue gradient, playful product illustration, white background, ${Q3D}` },
  'launch-showcase': { w: 1200, h: 900, prompt: `clean modern SaaS analytics dashboard user interface, charts graphs and sidebar, violet purple accent, light theme, on a laptop screen, crisp product screenshot, ${Q}` },
  'launch-av-1': { w: 480, h: 480, prompt: `portrait headshot of a smiling confident young woman startup founder, soft natural light, plain light studio background, ${Q}` },
  'launch-av-2': { w: 480, h: 480, prompt: `portrait headshot of a friendly young man software engineer, soft natural light, plain light studio background, ${Q}` },

  // ---- Roast — coffee shop, warm orange, editorial --------------------------
  'roast-hero': { w: 1024, h: 1024, prompt: `close up of a cappuccino with beautiful latte art in a ceramic cup on a saucer, scattered roasted coffee beans, warm golden morning light, cozy cafe, shallow depth of field, editorial food photography, ${Q}` },
  'roast-g1': { w: 900, h: 700, prompt: `cozy specialty coffee shop interior, warm ambient lighting, wooden tables, plants, ${Q}` },
  'roast-g2': { w: 900, h: 700, prompt: `barista hands pouring latte art into a cup, close up, warm tones, ${Q}` },
  'roast-g3': { w: 900, h: 700, prompt: `macro of glossy roasted coffee beans, warm brown tones, ${Q}` },
  'roast-g4': { w: 900, h: 700, prompt: `rustic wooden cafe table with a cup of coffee and a croissant, morning light, top view, ${Q}` },
  'roast-g5': { w: 900, h: 700, prompt: `professional espresso machine steaming, warm cafe light, stainless steel, ${Q}` },
  'roast-g6': { w: 900, h: 700, prompt: `people chatting and enjoying coffee in a warm cozy cafe, candid, bokeh, ${Q}` },
  'roast-cta': { w: 1280, h: 620, prompt: `dark moody coffee shop interior in the evening, warm ambient hanging lights, rich bokeh, atmospheric, ${Q}` },

  // ---- Arena — fitness / gym, red, dynamic ----------------------------------
  'arena-hero': { w: 1024, h: 1024, prompt: `athletic fit woman doing a bicep curl with a dumbbell in a modern gym, determined focused expression, dramatic side lighting, red accent, dynamic fitness photography, ${Q}` },
  'arena-f1': { w: 800, h: 600, prompt: `close up of heavy dumbbells on a rack in a modern gym, dramatic lighting, ${Q}` },
  'arena-f2': { w: 800, h: 600, prompt: `energetic indoor cycling spinning group fitness class, motion, gym, ${Q}` },
  'arena-f3': { w: 800, h: 600, prompt: `muscular athlete flexing on a mountain top at sunrise, motivation, ${Q}` },
  'arena-why1': { w: 720, h: 540, prompt: `personal trainer coaching a client with weights in a gym, professional, ${Q}` },
  'arena-why2': { w: 720, h: 540, prompt: `modern round clock on a gym wall with treadmills blurred in the background, ${Q}` },
  'arena-why3': { w: 720, h: 540, prompt: `spacious modern gym interior full of equipment, warm sunlight through windows, ${Q}` },
  'arena-av-1': { w: 480, h: 480, prompt: `portrait headshot of a fit smiling man in a black t-shirt, gym background blurred, ${Q}` },
  'arena-av-2': { w: 480, h: 480, prompt: `portrait headshot of a fit smiling woman fitness trainer, gym background blurred, ${Q}` },
  'arena-cta': { w: 1280, h: 620, prompt: `muscular man doing push ups on the floor of a dark gym, dramatic side light, intense sweat, cinematic, ${Q}` },

  // ---- Studio — design agency, blue, glassmorphism 3D -----------------------
  'studio-hero': { w: 1024, h: 1024, prompt: `floating glassmorphism app icons and brand cards arranged in isometric 3d, blue to white gradient, soft shadows, clean minimal, modern design illustration, ${Q3D}` },
  'studio-g1': { w: 800, h: 600, prompt: `luxury black sunglasses product photo on a dark reflective background, high fashion branding, ${Q}` },
  'studio-g2': { w: 800, h: 600, prompt: `clean white sneakers product photo on a minimal studio background, sportswear brand, ${Q}` },
  'studio-g3': { w: 800, h: 600, prompt: `modern cozy living room interior with warm evening light, real estate photography, ${Q}` },
  'studio-g4': { w: 800, h: 600, prompt: `abstract green glowing music streaming app branding on dark background, ${Q}` },
  'studio-g5': { w: 800, h: 600, prompt: `dark moody UI design workspace on a monitor, purple accent, product design, ${Q}` },
  'studio-g6': { w: 800, h: 600, prompt: `minimal note taking productivity app interface on a light desk, web app, ${Q}` },
  'studio-showcase': { w: 1100, h: 850, prompt: `3d render of stacked frosted glass panels floating with a glossy translucent sphere, blue gradient glassmorphism, soft light, clean, ${Q3D}` },
  'studio-cta': { w: 1100, h: 760, prompt: `3d render of a glossy translucent speech bubble chat icon with floating spheres, blue gradient glassmorphism, clean white background, ${Q3D}` },

  // ---- Maison — fine dining, gold + dark, luxury ----------------------------
  'maison-hero': { w: 1024, h: 1024, prompt: `fine dining gourmet dish, glossy sauce being poured over a seared salmon fillet, elegant plating, warm golden light, michelin star restaurant, editorial food photography, ${Q}` },
  'maison-g1': { w: 800, h: 600, prompt: `elegant candlelit fine dining table setting with wine glasses, warm intimate light, ${Q}` },
  'maison-g2': { w: 800, h: 600, prompt: `gourmet plated fine dining dish close up, artful, warm light, ${Q}` },
  'maison-g3': { w: 800, h: 600, prompt: `luxury restaurant interior with warm ambient lighting and elegant decor, ${Q}` },
  'maison-g4': { w: 800, h: 600, prompt: `white wine glass and delicate flowers on a candlelit dinner table, ${Q}` },
  'maison-g5': { w: 800, h: 600, prompt: `chef plating a gourmet dish with tweezers, close up hands, warm light, ${Q}` },
  'maison-g6': { w: 800, h: 600, prompt: `cozy dark restaurant corner with green plants and warm table lamps, ${Q}` },
  'maison-cta': { w: 1280, h: 620, prompt: `elegant candlelit dinner table at night with wine glasses and flowers, warm golden bokeh, luxury restaurant ambience, ${Q}` },

  // ---- Pulse — music / nightlife event, magenta neon ------------------------
  'pulse-hero': { w: 1024, h: 1024, prompt: `festival concert crowd with hands raised, brilliant purple and magenta stage lights and laser beams, energetic nightlife, ${Q}` },
  'pulse-g1': { w: 900, h: 700, prompt: `DJ performing on a big stage, purple lights over a huge crowd, ${Q}` },
  'pulse-g2': { w: 900, h: 700, prompt: `festival crowd silhouettes against magenta and violet stage lights, ${Q}` },
  'pulse-g3': { w: 900, h: 700, prompt: `concert stage with a spectacular laser light show, purple haze, ${Q}` },
  'pulse-g4': { w: 900, h: 700, prompt: `nightclub crowd dancing under neon pink and blue lights, ${Q}` },
  'pulse-g5': { w: 900, h: 700, prompt: `view from behind a DJ booth toward a cheering crowd, vibrant lights, ${Q}` },
  'pulse-g6': { w: 900, h: 700, prompt: `fireworks and confetti over a festival crowd at night, magenta glow, ${Q}` },
  'pulse-artist1': { w: 480, h: 480, prompt: `moody portrait of a male DJ wearing headphones, purple neon rim light, dark background, ${Q}` },
  'pulse-artist2': { w: 480, h: 480, prompt: `moody portrait of a female DJ wearing sunglasses, magenta neon light, dark background, ${Q}` },
  'pulse-artist3': { w: 480, h: 480, prompt: `moody portrait of a male electronic music artist in a cap, blue stage light, dark background, ${Q}` },
  'pulse-artist4': { w: 480, h: 480, prompt: `moody portrait of a female singer with purple backlight, dark background, ${Q}` },
  'pulse-artist5': { w: 480, h: 480, prompt: `moody portrait of a male DJ with sunglasses, pink neon light, dark background, ${Q}` },
  'pulse-cta': { w: 1280, h: 620, prompt: `silhouette of a DJ from behind facing an enormous festival crowd, epic purple and magenta lights, ${Q}` },
};

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hashSeed(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 1_000_000;
}

async function fetchImage(prompt, w, h, seed) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 2000) return buf; // guard against tiny error bodies
        lastErr = `tiny body (${buf.length}B)`;
      } else {
        lastErr = `HTTP ${res.status}`;
      }
    } catch (e) {
      lastErr = e.message;
    }
    await sleep(2500 * (attempt + 1));
  }
  throw new Error(lastErr);
}

function toWebp(jpgBuf, outPath) {
  const tmp = outPath.replace(/\.webp$/, '.tmp.jpg');
  fs.writeFileSync(tmp, jpgBuf);
  const r = spawnSync(
    ffmpeg,
    ['-y', '-i', tmp, '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', outPath],
    { stdio: 'ignore' },
  );
  fs.rmSync(tmp, { force: true });
  return r.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 0;
}

async function makeOne(name) {
  const spec = MANIFEST[name];
  const out = path.join(OUT_DIR, `${name}.webp`);
  if (!FORCE && fs.existsSync(out) && fs.statSync(out).size > 0) {
    return { name, skipped: true };
  }
  const buf = await fetchImage(spec.prompt, spec.w, spec.h, hashSeed(name));
  if (!toWebp(buf, out)) {
    // ffmpeg missing/failed → keep the raw jpeg so the asset still exists.
    fs.writeFileSync(path.join(OUT_DIR, `${name}.jpg`), buf);
    throw new Error('ffmpeg failed, saved .jpg fallback');
  }
  return { name, bytes: fs.statSync(out).size };
}

async function run() {
  let names = Object.keys(MANIFEST);
  if (ONLY.length) names = names.filter((n) => ONLY.some((p) => n.startsWith(p)));

  console.log(`Generating ${names.length} preset images → ${path.relative(process.cwd(), OUT_DIR)} (concurrency ${CONCURRENCY}, force=${FORCE})\n`);

  const queue = [...names];
  let ok = 0, skip = 0, fail = 0;
  const failed = [];

  async function worker(id) {
    while (queue.length) {
      const name = queue.shift();
      try {
        const r = await makeOne(name);
        if (r.skipped) { skip++; console.log(`  ⏭  ${name} (exists)`); }
        else { ok++; console.log(`  ✓  ${name} (${kb(r.bytes)})`); }
      } catch (e) {
        fail++; failed.push(name); console.log(`  ✗  ${name}: ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  console.log(`\nDone: ${ok} generated, ${skip} skipped, ${fail} failed.`);
  if (failed.length) {
    console.log(`Failed: ${failed.join(', ')}`);
    console.log('Re-run the script to retry the missing ones.');
    process.exitCode = 1;
  }
}

run();
