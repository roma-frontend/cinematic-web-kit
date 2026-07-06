'use client';

// Per-site settings: identity (name/slug), custom domains with DNS
// instructions + verification, form submissions inbox, danger zone.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Save, Globe, Plus, Trash2, RefreshCw, CheckCircle2, Inbox, ExternalLink, Copy, Check, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/hooks/use-locale';
import { siteSettingsDict } from '@/lib/site-settings-dict';
import { BCP47 } from '@/lib/seo';

interface SiteInfo {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
}
interface DomainRow {
  id: string;
  hostname: string;
  verified: boolean;
}
interface SubmissionRow {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: string;
}
interface SiteUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function SiteSettings({
  appHost,
  serverIp,
  site,
  initialDomains,
  initialSubmissions,
  initialSiteUsers,
}: {
  appHost: string;
  serverIp: string;
  site: SiteInfo;
  initialDomains: DomainRow[];
  initialSubmissions: SubmissionRow[];
  initialSiteUsers: SiteUserRow[];
}) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const locale = useLocale().locale;
  const t = siteSettingsDict(locale);
  const [name, setName] = useState(site.name);
  const [slug, setSlug] = useState(site.slug);
  const [savedSlug, setSavedSlug] = useState(site.slug);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [domains, setDomains] = useState(initialDomains);
  const [newDomain, setNewDomain] = useState('');
  const [domBusy, setDomBusy] = useState<string | null>(null);
  const [domErr, setDomErr] = useState('');

  const appHostname = appHost.split(':')[0];
  const [copied, setCopied] = useState('');
  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1500);
    });
  };
  // DNS records for a hostname: apex (example.com) uses an A-record to the
  // server IP; a subdomain (www.example.com) uses a CNAME to the platform host.
  const dnsRecords = (hostname: string): { type: string; name: string; value: string }[] => {
    const labels = hostname.split('.');
    const isApex = labels.length <= 2;
    const name = isApex ? '@' : labels.slice(0, labels.length - 2).join('.');
    return isApex
      ? [{ type: 'A', name, value: serverIp || t.serverIp }]
      : [{ type: 'CNAME', name, value: appHostname }];
  };

  const saveIdentity = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(t.saved);
        setSlug(data.site.slug);
        setSavedSlug(data.site.slug);
        router.refresh();
      } else setMsg(data.error || t.error);
    } catch {
      setMsg(t.networkError);
    } finally {
      setSaving(false);
    }
  };

  const addDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setDomBusy('add');
    setDomErr('');
    try {
      const res = await fetch(`/api/sites/${site.id}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: newDomain }),
      });
      const data = await res.json();
      if (res.ok) {
        setDomains((d) => [...d, { id: data.domain.id, hostname: data.domain.hostname, verified: false }]);
        setNewDomain('');
      } else setDomErr(data.error || t.error);
    } finally {
      setDomBusy(null);
    }
  };

  const runCheck = async (domainId: string): Promise<{ verified: boolean; error: string }> => {
    try {
      const res = await fetch(`/api/sites/${site.id}/domains`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();
      if (res.ok) {
        setDomains((list) => list.map((d) => (d.id === domainId ? { ...d, verified: data.verified } : d)));
        return { verified: Boolean(data.verified), error: data.verified ? '' : `${t.dnsNotPointing} (${(data.details || []).join(' · ')})` };
      }
      return { verified: false, error: data.error || t.checkError };
    } catch {
      return { verified: false, error: t.networkError };
    }
  };

  const checkDomain = async (domainId: string) => {
    setDomBusy(domainId);
    setDomErr('');
    const r = await runCheck(domainId);
    if (!r.verified) setDomErr(r.error);
    setDomBusy(null);
  };

  // Auto re-check pending domains in the background so a freshly-added DNS
  // record gets picked up without the user clicking «Проверить».
  const domainsRef = useRef(domains);
  useEffect(() => { domainsRef.current = domains; }, [domains]);
  useEffect(() => {
    if (!domains.some((d) => !d.verified)) return;
    const t = setInterval(() => {
      for (const d of domainsRef.current) if (!d.verified) void runCheck(d.id);
    }, 25000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains]);

  const removeDomain = async (domainId: string) => {
    setDomBusy(domainId);
    try {
      const res = await fetch(`/api/sites/${site.id}/domains?domainId=${encodeURIComponent(domainId)}`, { method: 'DELETE' });
      if (res.ok) setDomains((list) => list.filter((d) => d.id !== domainId));
    } finally {
      setDomBusy(null);
    }
  };

  const deleteSite = async () => {
    const ok = await confirm({
      title: t.deleteConfirmTitle.replace('{name}', site.name),
      description: t.deleteConfirmDesc,
      confirmLabel: t.deleteSite,
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/dashboard');
  };

  return (
    <main className="min-h-dvh bg-background">
      {confirmDialog}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t.backToSites}
          </Link>
          <span className="font-semibold tracking-tight">/ {site.name}</span>
          <Link href={`/s/${savedSlug}?draft=1`} target="_blank" className="ml-auto">
            <Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> {t.openSite}</Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        {/* Identity */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold tracking-tight">{t.identityTitle}</h2>
          <form onSubmit={saveIdentity} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="site-name" className="text-sm font-medium">{t.name}</label>
              <Input id="site-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="site-slug" className="text-sm font-medium">{t.slugLabel}</label>
              <Input id="site-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {t.availableAt} {appHost}/s/<b>{slug || '…'}</b>
                {appHostname !== 'localhost' && <> {t.and} <b>{slug || '…'}</b>.{appHostname}</>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t.save}
              </Button>
              {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
            </div>
          </form>
        </section>

        {/* Domains */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Globe className="h-4 w-4 text-primary" /> {t.domainsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.domainsHint.replace('{host}', appHostname)}
          </p>

          <form onSubmit={addDomain} className="mt-4 flex gap-2">
            <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" className="max-w-xs" aria-label={t.newDomainAria} />
            <Button type="submit" disabled={domBusy === 'add' || !newDomain.trim()} className="gap-1.5">
              {domBusy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t.attach}
            </Button>
          </form>
          {domErr && <p className="mt-2 text-sm text-destructive" role="alert">{domErr}</p>}

          {domains.length > 0 && (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
              {domains.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{d.hostname}</span>
                    {d.verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> {t.verified}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.awaitingDns}</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost" disabled={domBusy === d.id} onClick={() => checkDomain(d.id)} className="gap-1.5" title={t.checkNow}>
                        {domBusy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {t.check}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={domBusy === d.id} onClick={() => removeDomain(d.id)} title={t.detach}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {!d.verified && (
                    <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                      <p className="mb-1.5 text-xs text-muted-foreground">{t.addDnsRecord}</p>
                      {dnsRecords(d.hostname).map((r, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                          <span className="rounded bg-background px-1.5 py-0.5 font-semibold">{r.type}</span>
                          <span className="text-muted-foreground">{t.dnsName}</span>
                          <code className="rounded bg-background px-1.5 py-0.5">{r.name}</code>
                          <span className="text-muted-foreground">{t.dnsValue}</span>
                          <code className="rounded bg-background px-1.5 py-0.5">{r.value}</code>
                          <button type="button" onClick={() => copy(r.value, `${d.id}-${i}`)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-background hover:text-foreground" title={t.copyValue}>
                            {copied === `${d.id}-${i}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Site end-users (tenant's own customers) */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Users className="h-4 w-4 text-primary" /> {t.clientsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.clientsHint}
          </p>
          {initialSiteUsers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t.clientsEmpty}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
              {initialSiteUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{u.name || '—'}</span>
                  <span className="text-muted-foreground">{u.email}</span>
                  <time className="ml-auto text-xs text-muted-foreground" dateTime={u.createdAt}>{new Date(u.createdAt).toLocaleDateString(BCP47[locale])}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Submissions */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight"><Inbox className="h-4 w-4 text-primary" /> {t.submissionsTitle}</h2>
          {initialSubmissions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.submissionsEmpty}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {initialSubmissions.map((s) => (
                <li key={s.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{s.formId}</span>
                    <time dateTime={s.createdAt}>{new Date(s.createdAt).toLocaleString(BCP47[locale])}</time>
                  </div>
                  <dl className="mt-2 space-y-1 text-sm">
                    {Object.entries(s.data)
                      .filter(([k]) => k !== 'formId')
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
                          <dd className="break-all">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
          <h2 className="font-semibold tracking-tight text-destructive">{t.dangerTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.dangerHint}</p>
          <Button variant="outline" onClick={deleteSite} className="mt-3 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> {t.deleteSite}
          </Button>
        </section>
      </div>
    </main>
  );
}
