// Renders a 640x360 PNG cover for the Telegram bot "What can this bot do?" block.
// Brand: indigo gradient (#6366f1 -> #3c68d9) + white block-glyph logo + wordmark.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const W = 640, H = 360;
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bot-cover.png');

// Block-glyph logo (matches app/apple-icon.tsx): a top bar, a tall left block,
// and two stacked right blocks — scaled into a ~104px column.
const logo = (x, y) => `
  <g transform="translate(${x},${y})" fill="#fff">
    <rect x="0"  y="0"  width="104" height="28" rx="9" opacity="0.95"/>
    <rect x="0"  y="40" width="46"  height="62" rx="9" opacity="0.95"/>
    <rect x="58" y="40" width="46"  height="27" rx="9" opacity="0.80"/>
    <rect x="58" y="75" width="46"  height="27" rx="9" opacity="0.60"/>
  </g>`;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#3c68d9"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.12" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  ${logo(72, 96)}

  <g font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif" fill="#fff">
    <text x="210" y="150" font-size="52" font-weight="800" letter-spacing="-1">Builder Studio</text>
    <text x="212" y="188" font-size="22" font-weight="600" opacity="0.92">
      AI-сайты из кинематографичного видео
    </text>
  </g>

  <g font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif" fill="#fff" opacity="0.95" font-size="18" font-weight="600">
    <g transform="translate(72,268)">
      <rect x="0"  y="-20" width="150" height="34" rx="17" fill="#ffffff" fill-opacity="0.16"/>
      <text x="18" y="3">Генерация видео</text>
    </g>
    <g transform="translate(238,268)">
      <rect x="0"  y="-20" width="150" height="34" rx="17" fill="#ffffff" fill-opacity="0.16"/>
      <text x="18" y="3">Конструктор</text>
    </g>
    <g transform="translate(404,268)">
      <rect x="0"  y="-20" width="164" height="34" rx="17" fill="#ffffff" fill-opacity="0.16"/>
      <text x="18" y="3">Публикация сайта</text>
    </g>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().resize(W, H).toFile(out);
console.log('Wrote', out);
