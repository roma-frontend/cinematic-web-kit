// Host-based tenant routing + light auth gate.
//
//   <slug>.APP_HOST/...   → rewrite /s/<slug>/...      (subdomain sites)
//   any-other-host/...    → rewrite /d/<hostname>/...  (custom domains)
//   APP_HOST/dashboard|studio without a session cookie → redirect /login
//
// No DB access here — hostname → site resolution happens inside the /s and /d
// pages, so this file stays runtime-agnostic and fast.

import { NextResponse, type NextRequest } from 'next/server';

const APP_HOST = (process.env.NEXT_PUBLIC_APP_HOST || 'localhost:3000').toLowerCase();
const APP_HOSTNAME = APP_HOST.split(':')[0];

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', APP_HOSTNAME, `www.${APP_HOSTNAME}`]);

const PROTECTED_PREFIXES = ['/dashboard', '/studio'];

export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
  const hostname = host.split(':')[0];

  // Tenant traffic (foreign host) — rewrite everything except assets/API.
  if (hostname && !LOCAL_HOSTNAMES.has(hostname)) {
    if (hostname.endsWith(`.${APP_HOSTNAME}`)) {
      const sub = hostname.slice(0, -(APP_HOSTNAME.length + 1));
      if (sub && sub !== 'www') {
        return NextResponse.rewrite(new URL(`/s/${sub}${url.pathname === '/' ? '' : url.pathname}${url.search}`, url));
      }
    } else {
      return NextResponse.rewrite(new URL(`/d/${hostname}${url.pathname === '/' ? '' : url.pathname}${url.search}`, url));
    }
  }

  // Main-app traffic: cheap cookie-presence gate for the private areas.
  // (Real session validation happens server-side in pages and API routes.)
  if (PROTECTED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
    if (!request.cookies.get('cwk_session')?.value) {
      const login = new URL('/login', url);
      login.searchParams.set('next', url.pathname + url.search);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and any path with a file extension
  // (uploads, media, favicon…) — those must be served as-is on every host.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
