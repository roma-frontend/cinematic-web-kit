import { NextResponse } from 'next/server';
import { promises as dns } from 'node:dns';
import { getCurrentUser } from '@/lib/auth';
import {
  getSiteForUser,
  getSiteByHostname,
  listDomains,
  addDomain,
  removeDomain,
  setDomainVerified,
  normalizeHostname,
  APP_HOST,
} from '@/lib/sites';

import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };
const MAX_DOMAINS_PER_SITE = 5;

export async function GET(_req: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });
  return NextResponse.json({ domains: listDomains(site.id) });
}

export async function POST(request: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  let body: { hostname?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const hostname = normalizeHostname(body.hostname ?? '');
  if (!hostname) return NextResponse.json({ error: t.invalidDomain }, { status: 400 });
  if (hostname === APP_HOST.split(':')[0] || hostname.endsWith(`.${APP_HOST.split(':')[0]}`)) {
    return NextResponse.json({ error: t.domainBelongsToPlatform }, { status: 400 });
  }
  if (getSiteByHostname(hostname)) {
    return NextResponse.json({ error: t.domainTakenByAnother }, { status: 409 });
  }
  if (listDomains(site.id).length >= MAX_DOMAINS_PER_SITE) {
    return NextResponse.json({ error: t.maxDomains.replace('{max}', String(MAX_DOMAINS_PER_SITE)) }, { status: 400 });
  }

  const domain = addDomain(site.id, hostname);
  return NextResponse.json({ ok: true, domain });
}

/** Re-check DNS for a domain: A-record must point at SERVER_IP, or CNAME at APP_HOST. */
export async function PATCH(request: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  let body: { domainId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const domain = listDomains(site.id).find((d) => d.id === body.domainId);
  if (!domain) return NextResponse.json({ error: t.domainNotFound }, { status: 404 });

  const serverIp = process.env.SERVER_IP || '';
  const appHostname = APP_HOST.split(':')[0];
  let verified = false;
  const details: string[] = [];
  try {
    const cnames = await dns.resolveCname(domain.hostname).catch(() => [] as string[]);
    details.push(cnames.length ? `CNAME: ${cnames.join(', ')}` : t.dnsCnameNone);
    if (cnames.some((c) => c.toLowerCase().replace(/\.$/, '') === appHostname)) verified = true;
    if (!verified) {
      const ips = await dns.resolve4(domain.hostname).catch(() => [] as string[]);
      details.push(ips.length ? `A: ${ips.join(', ')}` : t.dnsANone);
      if (serverIp && ips.includes(serverIp)) verified = true;
      // Without SERVER_IP configured we can't assert the A-record target;
      // treat "resolves at all" as a soft pass so self-hosters aren't blocked.
      if (!serverIp && ips.length > 0) verified = true;
    }
  } catch (e) {
    details.push(e instanceof Error ? e.message : 'DNS lookup failed');
  }

  setDomainVerified(domain.id, verified);
  return NextResponse.json({ ok: true, verified, details });
}

export async function DELETE(request: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get('domainId') ?? '';
  if (!removeDomain(site.id, domainId)) {
    return NextResponse.json({ error: t.domainNotFound }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
