import { ImageResponse } from 'next/og';

// Apple touch icon (180×180 PNG) — iOS ignores SVG favicons, so we render a
// matching brand mark: indigo rounded square with the Builder Studio block glyph.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#6366f1,#3c68d9)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 104 }}>
          <div style={{ display: 'flex', height: 28, background: '#fff', borderRadius: 9, opacity: 0.95 }} />
          <div style={{ display: 'flex', gap: 12, height: 62 }}>
            <div style={{ display: 'flex', width: 46, background: '#fff', borderRadius: 9, opacity: 0.95 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <div style={{ display: 'flex', flex: 1, background: '#fff', borderRadius: 9, opacity: 0.8 }} />
              <div style={{ display: 'flex', flex: 1, background: '#fff', borderRadius: 9, opacity: 0.6 }} />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
