'use client';

export function MediaPreconnect() {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (!base) return null;
  
  try {
    const origin = new URL(base).origin;
    return (
      <>
        <link rel="preconnect" href={origin} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={origin} />
      </>
    );
  } catch {
    return null;
  }
}
