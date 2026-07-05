'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Crown, ShieldCheck, UserCircle, LogIn, Trash2, Loader2, Ban, KeyRound,
  Globe, Rocket, CircleDashed, ExternalLink, ScrollText, Activity, LockOpen,
  CalendarDays, Inbox, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm, type ConfirmOptions } from '@/components/ui/confirm-dialog';
import { PageHeader, StatCard } from '@/components/dashboard/ui';

type Role = 'customer' | 'admin' | 'superadmin';

interface SessionRow { id: string; createdAt: string; expiresAt: string; lastActiveAt: string | null; device: string; ip: string; active: boolean; online: boolean }
interface DossierSite { id: string; name: string; slug: string; published: boolean; updatedAt: string }
interface DossierEvent { id: string; action: string; target: string; detail: string; createdAt: string }
export interface Dossier {
  user: { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string };
  online: boolean;
  lastSeen: string | null;
  metrics: { totalActions: number; last24h: number; last7d: number; activeSessions: number; siteCount: number; logins30d: number };
  heatmap: number[][];
  sessions: SessionRow[];
  sites: DossierSite[];
  timeline: DossierEvent[];
}

const ROLE_META: Record<Role, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  superadmin: { label: 'Суперадмин', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', Icon: Crown },
  admin: { label: 'Админ', cls: 'bg-primary/15 text-primary', Icon: ShieldCheck },
  customer: { label: 'Клиент', cls: 'bg-muted text-muted-foreground', Icon: UserCircle },
};
const ROLES: Role[] = ['customer', 'admin', 'superadmin'];
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const when = (iso: string) => new Date(iso).toLocaleString('ru-RU');
function ago(iso: string | null): string {
  if (!iso) return 'давно';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

/** Weekday × hour activity intensity over the last 60 days. */
function Heatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat());
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="mb-1 ml-8 grid grid-cols-24 gap-0.5 text-center text-[9px] text-muted-foreground">
          {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ''}</span>)}
        </div>
        {data.map((row, d) => (
          <div key={d} className="mb-0.5 flex items-center gap-0.5">
            <span className="w-7 shrink-0 text-right text-[10px] text-muted-foreground">{DAYS[d]}</span>
            <div className="grid flex-1 grid-cols-24 gap-0.5">
              {row.map((v, h) => (
                <div
                  key={h}
                  title={`${DAYS[d]}, ${h}:00 — ${v} действий`}
                  className={`aspect-square rounded-[3px] ${v > 0 ? 'bg-primary' : 'bg-muted/60'}`}
                  style={v > 0 ? { opacity: 0.25 + 0.75 * (v / max) } : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserDossierView({ meId, dossier }: { meId: string; dossier: Dossier }) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const { user, metrics } = dossier;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const self = user.id === meId;
  const meta = ROLE_META[user.role];

  const act = async (key: string, fn: () => Promise<Response>, confirmOpts?: ConfirmOptions) => {
    if (confirmOpts && !(await confirm(confirmOpts))) return;
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

  const impersonate = () =>
    act('imp', async () => {
      const res = await fetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
      if (res.ok) { router.push('/dashboard'); router.refresh(); }
      return res;
    }, {
      title: `Войти под пользователем ${user.name || user.email}?`,
      description: 'Вы увидите платформу его глазами. В любой момент сможете вернуться в свой аккаунт.',
      confirmLabel: 'Войти как',
      tone: 'neutral',
    });

  const toggleActive = () =>
    act('sus', () => fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: user.isActive ? 'suspend' : 'activate' }) }),
      user.isActive
        ? { title: `Заблокировать ${user.name || user.email}?`, description: 'Все активные сессии будут немедленно завершены, вход в аккаунт станет невозможен до разблокировки.', confirmLabel: 'Заблокировать', tone: 'warning' }
        : { title: `Разблокировать ${user.name || user.email}?`, description: 'Пользователь снова сможет входить в аккаунт.', confirmLabel: 'Разблокировать', tone: 'neutral' });

  const changeRole = (role: Role) =>
    act('role', () => fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }));

  const revokeAll = () =>
    act('rev', () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }), {
      title: `Завершить все сессии ${user.name || user.email}?`,
      description: 'Пользователь будет разлогинен на всех устройствах, но сможет войти снова.',
      confirmLabel: 'Завершить',
      tone: 'warning',
    });

  const revokeSession = (id: string) =>
    act(`revs-${id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }));

  const deleteUser = () =>
    act('del', async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) { router.push('/dashboard/users'); router.refresh(); }
      return res;
    }, {
      title: `Удалить ${user.name || user.email}?`,
      description: 'Пользователь будет удалён вместе со всеми его сайтами, сессиями и заявками. Действие необратимо.',
      confirmLabel: 'Удалить',
      tone: 'danger',
    });

  return (
    <>
      {confirmDialog}
      <Link href="/dashboard/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Все пользователи
      </Link>

      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">{(user.name || user.email).charAt(0).toUpperCase()}</span>
            <span>{user.name || 'Без имени'}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}><meta.Icon className="h-3 w-3" /> {meta.label}</span>
            {!user.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400"><Ban className="h-3 w-3" /> Заблокирован</span>
            ) : dossier.online ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400"><span className="h-2 w-2 rounded-full bg-green-500" /> Онлайн</span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">был(а) {ago(dossier.lastSeen)}</span>
            )}
          </span>
        }
        description={`${user.email} · регистрация ${new Date(user.createdAt).toLocaleDateString('ru-RU')}`}
        action={
          !self ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={user.role}
                disabled={busy === 'role'}
                onChange={(e) => changeRole(e.target.value as Role)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                title="Роль"
              >
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
              </select>
              <Button size="sm" variant="outline" disabled={busy === 'imp' || !user.isActive} onClick={impersonate} className="gap-1.5">
                {busy === 'imp' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} Войти как
              </Button>
              <Button size="sm" variant="outline" disabled={busy === 'sus'} onClick={toggleActive} className={`gap-1.5 ${user.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}`}>
                {busy === 'sus' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.isActive ? <Ban className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                {user.isActive ? 'Заблокировать' : 'Разблокировать'}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === 'rev'} onClick={revokeAll} className="gap-1.5" title="Завершить все сессии">
                {busy === 'rev' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === 'del'} onClick={deleteUser} className="gap-1.5 text-red-500 hover:text-red-600" title="Удалить пользователя">
                {busy === 'del' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : undefined
        }
      />

      {msg && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">{msg}</p>}

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Действий всего" value={metrics.totalActions} icon={Activity} />
          <StatCard label="За 24 часа" value={metrics.last24h} icon={Flame} />
          <StatCard label="За 7 дней" value={metrics.last7d} icon={CalendarDays} />
          <StatCard label="Входов за 30 дней" value={metrics.logins30d} icon={LogIn} />
          <StatCard label="Активных сессий" value={metrics.activeSessions} icon={KeyRound} />
          <StatCard label="Сайтов" value={metrics.siteCount} icon={Globe} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Activity className="h-4 w-4" /> Карта активности <span className="text-[11px] font-medium normal-case tracking-normal">— день недели × час, последние 60 дней</span></h3>
          <Heatmap data={dossier.heatmap} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sessions */}
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Сессии ({dossier.sessions.filter((s) => s.active).length} активных)</div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/60">
                  {dossier.sessions.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground">Сессий нет.</td></tr>}
                  {dossier.sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.device} <span className="font-mono text-xs font-normal text-muted-foreground">{s.ip || ''}</span></p>
                        <p className="text-xs text-muted-foreground">создана {when(s.createdAt)} · активность {ago(s.lastActiveAt ?? s.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.online ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">Онлайн</span>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{s.active ? 'Активна' : 'Истекла'}</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {s.active && (
                          <Button size="sm" variant="ghost" disabled={busy === `revs-${s.id}`} onClick={() => revokeSession(s.id)} className="gap-1 text-red-500 hover:text-red-600" title="Отозвать">
                            {busy === `revs-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sites */}
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Сайты ({dossier.sites.length})</div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/60">
                  {dossier.sites.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground"><Inbox className="mx-auto mb-2 h-6 w-6 opacity-40" />Сайтов нет.</td></tr>}
                  {dossier.sites.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">/s/{s.slug} · обновлён {when(s.updatedAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {s.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {s.published ? 'Опубликован' : 'Черновик'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Link href={`/s/${s.slug}?draft=1`} target="_blank"><Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className="inline-flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> Хронология действий (60 дней)</span></div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border/60">
              {dossier.timeline.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground">Аудит-событий за 60 дней нет.</td></tr>}
              {dossier.timeline.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{e.action}</span></td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium">{e.target}</span>
                    {e.detail && <span className="text-muted-foreground"> · {e.detail}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{when(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
