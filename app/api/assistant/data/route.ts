import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { assistantDataForRole, type AssistantDataKey, type AssistantRole } from '@/lib/assistant-routes';
import { listSitesForUser } from '@/lib/sites';
import { listUsers, listAllSites } from '@/lib/admin';
import type { Locale } from '@/lib/seo';

export const runtime = 'nodejs';

// Renders a data set the assistant was asked to SHOW as a GitHub-flavored
// markdown table (the widget styles it like a clean PDF table). Every data set
// is gated by the caller's role via assistantDataForRole — a customer can only
// ever pull their own sites.

const MAX_ROWS = 50;

function cell(v: unknown): string {
  return String(v ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

function fmtDate(iso: string | number | Date | null, locale: Locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'hy' ? 'hy-AM' : locale === 'en' ? 'en-US' : 'ru-RU',
    { year: 'numeric', month: 'short', day: 'numeric' });
}

const H: Record<Locale, Record<string, string>> = {
  ru: { name: 'Название', slug: 'Адрес', status: 'Статус', updated: 'Обновлён', email: 'Email', role: 'Роль', sites: 'Сайты', owner: 'Владелец', published: 'Опубликован', draft: 'Черновик', online: 'онлайн', active: 'активен', suspended: 'заблокирован', empty: 'Пусто.' },
  en: { name: 'Name', slug: 'Address', status: 'Status', updated: 'Updated', email: 'Email', role: 'Role', sites: 'Sites', owner: 'Owner', published: 'Published', draft: 'Draft', online: 'online', active: 'active', suspended: 'suspended', empty: 'Nothing here.' },
  hy: { name: 'Անուն', slug: 'Հասցե', status: 'Կարգավիճակ', updated: 'Թարմացվել է', email: 'Email', role: 'Դեր', sites: 'Կայքեր', owner: 'Սեփականատեր', published: 'Հրապարակված', draft: 'Սևագիր', online: 'օնլայն', active: 'ակտիվ', suspended: 'արգելափակված', empty: 'Դատարկ է։' },
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  let body: { type?: string; lang?: Locale } = {};
  try { body = await request.json(); } catch { /* empty */ }

  const role = (user.role as AssistantRole) ?? 'customer';
  const locale: Locale = body.lang === 'en' || body.lang === 'hy' ? body.lang : 'ru';
  const t = H[locale];
  const type = body.type as AssistantDataKey;

  // Role gate: reject any data set not allowed for this role.
  if (!type || !assistantDataForRole(role).includes(type)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let markdown = '';
  if (type === 'my-sites') {
    const rows = listSitesForUser(user.id).slice(0, MAX_ROWS).map((s) => [
      s.name, `/${s.slug}`, s.publishedAt ? `✅ ${t.published}` : `📝 ${t.draft}`, fmtDate(s.updatedAt, locale),
    ]);
    markdown = rows.length ? table([t.name, t.slug, t.status, t.updated], rows) : t.empty;
  } else if (type === 'users') {
    const rows = listUsers().slice(0, MAX_ROWS).map((u) => [
      u.name, u.email, u.role, String(u.siteCount),
      u.online ? `🟢 ${t.online}` : u.isActive ? t.active : `⛔ ${t.suspended}`,
    ]);
    markdown = rows.length ? table([t.name, t.email, t.role, t.sites, t.status], rows) : t.empty;
  } else if (type === 'all-sites') {
    const rows = listAllSites().slice(0, MAX_ROWS).map((s) => [
      s.name, s.ownerName || s.ownerEmail, `/${s.slug}`, s.published ? `✅ ${t.published}` : `📝 ${t.draft}`,
    ]);
    markdown = rows.length ? table([t.name, t.owner, t.slug, t.status], rows) : t.empty;
  }

  return NextResponse.json({ markdown });
}
