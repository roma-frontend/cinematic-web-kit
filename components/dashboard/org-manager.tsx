'use client';

// Superadmin org console: pick an organization (tenant site) from the list —
// its data loads on the right — and assign its admin (transfer ownership +
// promote to admin). Selection persists in localStorage (org-selector-store).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Rocket, CircleDashed, Loader2, Users, Library, Inbox, UserCog, Check, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SiteLite = { id: string; name: string; slug: string; ownerName: string; ownerEmail: string; published: boolean };
type PlatformUser = { name: string; email: string; source: 'platform' | 'tenant' };
type Overview = {
  id: string; name: string; slug: string; published: boolean; publishedAt: string | null; memberApproval: boolean; createdAt: string;
  owner: { id: string; name: string; email: string; role: string } | null;
  members: { total: number; pending: number; approved: number };
  materials: number; submissions: number; domains: number;
};

const KEY = 'cwk-org-selector';

export function OrgManager({ sites, users }: { sites: SiteLite[]; users: PlatformUser[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (saved && sites.some((s) => s.id === saved)) setSelected(saved);
    else if (sites[0]) setSelected(sites[0].id);
  }, [sites]);

  const load = useCallback((siteId: string) => {
    setLoading(true);
    fetch(`/api/admin/orgs?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json()).then((d) => setOverview(d.overview ?? null)).catch(() => setOverview(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (selected) { localStorage.setItem(KEY, selected); load(selected); } }, [selected, load]);

  const filtered = sites.filter((s) => `${s.name} ${s.slug} ${s.ownerEmail}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Org list */}
      <div className="rounded-2xl border border-border/60 bg-card p-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск организации" className="h-10 pl-10" />
        </div>
        <ul className="max-h-[70dvh] space-y-1 overflow-y-auto">
          {filtered.map((s) => {
            const on = selected === s.id;
            return (
              <li key={s.id}>
                <button onClick={() => setSelected(s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${on ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                  <Globe className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">/s/{s.slug}</span>
                  </span>
                  {s.published ? <Rocket className="h-3.5 w-3.5 flex-none text-primary" /> : <CircleDashed className="h-3.5 w-3.5 flex-none text-muted-foreground" />}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Ничего не найдено.</li>}
        </ul>
      </div>

      {/* Selected org data */}
      <div className="min-w-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-border/60"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !overview ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-border/60 text-sm text-muted-foreground">Выберите организацию.</div>
        ) : (
          <OrgDetail overview={overview} users={users} onReload={() => selected && load(selected)} />
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-1 flex items-center justify-between text-muted-foreground"><span className="text-xs font-semibold uppercase tracking-wide">{label}</span><Icon className="h-4 w-4" /></div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function OrgDetail({ overview, users, onReload }: { overview: Overview; users: PlatformUser[]; onReload: () => void }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<PlatformUser | null>(null);
  const [openList, setOpenList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? users.filter((u) => u.email !== overview.owner?.email && `${u.name} ${u.email}`.toLowerCase().includes(q)).slice(0, 6)
    : [];

  const assign = async () => {
    const email = picked?.email ?? query.trim();
    if (!email) return;
    setBusy(true); setMsg(null);
    const res = await fetch('/api/admin/orgs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign-admin', siteId: overview.id, email }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error || 'Ошибка' }); return; }
    setMsg({ ok: true, text: `Админом назначен ${d.owner?.email}` }); setQuery(''); setPicked(null); onReload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight">{overview.name}</h2>
          <p className="text-sm text-muted-foreground">/s/{overview.slug} · создана {new Date(overview.createdAt).toLocaleDateString('ru-RU')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${overview.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {overview.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {overview.published ? 'Опубликован' : 'Черновик'}
          </span>
          <Link href={`/s/${overview.slug}?draft=1`} target="_blank"><Button size="sm" variant="outline" className="gap-1.5">Открыть <ExternalLink className="h-3.5 w-3.5" /></Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Участники" value={overview.members.total} />
        <Stat icon={Users} label="Ожидают" value={overview.members.pending} />
        <Stat icon={Library} label="Материалы" value={overview.materials} />
        <Stat icon={Inbox} label="Заявки" value={overview.submissions} />
      </div>

      {/* Current admin */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserCog className="h-4 w-4" /> Администратор организации «{overview.name}»</h3>
        {overview.owner ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(overview.owner.name || overview.owner.email).charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{overview.owner.name || 'Без имени'}</p>
              <p className="truncate text-xs text-muted-foreground">{overview.owner.email} · {overview.owner.role}</p>
            </div>
          </div>
        ) : <p className="mb-4 text-sm text-muted-foreground">Админ не назначен.</p>}

        <label className="mb-1.5 block text-sm font-medium">Назначить нового админа организации «{overview.name}»</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPicked(null); setOpenList(true); }}
              onFocus={() => setOpenList(true)}
              placeholder="Поиск по имени или email"
              className="h-11 pl-10"
            />
            {openList && matches.length > 0 && !picked && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                {matches.map((u) => (
                  <li key={u.email}>
                    <button type="button" onClick={() => { setPicked(u); setQuery(u.email); setOpenList(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.name || 'Без имени'}</span>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.source === 'platform' ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-600'}`}>
                        {u.source === 'platform' ? 'Платформа' : 'Участник'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={assign} disabled={busy || (!picked && !query.trim())} size="lg" className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Назначить
          </Button>
        </div>
        {picked && <p className="mt-2 text-xs text-muted-foreground">Выбран: <span className="font-medium text-foreground">{picked.name || picked.email}</span> ({picked.email})</p>}
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Владение организацией перейдёт выбранному пользователю (роль → admin). Если выбран участник (tenant), он будет перенесён в платформенные администраторы и удалён из участников — без дублей.</p>
      </div>
    </div>
  );
}
