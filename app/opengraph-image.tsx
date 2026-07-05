import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

// Dynamic Open Graph / social share image (1200×630). Rendered at the edge with
// system fonts (no network fetch), cinematic dark gradient to match the brand.
export const runtime = 'nodejs';
export const alt = `${SITE_NAME} — кинематографичный конструктор сайтов`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'radial-gradient(1200px 630px at 80% -10%, #4f46e5 0%, transparent 55%), linear-gradient(135deg, #0a0a0a 0%, #141425 60%, #0a0a0a 100%)',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, opacity: 0.9 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg,#818cf8,#4f46e5)',
              display: 'flex',
            }}
          />
          {SITE_NAME}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            <span>Cinematic website</span>
            <span>builder</span>
          </div>
          <div style={{ fontSize: 30, color: '#a5b4fc', maxWidth: 900 }}>
            Compose a landing page from AI-video sections and publish it to your own domain — no code.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
