import { NextResponse } from 'next/server';
import { getSiteByHostname, APP_HOST } from '@/lib/sites';

export const runtime = 'nodejs';

// Caddy on-demand TLS "ask" endpoint. Caddy calls GET /api/tls-check?domain=<host>
// before issuing a Let's Encrypt certificate for an incoming SNI. We return 200
// only for hostnames we actually serve (the platform host or an attached tenant
// domain), so an attacker can't make us request certs for arbitrary names.
export async function GET(request: Request) {
  const domain = (new URL(request.url).searchParams.get('domain') ?? '').toLowerCase().trim();
  if (!domain) return new NextResponse('missing domain', { status: 400 });

  const appHost = APP_HOST.split(':')[0];
  const allowed =
    domain === appHost ||
    domain.endsWith(`.${appHost}`) ||
    Boolean(getSiteByHostname(domain));

  return allowed ? new NextResponse('ok', { status: 200 }) : new NextResponse('unknown host', { status: 404 });
}
