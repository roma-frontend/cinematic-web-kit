import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { buildStyledWorkbook } from '@/lib/xlsx-style';
import { deviceLabel } from '@/lib/admin';
import { getDb, users, sites, sessions, submissions, audit } from '@/lib/db';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Tabular export of any platform table (superadmin only):
// GET /api/admin/export?type=users|sites|sessions|submissions|audit&format=xlsx|csv
// XLSX (default) is styled (brand header, zebra, autofilter); CSV is
// Excel-friendly: UTF-8 BOM, quoted cells, CRLF rows.

const csvCell = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCsv = (header: string[], rows: unknown[][]): string =>
  '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
const when = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

function buildExport(type: string): { title: string; header: string[]; rows: unknown[][] } | null {
  const db = getDb();
  switch (type) {
    case 'users': {
      const rows = db
        .select({ user: users })
        .from(users)
        .orderBy(desc(users.createdAt))
        .all();
      return {
        title: 'Пользователи',
        header: ['ID', 'Email', 'Имя', 'Роль', 'Статус', 'Регистрация'],
        rows: rows.map(({ user: u }) => [u.id, u.email, u.name, u.role, u.isActive ? 'активен' : 'заблокирован', when(u.createdAt)]),
      };
    }
    case 'sites': {
      const rows = db
        .select({ site: sites, owner: users })
        .from(sites)
        .innerJoin(users, eq(sites.userId, users.id))
        .orderBy(desc(sites.updatedAt))
        .all();
      return {
        title: 'Сайты',
        header: ['ID', 'Название', 'Slug', 'Владелец', 'Email владельца', 'Опубликован', 'Публикация', 'Создан', 'Обновлён'],
        rows: rows.map(({ site: s, owner }) => [
          s.id, s.name, s.slug, owner.name, owner.email,
          s.publishedDoc ? 'да' : 'нет',
          s.publishedAt ? when(s.publishedAt) : '',
          when(s.createdAt), when(s.updatedAt),
        ]),
      };
    }
    case 'sessions': {
      const now = Date.now();
      const rows = db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .orderBy(desc(sessions.createdAt))
        .all();
      return {
        title: 'Сессии',
        header: ['Пользователь', 'Email', 'Роль', 'Устройство', 'IP', 'Создана', 'Активность', 'Истекает', 'Статус'],
        rows: rows.map(({ session: s, user: u }) => [
          u.name, u.email, u.role, deviceLabel(s.userAgent), s.ip,
          when(s.createdAt), s.lastActiveAt ? when(s.lastActiveAt) : '',
          when(s.expiresAt), s.expiresAt.getTime() > now ? 'активна' : 'истекла',
        ]),
      };
    }
    case 'submissions': {
      const rows = db
        .select({ sub: submissions, site: sites })
        .from(submissions)
        .leftJoin(sites, eq(submissions.siteId, sites.id))
        .orderBy(desc(submissions.createdAt))
        .all();
      return {
        title: 'Заявки',
        header: ['ID', 'Сайт', 'Форма', 'Данные', 'Получена'],
        rows: rows.map(({ sub, site }) => [sub.id, site?.name ?? '—', sub.formId, sub.data, when(sub.createdAt)]),
      };
    }
    case 'audit': {
      const rows = db.select().from(audit).orderBy(desc(audit.createdAt)).limit(5000).all();
      return {
        title: 'Аудит',
        header: ['Дата', 'Действие', 'Кто', 'Объект', 'Детали'],
        rows: rows.map((a) => [when(a.createdAt), a.action, a.actorEmail, a.target, a.detail]),
      };
    }
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') ?? '';
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const data = buildExport(type);
  if (!data) return NextResponse.json({ error: t.unknownExportType }, { status: 400 });

  recordAudit({ id: me.id, email: me.email }, 'data.export', type, `${format}, ${data.rows.length} строк`);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    return new NextResponse(toCsv(data.header, data.rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cwk-${type}-${stamp}.csv"`,
      },
    });
  }

  const xlsx = buildStyledWorkbook(data.title, data.header, data.rows);
  return new NextResponse(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cwk-${type}-${stamp}.xlsx"`,
    },
  });
}
