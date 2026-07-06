'use client';

// Post-registration onboarding: a platform user requests to create a new
// organization (tenant site) or join an existing one. The request is reviewed
// by a superadmin. Shows live status of the pending/approved/rejected request.

import { useCallback, useEffect, useState } from 'react';
import { Plus, LogIn, Loader2, Clock, Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import { dashDict } from '@/lib/dashboard-dict';

type Req = { id: string; type: string; requestedName: string; requestedSlug: string; targetSiteId: string | null; status: string; rejectionReason: string; resultSiteId: string | null; createdAt: string | number };
type Org = { id: string; name: string; slug: string };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

export function OrgOnboarding() {
  const t = dashDict(useLocale().locale).org;
  const [requests, setRequests] = useState<Req[] | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [targetSiteId, setTargetSiteId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    fetch('/api/org-requests').then((r) => r.json()).then((d) => { setRequests(d.requests ?? []); setOrgs(d.organizations ?? []); }).catch(() => setRequests([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const pending = requests?.find((r) => r.status === 'pending');

  const submit = async () => {
    setBusy(true); setErr('');
    const payload = mode === 'create'
      ? { type: 'create', requestedName: name, requestedSlug: slugTouched ? slug : slugify(name), message }
      : { type: 'join', targetSiteId, message };
    const res = await fetch('/api/org-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || t.errGeneric); return; }
    load();
  };

  if (requests === null) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const approvedJoin = requests.find((r) => r.status === 'approved' && r.type === 'join');
  if (approvedJoin) {
    const org = orgs.find((o) => o.id === approvedJoin.targetSiteId);
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-600"><Check className="h-7 w-7" /></span>
        <h2 className="text-lg font-bold">{t.acceptedTitle}{org ? ` «${org.name}»` : ''}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.acceptedDesc}</p>
        {org && (
          <a href={`/s/${org.slug}/login`} target="_blank" rel="noreferrer" className="mt-5 inline-block">
            <Button size="lg" className="gap-2">{t.enterCabinet} <ArrowRight className="h-4 w-4" /></Button>
          </a>
        )}
      </div>
    );
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500"><Clock className="h-7 w-7" /></span>
        <h2 className="text-lg font-bold">{t.pendingTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending.type === 'create'
            ? t.pendingCreate.replace('{name}', pending.requestedName)
            : t.pendingJoin}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Last resolved request feedback */}
      {requests[0] && requests[0].status === 'rejected' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <X className="h-4 w-4" /> {t.rejectedPrefix}{requests[0].rejectionReason ? `: ${requests[0].rejectionReason}` : '.'}
        </div>
      )}

      <div className="flex gap-2 rounded-xl border border-border/60 bg-card p-1.5">
        <button onClick={() => setMode('create')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${mode === 'create' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
          <Plus className="h-4 w-4" /> {t.create}
        </button>
        <button onClick={() => setMode('join')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${mode === 'join' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
          <LogIn className="h-4 w-4" /> {t.join}
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-6">
        {mode === 'create' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.orgName}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.orgNamePlaceholder} className="h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.slugLabel}</label>
              <Input value={slugTouched ? slug : slugify(name)} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} placeholder={t.slugPlaceholder} className="h-11" />
              <p className="text-xs text-muted-foreground">{t.availableAt} /s/{slugify(slugTouched ? slug : name) || '…'}</p>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.orgLabel}</label>
            <select value={targetSiteId} onChange={(e) => setTargetSiteId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">
              <option value="">{t.chooseOrg}</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} (/s/{o.slug})</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.messageLabel}</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={t.messagePlaceholder} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <Button onClick={submit} disabled={busy || (mode === 'create' ? !name.trim() : !targetSiteId)} size="lg" className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t.submit}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t.reviewedBySuper}</p>
      </div>
    </div>
  );
}
