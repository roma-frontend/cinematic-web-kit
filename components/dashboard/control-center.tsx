'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Globe, Rocket, Inbox, Activity, Monitor, Database, ShieldCheck, Crown,
  UserCircle, LogIn, Trash2, Loader2, Ban, KeyRound, UserPlus, FilePlus2, Send,
  CheckCircle2, Clock, ExternalLink, CircleDashed, ScrollText, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard } from '@/components/dashboard/ui';

type Role = 'customer' | 'admin' | 'superadmin';

interface Stats { users: number; sites: number; published: number; submissions: number }
interface System { dbSizeKb: number; activeSessions: number; appHost: string; node: string; integrations: { muapi: boolean; llm: boolean; analytics: boolean; serverIp: boolean } }
interface ActivityEvent { kind: 'user' | 'site' | 'publish' | 'submission'; at: string; title: string; subtitle: string }
interface SessionRow { id: string; userId: string; userName: string; userEmail: string; role: Role; createdAt: string; expiresAt: string; active: boolean }
interface UserRow { id: string; email: string; name: string; role: Role; createdAt: string; siteCount: number }
interface SiteRow { id: string; name: string; slug: string; published: boolean; ownerName: string; ownerEmail: string; updatedAt: string }
interface AuditRow { id: string; actorEmail: string; action: string; target: string; detail: string; createdAt: string }

const ROLE_META: Record<Role, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  superadmin: { label: 'Суперадмин', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', Icon: Crown },
  admin: { label: 'Админ', cls: 'bg-primary/15 text-primary', Icon: ShieldCheck },
  customer: { label: 'Клиент', cls: 'bg-muted text-muted-foreground', Icon: UserCircle },
};
const ACT_ICON = { user: UserPlus, site: FilePlus2, publish: Send, submission: Inbox };
const TABS = [
  { id: 'monitor', label: 'Мониторинг', Icon: Activity },
  { id: 'sessions', label: 'Сессии', Icon: KeyRound },
  { id: 'users', label: 'Пользователи', Icon: Users },
  { id: 'sites', label: 'Сайты', Icon: Globe },
  { id: 'audit', label: 'Аудит', Icon: ScrollText },
] as const;
type TabId = typeof TABS[number]['id'];

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />;
}
const when = (iso: string) => new Date(iso).toLocaleString('ru-RU');

export function ControlCenter({ meId, stats, system, activity, sessions, users, sites, audit }: {
  meId: string; stats: Stats; system: System; activity: ActivityEvent[]; sessions: SessionRow[]; users: UserRow[]; sites: SiteRow[]; audit: AuditRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('monitor');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const act = async (key: string, fn: () => Promise<Response>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setMsg('');
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || 'Ошибка операции.'); return; }
      router.refresh();
    } catch {
      setMsg('Сеть недоступна.');
    } finally {
      setBusy(null);
    }
  };

  const impersonate = (u: UserRow) =>
    act(`imp-${u.id}`, async () => {
      const res = await fetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) });
      if (res.ok) { router.push('/dashboard'); router.refresh(); }
      return res;
    }, `Войти под пользователем ${u.name || u.email}? Вы сможете вернуться в свой аккаунт.`);

  const deleteUser = (u: UserRow) =>
    act(`del-${u.id}`, () => fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' }),
      `Удалить ${u.name || u.email} со всеми сайтами и данными? Действие необратимо.`);

  const revokeUser = (u: UserRow) =>
    act(`rev-${u.id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) }),
      `Завершить все сессии пользователя ${u.name || u.email}?`);

  const revokeSession = (s: SessionRow) =>
    act(`revs-${s.id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) }));

  const unpublish = (s: SiteRow) =>
    act(`unp-${s.id}`, () => fetch(`/api/admin/sites/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpublish' }) }),
      `Снять сайт «${s.name}» с публикации?`);

  const deleteSite = (s: SiteRow) =>
    act(`dels-${s.id}`, () => fetch(`/api/admin/sites/${s.id}`, { method: 'DELETE' }),
      `Удалить сайт «${s.name}» безвозвратно?`);

  return (
    <>
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><Crown className="h-6 w-6 text-amber-500" /> Центр контроля</span>}
        description="Полный мониторинг и управление платформой. Доступно только суперадмину."
        action={<a href="/api/admin/export-db"><Button variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Экспорт БД</Button></a>}
      />

      {msg && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">{msg}</p>}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <t.Icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'monitor' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Пользователи" value={stats.users} icon={Users} />
            <StatCard label="Сайты" value={stats.sites} icon={Globe} hint={`${stats.published} опубликовано`} />
            <StatCard label="Заявки" value={stats.submissions} icon={Inbox} />
            <StatCard label="Активные сессии" value={system.activeSessions} icon={KeyRound} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Monitor className="h-4 w-4" /> Система</h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Хост</dt><dd className="font-medium">{system.appHost}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Node</dt><dd className="font-medium">{system.node}</dd></div>
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5 text-muted-foreground"><Database className="h-3.5 w-3.5" /> Размер БД</dt><dd className="font-medium">{system.dbSizeKb} КБ</dd></div>
              </dl>
              <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Интеграции</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.muapi} /> ИИ-видео (MUAPI)</span>
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.llm} /> LLM темы</span>
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.analytics} /> Аналитика</span>
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.serverIp} /> SERVER_IP</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Activity className="h-4 w-4" /> Активность</h3>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {activity.length === 0 && <p className="text-sm text-muted-foreground">Событий пока нет.</p>}
                {activity.map((e, i) => {
                  const Icon = ACT_ICON[e.kind];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{when(e.at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Пользователь</th><th className="hidden px-4 py-3 md:table-cell">Создана</th><th className="hidden px-4 py-3 md:table-cell">Истекает</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-medium">{s.userName || 'Без имени'}</p><p className="text-xs text-muted-foreground">{s.userEmail}</p></td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{when(s.createdAt)}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{when(s.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                      {s.active ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {s.active ? 'Активна' : 'Истекла'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" disabled={busy === `revs-${s.id}`} onClick={() => revokeSession(s)} className="gap-1.5 text-red-500 hover:text-red-600">
                      {busy === `revs-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Отозвать
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Пользователь</th><th className="hidden px-4 py-3 sm:table-cell">Роль</th><th className="hidden px-4 py-3 md:table-cell">Сайты</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const meta = ROLE_META[u.role];
                const self = u.id === meId;
                return (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(u.name || u.email).charAt(0).toUpperCase()}</div>
                        <div className="min-w-0"><p className="truncate font-medium">{u.name || 'Без имени'}{self && <span className="ml-1 text-xs text-muted-foreground">(вы)</span>}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}><meta.Icon className="h-3 w-3" /> {meta.label}</span></td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{u.siteCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {!self && (
                          <>
                            <Button size="sm" variant="outline" disabled={busy === `imp-${u.id}`} onClick={() => impersonate(u)} className="gap-1.5">
                              {busy === `imp-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} Войти как
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `rev-${u.id}`} onClick={() => revokeUser(u)} className="gap-1.5" title="Завершить все сессии">
                              {busy === `rev-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `del-${u.id}`} onClick={() => deleteUser(u)} className="gap-1.5 text-red-500 hover:text-red-600" title="Удалить пользователя">
                              {busy === `del-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        )}
                        {self && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sites' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Сайт</th><th className="hidden px-4 py-3 sm:table-cell">Владелец</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">/s/{s.slug}</p></td>
                  <td className="hidden px-4 py-3 sm:table-cell"><p className="truncate">{s.ownerName || '—'}</p><p className="truncate text-xs text-muted-foreground">{s.ownerEmail}</p></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {s.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {s.published ? 'Опубликован' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/s/${s.slug}?draft=1`} target="_blank"><Button size="sm" variant="ghost" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                      {s.published && (
                        <Button size="sm" variant="outline" disabled={busy === `unp-${s.id}`} onClick={() => unpublish(s)} className="gap-1.5">
                          {busy === `unp-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Снять
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy === `dels-${s.id}`} onClick={() => deleteSite(s)} className="gap-1.5 text-red-500 hover:text-red-600" title="Удалить сайт">
                        {busy === `dels-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'audit' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Кто</th><th className="hidden px-4 py-3 sm:table-cell">Объект / детали</th><th className="px-4 py-3">Когда</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {audit.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Записей аудита пока нет.</td></tr>
              )}
              {audit.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{a.action}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.actorEmail}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium">{a.target}</span>
                    {a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{when(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
