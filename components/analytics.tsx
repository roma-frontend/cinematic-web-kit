import Script from 'next/script';

/**
 * Privacy-first analytics via Cloudflare Web Analytics.
 *
 * Cloudflare Web Analytics is cookieless and doesn't fingerprint or track users
 * across sites — it collects aggregate traffic + Core Web Vitals (LCP, INP, CLS)
 * using the Real User Monitoring (RUM) beacon. No consent banner needed.
 *
 * Set NEXT_PUBLIC_CF_BEACON_TOKEN in .env.local to enable. Without a token this
 * renders nothing, so local/dev builds stay clean.
 */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;

  return (
    <Script
      id="cf-web-analytics"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
