// Host-based tenant routing + edge security layer (headers / CSRF-origin /
// rate limit), modeled on hr-project's proxy.ts.
//
//   <slug>.APP_HOST/...   → rewrite /s/<slug>/...      (subdomain sites)
//   any-other-host/...    → rewrite /d/<hostname>/...  (custom domains)
//   APP_HOST/dashboard|studio without a session cookie → redirect /login
//
// Every response (pages AND /api) gets security headers. Mutating /api
// requests must come from the same origin, and /api traffic is rate-limited
// per IP as a flood backstop (strict per-endpoint limits live in the routes).
//
// No DB access here — hostname → site resolution happens inside the /s and /d
// pages, so this file stays runtime-agnostic and fast.

import { NextResponse, type NextRequest } from 'next/server';

const APP_HOST = (process.env.NEXT_PUBLIC_APP_HOST || 'localhost:3000').toLowerCase();
const APP_HOSTNAME = APP_HOST.split(':')[0];

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', APP_HOSTNAME, `www.${APP_HOSTNAME}`]);

const PROTECTED_PREFIXES = ['/dashboard', '/studio'];

const IS_PROD = process.env.NODE_ENV === 'production';

// CSP without nonces (Next's inline bootstrap needs 'unsafe-inline'); still
// blocks foreign scripts, plugins and base-tag hijacking. frame-ancestors is
// added per-audience below (tenant pages stay embeddable, the app does not).
const CSP_BASE = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://telegram.org${IS_PROD ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Tenant sites may reference remote media (R2 public bucket, generated URLs).
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  `connect-src 'self' https:${IS_PROD ? '' : ' ws: wss:'}`,
  "frame-src 'self' https://oauth.telegram.org https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(IS_PROD ? ['upgrade-insecure-requests'] : []),
].join('; ');

// Baseline headers safe for every response (don't affect embedding).
function baseSecurity(res: NextResponse): NextResponse {
  res.headers.set('Content-Security-Policy', CSP_BASE);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PROD) res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.headers.delete('x-powered-by');
  return res;
}

// Extra hardening for the main app (private areas render only same-origin, so
// SAMEORIGIN still allows the builder's own preview iframe). Tenant sites skip
// this so their owners can embed published pages elsewhere.
function appSecurity(res: NextResponse): NextResponse {
  baseSecurity(res);
  res.headers.set('Content-Security-Policy', `${CSP_BASE}; frame-ancestors 'self'`);
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return res;
}

// ── Per-IP API rate limit (in-memory; flood backstop, not a UX limit) ───────
const API_MAX = 600; // requests per window per IP
const API_WINDOW_MS = 10 * 60 * 1000;
const apiHits = new Map<string, { count: number; resetAt: number }>();

function apiRateLimitOk(ip: string): boolean {
  const now = Date.now();
  const cur = apiHits.get(ip);
  if (!cur || cur.resetAt < now) {
    if (apiHits.size > 50_000) apiHits.clear(); // memory backstop
    apiHits.set(ip, { count: 1, resetAt: now + API_WINDOW_MS });
    return true;
  }
  cur.count += 1;
  return cur.count <= API_MAX;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
  const hostname = host.split(':')[0];

  // ── API: same-origin check for mutations + flood rate limit ────────────
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    if (MUTATING_METHODS.has(request.method)) {
      // Browsers always send Origin on cross-site fetches; a mismatch means a
      // CSRF-style request riding on our cookies. Non-browser clients without
      // an Origin header pass (cookies aren't attached by them anyway).
      const origin = request.headers.get('origin');
      if (origin) {
        let originHost = '';
        try {
          originHost = new URL(origin).host.toLowerCase();
        } catch {
          /* malformed origin → mismatch below */
        }
        if (originHost !== host) {
          return baseSecurity(NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 }));
        }
      }
    }
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!apiRateLimitOk(ip)) {
      return baseSecurity(
        NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } }),
      );
    }
    return baseSecurity(NextResponse.next());
  }

  // Tenant traffic (foreign host) — rewrite everything except assets/API.
  if (hostname && !LOCAL_HOSTNAMES.has(hostname)) {
    if (hostname.endsWith(`.${APP_HOSTNAME}`)) {
      const sub = hostname.slice(0, -(APP_HOSTNAME.length + 1));
      if (sub && sub !== 'www') {
        return baseSecurity(NextResponse.rewrite(new URL(`/s/${sub}${url.pathname === '/' ? '' : url.pathname}${url.search}`, url)));
      }
    } else {
      return baseSecurity(NextResponse.rewrite(new URL(`/d/${hostname}${url.pathname === '/' ? '' : url.pathname}${url.search}`, url)));
    }
  }

  // Main-app traffic: cheap cookie-presence gate for the private areas.
  // (Real session validation happens server-side in pages and API routes.)
  if (PROTECTED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
    if (!request.cookies.get('cwk_session')?.value) {
      const login = new URL('/login', url);
      login.searchParams.set('next', url.pathname + url.search);
      return appSecurity(NextResponse.redirect(login));
    }
  }

  return appSecurity(NextResponse.next());
}

export const config = {
  // Skip Next internals and any path with a file extension (uploads, media,
  // favicon…) — those must be served as-is on every host. /api IS matched now
  // so the origin check, rate limit and headers apply to it.
  matcher: ['/((?!_next|.*\\..*).*)'],
};
