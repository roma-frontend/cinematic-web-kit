'use client';

// Sites manager (content only — chrome comes from the dashboard shell):
// create a site, toggle publish, quick links to studio / preview / settings.

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Loader2, Pencil, ExternalLink, Settings2, Globe, Rocket, CircleDashed, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { SITE_MEMBERS_SEEN_EVENT } from '@/components/dashboard/site-members-badge';

export interface DashSite {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  updatedAt: string;
  pendingMembers?: number;
}

export function DashboardClient({ initialSites }: { initialSites: DashSite[] }) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pubBusy, setPubBusy] = useState<string | null>(null);

  // Opening «Мои сайты» = the owner has seen the pending requests surfaced here,
  // so clear the blinking nav badge.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SITE_MEMBERS_SEEN_EVENT));
  }, []);

  const createSite = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Не удалось создать сайт.'); return; }
      router.push(`/studio/builder?site=${data.site.id}`);
    } catch {
      setError('Сеть недоступна.');
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (site: DashSite) => {
    setPubBusy(site.id);
    try {
      const res = await fetch(`/api/sites/${site.id}/publish`, { method: site.published ? 'DELETE' : 'POST' });
      const data = await res.json();
      if (res.ok) setSites((list) => list.map((s) => (s.id === site.id ? { ...s, published: !site.published } : s)));
      else setError(data.error || 'Ошибка публикации.');
    } finally {
      setPubBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Мои сайты" description="Создавайте, редактируйте и публикуйте свои сайты." />

      <form onSubmit={createSite} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название нового сайта, например «Кофейня У Ромы»"
          className="sm:max-w-md"
          aria-label="Название нового сайта"
        />
        <Button type="submit" disabled={busy || !newName.trim()} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Создать сайт
        </Button>
        {error && <p className="text-sm text-red-500 sm:ml-2" role="alert">{error}</p>}
      </form>

      {sites.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Globe} title="Пока ни одного сайта" description="Создайте первый — конструктор откроется автоматически." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <div key={site.id} className="group rounded-2xl border border-border/60 bg-card/50 p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold tracking-tight">{site.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">/s/{site.slug}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${site.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {site.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                  {site.published ? 'Опубликован' : 'Черновик'}
                </span>
              </div>

              {!!site.pendingMembers && (
                <Link
                  href={`/dashboard/sites/${site.id}#members`}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
                >
                  <Clock className="h-4 w-4" />
                  {site.pendingMembers === 1
                    ? '1 заявка на вступление'
                    : `${site.pendingMembers} заявок на вступление`}
                  <span className="ml-auto text-xs font-normal opacity-80">Рассмотреть →</span>
                </Link>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/studio/builder?site=${site.id}`}>
                  <Button size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Редактировать</Button>
                </Link>
                <Link href={`/s/${site.slug}?draft=1`} target="_blank">
                  <Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Открыть</Button>
                </Link>
                <Button size="sm" variant="outline" disabled={pubBusy === site.id} onClick={() => togglePublish(site)} className="gap-1.5">
                  {pubBusy === site.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  {site.published ? 'Снять' : 'Опубликовать'}
                </Button>
                <Link href={`/dashboard/sites/${site.id}`} className="ml-auto">
                  <Button size="sm" variant="ghost" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Настройки</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
