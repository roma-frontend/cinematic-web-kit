'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Crown, ShieldCheck, UserCircle, Loader2, Globe, KeyRound, Ban, LockOpen, IdCard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { SavedViews } from '@/components/dashboard/saved-views';
import { useLocale } from '@/hooks/use-locale';
import { staffDict, type StaffDict } from '@/lib/staff-dict';
import { BCP47 } from '@/lib/seo';

const FILTER = {
  ru: { search: 'Поиск по имени или email…', allRoles: 'Все роли', allStatus: 'Все статусы', fOnline: 'Онлайн', fActive: 'Активные', fBlocked: 'Заблокированные', nores: 'Ничего не найдено', shown: 'Показано' },
  en: { search: 'Search by name or email…', allRoles: 'All roles', allStatus: 'All statuses', fOnline: 'Online', fActive: 'Active', fBlocked: 'Blocked', nores: 'Nothing found', shown: 'Shown' },
  hy: { search: 'Որոնել անունով կամ email-ով…', allRoles: 'Բոլոր դերերը', allStatus: 'Բոլոր կարգավիճակները', fOnline: 'Առցանց', fActive: 'Ակտիվ', fBlocked: 'Արգելափակված', nores: 'Ոչինչ չգտնվեց', shown: 'Ցուցադրված' },
} as const;

type Role = 'customer' | 'admin' | 'superadmin';
interface Row {
  id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string;
  siteCount: number; activeSessions: number; lastSeen: string | null; online: boolean;
}

const ROLE_CLS: Record<Role, string> = {
  superadmin: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
  admin: 'bg-primary/15 text-violet-800 dark:text-violet-300',
  customer: 'bg-muted text-zinc-700 dark:text-zinc-300',
};
const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string }>> = {
  superadmin: Crown, admin: ShieldCheck, customer: UserCircle,
};
const ROLES: Role[] = ['customer', 'admin', 'superadmin'];

function ago(iso: string | null, t: StaffDict, locale: 'ru' | 'en' | 'hy'): string {
  if (!iso) return t.dash;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return t.justNow;
  if (diff < 3_600_000) return t.minAgo.replace('{n}', String(Math.floor(diff / 60_000)));
  if (diff < 86_400_000) return t.hAgo.replace('{n}', String(Math.floor(diff / 3_600_000)));
  return new Date(iso).toLocaleDateString(BCP47[locale]);
}

function StatusBadge({ u, t, locale }: { u: Pick<Row, 'online' | 'lastSeen' | 'isActive'>; t: StaffDict; locale: 'ru' | 'en' | 'hy' }) {
  if (!u.isActive) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"><Ban className="h-3 w-3" /> {t.blocked}</span>;
  }
  if (u.online) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span> {t.online}</span>;
  }
  return <span className="text-xs text-muted-foreground">{ago(u.lastSeen, t, locale)}</span>;
}

export function UsersTable({ users, canEdit, meId }: { users: Row[]; canEdit: boolean; meId: string }) {
  const router = useRouter();
  const locale = useLocale().locale;
  const t = staffDict(locale);
  const [rows, setRows] = useState(users);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { confirm, confirmDialog } = useConfirm();

  const f = FILTER[locale] ?? FILTER.en;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'active' | 'blocked'>('all');

  const filtered = useMemo(() => rows.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'online' && !u.online) return false;
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'blocked' && u.isActive) return false;
    return true;
  }), [rows, search, roleFilter, statusFilter]);

  const applyView = (q: { search?: string; role?: 'all' | Role; status?: 'all' | 'online' | 'active' | 'blocked' }) => {
    setSearch(typeof q.search === 'string' ? q.search : '');
    setRoleFilter(q.role ?? 'all');
    setStatusFilter(q.status ?? 'all');
  };

  const changeRole = async (id: string, role: Role) => {
    setBusy(id);
    setError('');
    const prev = rows;
    setRows((r) => r.map((u) => (u.id === id ? { ...u, role } : u)));
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t.roleChangeFailed);
        setRows(prev);
      }
    } catch {
      setError(t.networkError);
      setRows(prev);
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (u: Row) => {
    const suspend = u.isActive;
    const ok = await confirm(suspend
      ? {
          title: t.blockTitle.replace('{name}', u.name || u.email),
          description: t.blockDesc,
          confirmLabel: t.block,
          tone: 'warning',
        }
      : {
          title: t.unblockTitle.replace('{name}', u.name || u.email),
          confirmLabel: t.unblock,
          tone: 'neutral',
        });
    if (!ok) return;
    setBusy(`sus-${u.id}`);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: suspend ? 'suspend' : 'activate' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t.statusChangeFailed); return; }
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, isActive: !suspend, online: suspend ? false : x.online, activeSessions: suspend ? 0 : x.activeSessions } : x)));
      router.refresh();
    } catch {
      setError(t.networkError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {confirmDialog}
      {error && <p className="mb-3 text-sm text-red-500" role="alert">{error}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={f.search}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary">
          <option value="all">{f.allRoles}</option>
          {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'active' | 'blocked')} className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary">
          <option value="all">{f.allStatus}</option>
          <option value="online">{f.fOnline}</option>
          <option value="active">{f.fActive}</option>
          <option value="blocked">{f.fBlocked}</option>
        </select>
        <span className="hidden text-xs text-muted-foreground sm:inline">{f.shown}: {filtered.length}/{rows.length}</span>
        <div className="ml-auto"><SavedViews route="users" current={{ search, role: roleFilter, status: statusFilter }} onApply={applyView} /></div>
      </div>
      <div className="max-w-full overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">{t.colUser}</th>
              <th className="px-4 py-3 font-semibold">{t.colStatus}</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t.colSites}</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell">{t.colSessions}</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">{t.colRegistered}</th>
              <th className="px-4 py-3 font-semibold">{t.colRole}</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((u) => {
              const cls = ROLE_CLS[u.role];
              const RoleIcon = ROLE_ICON[u.role];
              const self = u.id === meId;
              const nameBlock = (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name || t.noName}{self && <span className="ml-1 text-xs text-muted-foreground">{t.you}</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              );
              return (
                <tr key={u.id} className={`hover:bg-muted/20 ${u.isActive ? '' : 'opacity-70'}`}>
                  <td className="px-4 py-3">
                    {canEdit ? <Link href={`/dashboard/users/${u.id}`} className="[&_p:first-of-type]:hover:text-primary">{nameBlock}</Link> : nameBlock}
                  </td>
                  <td className="px-4 py-3"><StatusBadge u={u} t={t} locale={locale} /></td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Globe className="h-3.5 w-3.5" /> {u.siteCount}</span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><KeyRound className="h-3.5 w-3.5" /> {u.activeSessions}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{new Date(u.createdAt).toLocaleDateString(BCP47[locale])}</td>
                  <td className="px-4 py-3">
                    {canEdit && !self ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          disabled={busy === u.id}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                        </select>
                        {busy === u.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                        <RoleIcon className="h-3 w-3" /> {t.roles[u.role]}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/users/${u.id}`}><Button size="sm" variant="ghost" title={t.dossierAction}><IdCard className="h-3.5 w-3.5" /></Button></Link>
                        {!self && (
                          <Button size="sm" variant="ghost" disabled={busy === `sus-${u.id}`} onClick={() => toggleActive(u)} className={u.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'} title={u.isActive ? t.block : t.unblock}>
                            {busy === `sus-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.isActive ? <Ban className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-sm text-muted-foreground">{f.nores}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
