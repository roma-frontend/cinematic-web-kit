/** @type {import('next').NextConfig} */

// Restrict next/image to trusted remote hosts (R2 public bucket + optional
// custom media domain from env). No wildcard '**' — avoids the app becoming an
// open image-optimization proxy for arbitrary hosts.
const remotePatterns = [
  { protocol: 'https', hostname: '*.r2.dev' },
  { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
];
try {
  if (process.env.R2_PUBLIC_BASE_URL) {
    const h = new URL(process.env.R2_PUBLIC_BASE_URL).hostname;
    if (h && !remotePatterns.some((p) => p.hostname === h)) {
      remotePatterns.push({ protocol: 'https', hostname: h });
    }
  }
} catch {
  /* ignore malformed env */
}

const nextConfig = {
  // Core hardening / hygiene.
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    // Modern formats first; fall back automatically.
    formats: ['image/avif', 'image/webp'],
    remotePatterns,
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Strip console.* in production (keep errors/warnings).
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  experimental: {
    // Tree-shake heavy icon/UI barrels for smaller bundles.
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select', 'framer-motion'],
    scrollRestoration: true,
  },

  // CDN/browser cache headers. Security headers live in proxy.ts.
  async headers() {
    return [
      // Static images/fonts under public/ — long cache.
      {
        source: '/:path*.{png,jpg,jpeg,gif,webp,avif,ico,svg,woff,woff2,ttf,otf}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      // Optimized uploads — filenames are unique per upload, safe to cache hard.
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // API — never cache.
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
