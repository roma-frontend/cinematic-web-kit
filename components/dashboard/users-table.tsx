'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Crown, ShieldCheck, UserCircle, Loader2, Globe, KeyRound, Ban, LockOpen, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Role = 'customer' | 'admin' | 'superadmin';
interface Row {
  id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string;
  siteCount: number; activeSessions: number; lastSeen: string | null; online: boolean;
}

const ROLE_META: Record<Role, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  superadmin: { label: 'Суперадмин', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', Icon: Crown },
  admin: { label: 'Админ', cls: 'bg-primary/15 text-primary', Icon: ShieldCheck },
  customer: { label: 'Клиент', cls: 'bg-muted text-muted-foreground', Icon: UserCircle },
};
const ROLES: Role[] = ['customer', 'admin', 'superadmin'];

function ago(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

function StatusBadge({ u }: { u: Pick<Row, 'online' | 'lastSeen' | 'isActive'> }) {
  if (!u.isActive) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"><Ban className="h-3 w-3" /> Заблокирован</span>;
  }
  if (u.online) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span> Онлайн</span>;
  }
  return <span className="text-xs text-muted-foreground">{ago(u.lastSeen)}</span>;
}

export function UsersTable({ users, canEdit, meId }: { users: Row[]; canEdit: boolean; meId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(users);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { confirm, confirmDialog } = useConfirm();

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
        setError(data.error || 'Не удалось изменить роль.');
        setRows(prev);
      }
    } catch {
      setError('Сеть недоступна.');
      setRows(prev);
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (u: Row) => {
    const suspend = u.isActive;
    const ok = await confirm(suspend
      ? {
          title: `Заблокировать ${u.name || u.email}?`,
          description: 'Все сессии будут завершены, вход станет невозможен.',
          confirmLabel: 'Заблокировать',
          tone: 'warning',
        }
      : {
          title: `Разблокировать ${u.name || u.email}?`,
          confirmLabel: 'Разблокировать',
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
      if (!res.ok) { setError(data.error || 'Не удалось изменить статус.'); return; }
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, isActive: !suspend, online: suspend ? false : x.online, activeSessions: suspend ? 0 : x.activeSessions } : x)));
      router.refresh();
    } catch {
      setError('Сеть недоступна.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {confirmDialog}
      {error && <p className="mb-3 text-sm text-red-500" role="alert">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Пользователь</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Сайты</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell">Сессии</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Регистрация</th>
              <th className="px-4 py-3 font-semibold">Роль</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((u) => {
              const meta = ROLE_META[u.role];
              const self = u.id === meId;
              const nameBlock = (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name || 'Без имени'}{self && <span className="ml-1 text-xs text-muted-foreground">(вы)</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              );
              return (
                <tr key={u.id} className={`hover:bg-muted/20 ${u.isActive ? '' : 'opacity-70'}`}>
                  <td className="px-4 py-3">
                    {canEdit ? <Link href={`/dashboard/users/${u.id}`} className="[&_p:first-of-type]:hover:text-primary">{nameBlock}</Link> : nameBlock}
                  </td>
                  <td className="px-4 py-3"><StatusBadge u={u} /></td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Globe className="h-3.5 w-3.5" /> {u.siteCount}</span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><KeyRound className="h-3.5 w-3.5" /> {u.activeSessions}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-3">
                    {canEdit && !self ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          disabled={busy === u.id}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                        </select>
                        {busy === u.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                        <meta.Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/users/${u.id}`}><Button size="sm" variant="ghost" title="Досье"><IdCard className="h-3.5 w-3.5" /></Button></Link>
                        {!self && (
                          <Button size="sm" variant="ghost" disabled={busy === `sus-${u.id}`} onClick={() => toggleActive(u)} className={u.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'} title={u.isActive ? 'Заблокировать' : 'Разблокировать'}>
                            {busy === `sus-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.isActive ? <Ban className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
