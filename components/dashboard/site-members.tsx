'use client';

// Site owner (admin) management of an organization: approve/reject/suspend
// members and create member-only materials. Talks to /api/site-members
// (platform-authenticated + ownership-checked). Fully siteId-scoped.

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Check, X, Ban, Clock, Plus, Trash2, Users, Library, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Member = { id: string; email: string; name: string; status: string; rejectionReason: string; createdAt: string | number; approvedAt: string | number | null };
type Material = { id: string; title: string; body: string; url: string; published: boolean; createdAt: string | number };

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Ожидает', cls: 'bg-amber-500/15 text-amber-600' },
  approved: { label: 'Участник', cls: 'bg-green-500/15 text-green-600' },
  rejected: { label: 'Отклонён', cls: 'bg-red-500/15 text-red-500' },
  suspended: { label: 'Приостановлен', cls: 'bg-red-500/15 text-red-500' },
};

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/site-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.ok;
}

export function SiteMembers({ siteId, memberApproval }: { siteId: string; memberApproval: boolean }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [approval, setApproval] = useState(memberApproval);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    fetch(`/api/site-members?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((d) => { setMembers(d.members ?? []); setMaterials(d.materials ?? []); })
      .catch(() => { setMembers([]); setMaterials([]); });
  }, [siteId]);
  useEffect(() => { load(); }, [load]);

  const act = async (memberId: string, status: string) => {
    let reason = '';
    if (status === 'rejected' || status === 'suspended') reason = window.prompt('Причина (необязательно):') ?? '';
    setBusy(memberId);
    await post({ action: 'set-status', siteId, memberId, status, reason });
    setBusy(''); load();
  };

  const toggleApproval = async (v: boolean) => { setApproval(v); await post({ action: 'set-approval-policy', siteId, memberApproval: v }); };

  const pending = members?.filter((m) => m.status === 'pending') ?? [];
  const others = members?.filter((m) => m.status !== 'pending') ?? [];

  return (
    <div className="space-y-8">
      {/* Approval policy */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <span>
          <span className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> Одобрение участников</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Новые регистрации ждут вашего одобрения, прежде чем увидят материалы.</span>
        </span>
        <button type="button" role="switch" aria-checked={approval} onClick={() => toggleApproval(!approval)}
          className={`relative h-6 w-11 flex-none rounded-full transition-colors ${approval ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${approval ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
        </button>
      </label>

      {/* Pending requests */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-amber-500" /> Заявки на вступление {pending.length > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">{pending.length}</span>}</h3>
        {!members ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет новых заявок.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name || 'Без имени'}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Button size="sm" className="gap-1.5 bg-green-600 text-white hover:bg-green-700" disabled={busy === m.id} onClick={() => act(m.id, 'approved')}>
                  {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Одобрить
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10" disabled={busy === m.id} onClick={() => act(m.id, 'rejected')}>
                  <X className="h-4 w-4" /> Отклонить
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* All members */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Участники</h3>
        {members && others.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет участников.</p>
        ) : (
          <ul className="space-y-2">
            {others.map((m) => {
              const meta = STATUS_META[m.status] ?? STATUS_META.approved;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name || 'Без имени'}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                  {m.status === 'approved' ? (
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10" disabled={busy === m.id} onClick={() => act(m.id, 'suspended')}>
                      <Ban className="h-4 w-4" /> Приостановить
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy === m.id} onClick={() => act(m.id, 'approved')}>
                      {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Восстановить
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <MaterialsEditor siteId={siteId} materials={materials} reload={load} />
    </div>
  );
}

function MaterialsEditor({ siteId, materials, reload }: { siteId: string; materials: Material[] | null; reload: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState('');

  const add = async () => {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    await post({ action: 'material-create', siteId, title, body, url, published: true });
    setBusy(false); setTitle(''); setBody(''); setUrl(''); reload();
  };
  const del = async (id: string) => { setDelBusy(id); await post({ action: 'material-delete', siteId, materialId: id }); setDelBusy(''); reload(); };

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Library className="h-4 w-4" /> Материалы для участников</h3>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" className="h-10" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст материала…" rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ссылка (необязательно)" className="h-10" />
        <Button size="sm" className="gap-1.5" disabled={busy} onClick={add}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Добавить материал
        </Button>
      </div>
      {materials && materials.length > 0 && (
        <ul className="mt-3 space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.title || 'Без названия'}</p>
                {m.body && <p className="truncate text-xs text-muted-foreground">{m.body}</p>}
              </div>
              <button type="button" onClick={() => del(m.id)} disabled={delBusy === m.id} aria-label="Удалить" className="flex-none rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                {delBusy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
