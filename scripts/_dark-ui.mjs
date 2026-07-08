// TEMP — dark-mode the UI of a landing screenshot while leaving embedded PHOTOS
// untouched. Photos are detected as large "colorful OR textured" blocks
// (morphological opening removes thin text so headings still invert & stay
// readable; dilation fills/covers each photo block). UI (flat white/black/gray)
// is smart-inverted (negate + 180° hue) so backgrounds go dark, text goes light
// and accent colors are preserved. Deleted after use.
import sharp from 'sharp';

const BASE = 'C:/Users/User/Downloads/presets';
const NAMES = ['Launch', 'Roast', 'Arena', 'Studio', 'Maison', 'Pulse'];

// Tunables (analysis runs on a downscaled copy for speed).
const SMALL_W = 560;
const VAR_WIN = 2; // 5x5 variance window
const VAR_T = 55; // luminance-variance threshold → "textured"
const SAT_T = 34; // chroma threshold → "colorful"
const ERODE = 3; // passes: strip thin features (text) from the photo mask
const DILATE = 9; // passes: restore + grow + fill photo blocks
const FEATHER = 10; // gaussian blur (px) on the upscaled mask → soft seams

function morph(src, w, h, passes, dilate) {
  let cur = src;
  for (let p = 0; p < passes; p++) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = dilate ? 0 : 1;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const oob = yy < 0 || yy >= h || xx < 0 || xx >= w;
            const s = oob ? 0 : cur[yy * w + xx];
            if (dilate) {
              if (s) val = 1;
            } else if (!s) {
              val = 0;
            }
          }
        }
        out[y * w + x] = val;
      }
    }
    cur = out;
  }
  return cur;
}

async function photoMask(inPath) {
  const s = await sharp(inPath).resize({ width: SMALL_W }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = s.info.width;
  const h = s.info.height;
  const d = s.data;
  const n = w * h;
  const gray = new Float32Array(n);
  const sat = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = d[i * 3];
    const g = d[i * 3 + 1];
    const b = d[i * 3 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  const raw = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let sum2 = 0;
      let c = 0;
      for (let dy = -VAR_WIN; dy <= VAR_WIN; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -VAR_WIN; dx <= VAR_WIN; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const v = gray[yy * w + xx];
          sum += v;
          sum2 += v * v;
          c++;
        }
      }
      const mean = sum / c;
      const varr = sum2 / c - mean * mean;
      const i = y * w + x;
      raw[i] = varr > VAR_T || sat[i] > SAT_T ? 1 : 0;
    }
  }
  let m = morph(raw, w, h, ERODE, false); // erode → drop thin text
  m = morph(m, w, h, DILATE, true); // dilate → restore/fill photo blocks
  return { mask: m, w, h };
}

async function run(name) {
  const inPath = `${BASE}/${name}.png`;
  const outPath = `${BASE}/dark/${name}.png`;
  const meta = await sharp(inPath).metadata();
  const W = meta.width;
  const H = meta.height;

  const { mask, w, h } = await photoMask(inPath);
  const maskBuf = Buffer.from(mask.map((v) => (v ? 255 : 0)));
  const maskFull = await sharp(maskBuf, { raw: { width: w, height: h, channels: 1 } })
    .resize({ width: W, height: H, fit: 'fill' })
    .blur(FEATHER)
    .raw()
    .toBuffer();

  const orig = await sharp(inPath).removeAlpha().raw().toBuffer();
  const inv = await sharp(inPath).negate({ alpha: false }).modulate({ hue: 180 }).removeAlpha().raw().toBuffer();

  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const mk = maskFull[i] / 255; // 1 = keep original (photo), 0 = dark UI
    const o = i * 3;
    for (let c = 0; c < 3; c++) {
      out[o + c] = Math.round(orig[o + c] * mk + inv[o + c] * (1 - mk));
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(outPath);
  console.log('done', name);
}

const only = process.argv.slice(2);
const list = only.length ? only : NAMES;
for (const n of list) await run(n);
