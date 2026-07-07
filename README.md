# Builder Studio

A **Next.js starter** for building modern, good-looking web projects whose sections are driven by **AI-generated cinematic video** (hero banners, full-bleed backgrounds, product-style cards).

It ships with a **media pipeline** that does the boring part for you:

```
prompt → AI video (muapi.ai) → download → optimize to .webm + poster → write data/media.json → render
```

You describe the clip in a prompt, run one command, and it appears in a polished section on the page.

---

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS 4** + **shadcn-compatible** components (`components.json` included)
- **next-themes** (dark mode by default)
- **lucide-react** icons
- **ffmpeg-static** (bundled ffmpeg — no system install needed) for `.webm` optimization
- Media pipeline: plain Node ESM scripts in `scripts/media-pipeline/`

---

## Quick start

```bash
cd cinematic-web-kit
npm install
npm run dev          # http://localhost:3000
```

You'll see the empty-state landing page with instructions. Now add a clip.

### 1. Get an API key (for real generation)

Sign up at **https://muapi.ai**, copy your key, and put it in `.env.local`:

```bash
cp .env.example .env.local
# then edit MUAPI_KEY=sk-...
```

### 2. Generate a cinematic hero

```bash
MUAPI_KEY=sk-... npm run media -- \
  --prompt "Cinematic macro shot of car brake discs, orange sparks, shallow depth of field, slow motion, dramatic rim light" \
  --section hero \
  --title "Engineered to Stop" \
  --subtitle "Performance parts" \
  --cta "Shop now" --ctaHref "/products" \
  --aspect 16:9
```

The pipeline will: submit the prompt → poll until the video is ready → download it →
compress to `public/media/generated/engineered-to-stop.webm` (+ a poster JPG) →
add an entry to `data/media.json`. Refresh the page — the hero is live.

### 3. No API key yet? Use a local clip

Any `.mp4`/`.mov` you already have works — it still gets optimized to `.webm` and imported:

```bash
npm run media -- --from ./my-clip.mp4 --section card --title "Oil Filters"
```

### 4. See what you have

```bash
npm run media:list
```

---

## CLI reference — `npm run media -- [flags]`

| Flag         | Required | Description |
|--------------|----------|-------------|
| `--prompt`   | for generation | Text description of the video (the more cinematic, the better). |
| `--from`     | alt. to prompt | Path to a local video to optimize+import (skips the API). |
| `--section`  | no | `hero` \| `background` \| `card` (default `card`). Controls how it renders. |
| `--title`    | no | Headline shown on the section/card. |
| `--subtitle` | no | Eyebrow text (hero/background). |
| `--cta`      | no | Hero CTA button label. |
| `--ctaHref`  | no | Hero CTA link. |
| `--aspect`   | no | Aspect ratio, e.g. `16:9`, `9:16`, `1:1` (default `16:9`). |
| `--duration` | no | Clip length in seconds (model-dependent). |
| `--slug`     | no | Stable id / filename (auto-derived from title otherwise). Re-running the same slug **replaces** the clip. |
| `--model`    | no | Override the muapi endpoint (defaults to a text→video model). |

Environment: `MUAPI_KEY` (required for generation), optional `MUAPI_BASE`, `MUAPI_VIDEO_ENDPOINT`.

---

## How it renders

`app/page.tsx` reads `data/media.json` and composes three reusable components
(`components/media/`):

- **`VideoHero`** — full-bleed hero: looping video + gradient scrim + headline + CTA.
- **`VideoSection`** — full-width background band with a centered headline.
- **`VideoCard` / `VideoCardGrid`** — product-style tiles in a responsive grid.

All of them use **`LazyVideo`**, which:
- mounts the `<video>` only when it scrolls near the viewport (IntersectionObserver),
- shows the poster image instantly (great for LCP),
- plays muted + looped + `playsInline` (autoplay-safe, mobile-friendly).

`data/media.json` is a **static import**, so `next build` bakes the list in and
`next dev` hot-reloads whenever the pipeline rewrites it.

---

## Working with your AI assistant (the fun part)

This kit is designed so you can **prompt an assistant** (e.g. in Kiro CLI) to build
whole pages. Good patterns to say:

> "Generate a 9:16 vertical hero for a coffee brand: steam rising from a fresh
> espresso, warm morning light, shallow depth of field. Title 'Wake up slower',
> CTA 'Order beans' → /shop. Then add three `card` clips: pour-over, latte art,
> beans roasting."

The assistant will run, per clip:

```bash
npm run media -- --prompt "<cinematic description>" --section <hero|background|card> \
  --title "<headline>" [--subtitle ...] [--cta ... --ctaHref ...] --aspect <ratio>
```

Then it can restyle `app/page.tsx` or add new pages/sections using the components above.

### Prompt tips for cinematic clips
- Name the **shot**: *macro / close-up / wide establishing / aerial / dolly*.
- Add **light**: *golden hour, rim light, neon, volumetric fog, high-key*.
- Add **motion**: *slow motion, time-lapse, parallax, orbiting camera*.
- Add **lens/film look**: *shallow depth of field, anamorphic, 35mm, bokeh*.
- Keep it **one scene** — short prompts describing a single moment render best.

---

## Adding more shadcn components

`components.json` is configured, so you can pull in any shadcn/ui component:

```bash
npx shadcn@latest add card dialog badge
```

They'll land in `components/ui/` and use the same `cn()` util and theme tokens.

---

## Project layout

```
app/
  layout.tsx          # root layout + ThemeProvider (dark by default)
  page.tsx            # landing page composed from data/media.json
  globals.css         # Tailwind 4 theme tokens (light/dark)
components/
  media/              # VideoHero, VideoSection, VideoCard, LazyVideo
  ui/button.tsx       # shadcn-style Button
  theme-provider.tsx
lib/
  media.ts            # MediaEntry type
  utils.ts            # cn()
data/
  media.json          # pipeline output — the source of truth for sections
public/
  media/generated/    # optimized .webm + poster.jpg (committed, ship-ready)
scripts/media-pipeline/
  lib.mjs             # generate / download / optimize / import
  run.mjs             # CLI orchestrator
  list.mjs            # list current clips
```

---

## Deploy

Any Next.js host (Vercel recommended):

```bash
npm run build
```

The generated `.webm`/poster files live in `public/media/generated/` and are
committed, so deploys are self-contained — no runtime API calls needed.

---

## Notes

- **Autoplay**: browsers only autoplay muted videos — the components handle this.
- **Size**: VP9 CRF 34 targets a good web quality/size balance; tune in `lib.mjs`.
- **Audio** is stripped (`-an`) since these are decorative loops. Remove that flag
  in `optimize()` if you need sound.
- **Regenerate** a clip by re-running with the same `--slug` — it overwrites cleanly.
