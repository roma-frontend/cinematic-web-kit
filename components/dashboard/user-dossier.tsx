'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Crown, ShieldCheck, UserCircle, LogIn, Trash2, Loader2, Ban, KeyRound,
  Globe, Rocket, CircleDashed, ExternalLink, ScrollText, Activity, LockOpen,
  CalendarDays, Inbox, Flame, RotateCcw, Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm, type ConfirmOptions } from '@/components/ui/confirm-dialog';
import { PageHeader, StatCard } from '@/components/dashboard/ui';
import { useLocale } from '@/hooks/use-locale';
import { staffDict, type StaffDict } from '@/lib/staff-dict';
import { BCP47, type Locale } from '@/lib/seo';
import { copyToClipboard } from '@/lib/clipboard';

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

const ROLE_CLS: Record<Role, string> = {
  superadmin: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
  admin: 'bg-primary/15 text-violet-800 dark:text-violet-300',
  customer: 'bg-muted text-zinc-700 dark:text-zinc-300',
};
const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string }>> = {
  superadmin: Crown, admin: ShieldCheck, customer: UserCircle,
};
const ROLES: Role[] = ['customer', 'admin', 'superadmin'];

const when = (iso: string, locale: Locale) => new Date(iso).toLocaleString(BCP47[locale]);
function ago(iso: string | null, t: StaffDict, locale: Locale): string {
  if (!iso) return t.dossier.agoLong;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return t.justNow;
  if (diff < 3_600_000) return t.minAgo.replace('{n}', String(Math.floor(diff / 60_000)));
  if (diff < 86_400_000) return t.hAgo.replace('{n}', String(Math.floor(diff / 3_600_000)));
  return new Date(iso).toLocaleDateString(BCP47[locale]);
}

/** Weekday × hour activity intensity over the last 60 days. */
function Heatmap({ data, t }: { data: number[][]; t: StaffDict }) {
  const days = t.dossier.days;
  const max = Math.max(1, ...data.flat());
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="mb-1 ml-8 grid grid-cols-24 gap-0.5 text-center text-[9px] text-muted-foreground">
          {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ''}</span>)}
        </div>
        {data.map((row, d) => (
          <div key={d} className="mb-0.5 flex items-center gap-0.5">
            <span className="w-7 shrink-0 text-right text-[10px] text-muted-foreground">{days[d]}</span>
            <div className="grid flex-1 grid-cols-24 gap-0.5">
              {row.map((v, h) => (
                <div
                  key={h}
                  title={t.dossier.heatCell.replace('{day}', days[d]).replace('{h}', String(h)).replace('{v}', String(v))}
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
  const locale = useLocale().locale;
  const t = staffDict(locale);
  const dt = t.dossier;
  const { confirm, confirmDialog } = useConfirm();
  const { user, metrics } = dossier;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [tempPw, setTempPw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const self = user.id === meId;
  const roleCls = ROLE_CLS[user.role];
  const RoleIcon = ROLE_ICON[user.role];

  const act = async (key: string, fn: () => Promise<Response>, confirmOpts?: ConfirmOptions) => {
    if (confirmOpts && !(await confirm(confirmOpts))) return;
    setBusy(key);
    setMsg('');
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || dt.opError); return; }
      router.refresh();
    } catch {
      setMsg(dt.network);
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
      title: dt.impTitle.replace('{name}', user.name || user.email),
      description: dt.impDesc,
      confirmLabel: dt.impConfirm,
      tone: 'neutral',
    });

  const toggleActive = () =>
    act('sus', () => fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: user.isActive ? 'suspend' : 'activate' }) }),
      user.isActive
        ? { title: dt.blockTitle.replace('{name}', user.name || user.email), description: dt.blockDesc, confirmLabel: dt.block, tone: 'warning' }
        : { title: dt.unblockTitle.replace('{name}', user.name || user.email), description: dt.unblockDesc, confirmLabel: dt.unblock, tone: 'neutral' });

  const changeRole = (role: Role) =>
    act('role', () => fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }));

  const revokeAll = () =>
    act('rev', () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }), {
      title: dt.revokeAllConfirmTitle.replace('{name}', user.name || user.email),
      description: dt.revokeAllDesc,
      confirmLabel: dt.revokeAllConfirm,
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
      title: dt.deleteTitle.replace('{name}', user.name || user.email),
      description: dt.deleteDesc,
      confirmLabel: dt.deleteConfirm,
      tone: 'danger',
    });

  // Issue a one-time temporary password. Unlike `act`, we need the response
  // body (the plaintext), so this is handled inline.
  const resetPassword = async () => {
    if (!(await confirm({
      title: dt.resetPwTitle.replace('{name}', user.name || user.email),
      description: dt.resetPwDesc,
      confirmLabel: dt.resetPwConfirm,
      tone: 'warning',
    }))) return;
    setBusy('pw'); setMsg(''); setCopied(false);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || dt.opError); return; }
      setTempPw(data.tempPassword ?? null);
      router.refresh();
    } catch {
      setMsg(dt.network);
    } finally {
      setBusy(null);
    }
  };

  const copyTempPw = async () => {
    if (!tempPw) return;
    const success = await copyToClipboard(tempPw);
    if (success) {
      setCopied(true);
    }
  };

  return (
    <>
      {confirmDialog}
      {tempPw && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setTempPw(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="h-6 w-6" /></span>
            <h3 className="text-center text-lg font-bold">{dt.tempPwTitle}</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">{dt.tempPwDesc.replace('{name}', user.name || user.email)}</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
              <code className="min-w-0 flex-1 select-all break-all text-center font-mono text-lg font-bold tracking-wider">{tempPw}</code>
              <Button size="sm" variant="outline" onClick={copyTempPw} className="shrink-0 gap-1.5">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? dt.tempPwCopied : dt.tempPwCopy}
              </Button>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400"><Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />{dt.tempPwWarn}</p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setTempPw(null)}>{dt.tempPwDone}</Button>
            </div>
          </div>
        </div>
      )}
      <Link href="/dashboard/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {dt.backAll}
      </Link>

      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">{(user.name || user.email).charAt(0).toUpperCase()}</span>
            <span>{user.name || dt.noName}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${roleCls}`}><RoleIcon className="h-3 w-3" /> {t.roles[user.role]}</span>
            {!user.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400"><Ban className="h-3 w-3" /> {dt.blocked}</span>
            ) : dossier.online ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400"><span className="h-2 w-2 rounded-full bg-green-500" /> {dt.online}</span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">{dt.wasSeen.replace('{ago}', ago(dossier.lastSeen, t, locale))}</span>
            )}
          </span>
        }
        description={dt.desc.replace('{email}', user.email).replace('{date}', new Date(user.createdAt).toLocaleDateString(BCP47[locale]))}
        action={
          !self ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={user.role}
                disabled={busy === 'role'}
                onChange={(e) => changeRole(e.target.value as Role)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                title={dt.roleTitle}
              >
                {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
              </select>
              <Button size="sm" variant="outline" disabled={busy === 'imp' || !user.isActive} onClick={impersonate} className="gap-1.5">
                {busy === 'imp' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} {dt.loginAs}
              </Button>
              <Button size="sm" variant="outline" disabled={busy === 'sus'} onClick={toggleActive} className={`gap-1.5 ${user.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}`}>
                {busy === 'sus' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.isActive ? <Ban className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                {user.isActive ? dt.block : dt.unblock}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === 'rev'} onClick={revokeAll} className="gap-1.5" title={dt.revokeAllTitle}>
                {busy === 'rev' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="outline" disabled={busy === 'pw'} onClick={resetPassword} className="gap-1.5" title={dt.resetPw}>
                {busy === 'pw' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} {dt.resetPw}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === 'del'} onClick={deleteUser} className="gap-1.5 text-red-500 hover:text-red-600" title={dt.deleteUserTitle}>
                {busy === 'del' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : undefined
        }
      />

      {msg && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">{msg}</p>}

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label={dt.statTotal} value={metrics.totalActions} icon={Activity} />
          <StatCard label={dt.stat24h} value={metrics.last24h} icon={Flame} />
          <StatCard label={dt.stat7d} value={metrics.last7d} icon={CalendarDays} />
          <StatCard label={dt.statLogins30d} value={metrics.logins30d} icon={LogIn} />
          <StatCard label={dt.statActiveSessions} value={metrics.activeSessions} icon={KeyRound} />
          <StatCard label={dt.statSites} value={metrics.siteCount} icon={Globe} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Activity className="h-4 w-4" /> {dt.activityMap} <span className="text-[11px] font-medium normal-case tracking-normal">{dt.activityMapSub}</span></h3>
          <Heatmap data={dossier.heatmap} t={t} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sessions */}
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dt.sessions} ({dt.sessionsActive.replace('{n}', String(dossier.sessions.filter((s) => s.active).length))})</div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/60">
                  {dossier.sessions.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground">{dt.noSessions}</td></tr>}
                  {dossier.sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.device} <span className="font-mono text-xs font-normal text-muted-foreground">{s.ip || ''}</span></p>
                        <p className="text-xs text-muted-foreground">{dt.created} {when(s.createdAt, locale)} · {dt.activity} {ago(s.lastActiveAt ?? s.createdAt, t, locale)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.online ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">{dt.online}</span>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{s.active ? dt.sessionActive : dt.sessionExpired}</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {s.active && (
                          <Button size="sm" variant="ghost" disabled={busy === `revs-${s.id}`} onClick={() => revokeSession(s.id)} className="gap-1 text-red-500 hover:text-red-600" title={dt.revoke}>
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
            <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dt.sitesTitle} ({dossier.sites.length})</div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/60">
                  {dossier.sites.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground"><Inbox className="mx-auto mb-2 h-6 w-6 opacity-40" />{dt.noSites}</td></tr>}
                  {dossier.sites.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">/s/{s.slug} · {dt.updated} {when(s.updatedAt, locale)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {s.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {s.published ? t.published : t.draft}
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
          <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className="inline-flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> {dt.timelineTitle}</span></div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border/60">
              {dossier.timeline.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground">{dt.noTimeline}</td></tr>}
              {dossier.timeline.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{e.action}</span></td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium">{e.target}</span>
                    {e.detail && <span className="text-muted-foreground"> · {e.detail}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{when(e.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
