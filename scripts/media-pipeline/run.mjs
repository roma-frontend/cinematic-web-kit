#!/usr/bin/env node
// Media pipeline CLI: generate → optimize → import.
//
// Generate (needs MUAPI_KEY):
//   MUAPI_KEY=sk-... npm run media -- \
//     --prompt "Cinematic macro of brake discs, sparks, slow motion" \
//     --section hero --title "Engineered to Stop" --subtitle "Performance" \
//     --cta "Shop now" --ctaHref "/products" --aspect 16:9
//
// Skip the API, just optimize + import a local clip:
//   npm run media -- --from ./clip.mp4 --section card --title "Filters"
//
// Sections: hero | background | card

import './load-env.mjs'; // load .env/.env.local before lib.mjs reads process.env
import path from 'node:path';
import { generateVideo, download, optimize, importToData, toPublicUrl, slugify, RAW_DIR } from './lib.mjs';

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
const str = (v) => (typeof v === 'string' ? v : undefined);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const title = str(args.title) || str(args.prompt) || 'Generated clip';
  const section = ['hero', 'background', 'card'].includes(args.section) ? args.section : 'card';
  const slug = slugify(str(args.slug) || title);
  const prompt = str(args.prompt) || '';
  const aspect = str(args.aspect) || '16:9';
  const negativePrompt = str(args.negative) || '';
  const style = str(args.style) || '';
  const keepAudio = args.audio === true || str(args.audio) === 'true';

  let sourcePath;
  if (str(args.from)) {
    sourcePath = path.resolve(str(args.from));
    console.log(`[run] local source: ${sourcePath}`);
  } else {
    const videoUrl = await generateVideo({
      prompt,
      negativePrompt,
      model: str(args.model),
      aspectRatio: aspect,
      duration: args.duration ? Number(args.duration) : undefined,
    });
    console.log(`[run] generated: ${videoUrl}`);
    sourcePath = path.join(RAW_DIR, `${slug}.mp4`);
    await download(videoUrl, sourcePath);
    console.log(`[run] downloaded → ${sourcePath}`);
  }

  const { webm, mp4, poster } = await optimize(sourcePath, slug, { keepAudio });

  const entry = {
    id: slug,
    title,
    section,
    prompt: prompt || undefined,
    style: style || undefined,
    negativePrompt: negativePrompt || undefined,
    sound: keepAudio || undefined,
    subtitle: str(args.subtitle),
    ctaLabel: str(args.cta),
    ctaHref: str(args.ctaHref),
    src: toPublicUrl(webm),
    srcMp4: mp4 ? toPublicUrl(mp4) : undefined,
    poster: toPublicUrl(poster),
    aspectRatio: aspect,
    createdAt: new Date().toISOString(),
  };
  // Drop undefined keys for a clean JSON file.
  Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k]);
  await importToData(entry);

  console.log('\n\u2713 Done:');
  console.log(JSON.stringify(entry, null, 2));
  console.log('\nRun `npm run dev` and open http://localhost:3000');
}

main().catch((err) => {
  console.error('\n\u2717 Pipeline failed:', err.message);
  process.exit(1);
});
