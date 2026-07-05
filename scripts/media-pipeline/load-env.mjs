// Loads .env / .env.local into process.env for the CLI pipeline, mirroring how
// Next.js loads them for the app. Imported FIRST in run.mjs so the values are
// in place before lib.mjs reads them at module-eval time.
//
// Values from these files intentionally OVERRIDE pre-existing shell variables,
// so a stale `MUAPI_VIDEO_ENDPOINT` exported in your terminal can't shadow the
// project config. Only keys present in the files are touched.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

// .env first, then .env.local (local wins).
for (const name of ['.env', '.env.local']) {
  const file = path.join(ROOT, name);
  if (!existsSync(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) process.env[key] = val;
  }
}
