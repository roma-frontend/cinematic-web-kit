'use client';

// Member-gated content blocks for tenant landing pages: courses, documents and
// materials published by the site owner. They read the site id from the auth
// context (injected by SiteRenderer) and the link base from SiteBaseContext,
// and talk to the isolated /api/site-auth resources. Cards link to dedicated
// per-item pages (/course/<id>, /document/<id>, /material/<id>), rendered by
// SiteResourcePage. Content is visible ONLY to APPROVED members — the API
// enforces this (403 → we show a "members only" gate).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, FileText, Layers, Loader2, Lock, Download, ArrowLeft, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { siteRt, type SiteRtDict } from '@/lib/site-runtime-dict';
import { useSiteId } from '@/components/builder/site-auth-blocks';

// ── Link base (e.g. '/s/slug' or '' on a subdomain) ─────────────────────────
const SiteBaseContext = createContext<string>('/site');
export function SiteBaseProvider({ base, children }: { base: string; children: ReactNode }) {
  return <SiteBaseContext.Provider value={base}>{children}</SiteBaseContext.Provider>;
}
const useSiteBase = () => useContext(SiteBaseContext);

// ── shared types (mirror the API projections) ───────────────────────────────
type Course = { id: string; title: string; description: string; accent: string; lessonCount: number; completedCount: number };
type Lesson = { id: string; title: string; body: string; videoUrl: string; attachmentUrl: string; completed: boolean };
type CourseDetailData = { id: string; title: string; description: string; accent: string; lessons: Lesson[] };
type Document = { id: string; title: string; fileName: string; url: string; contentType: string; size: number };
type Material = { id: string; title: string; body: string; url: string };

// ── shared UI ────────────────────────────────────────────────────────────────
const sectionCls = 'mx-auto w-full max-w-6xl px-4 py-10 sm:py-14';
const gridCols: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-2 lg:grid-cols-4',
};
const cardCls = 'group relative flex h-full flex-col gap-2.5 overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5';
const iconWrap = 'flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/15';

// Stagger the card entrance as the section scrolls into view.
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

function Gate({ t }: { t: SiteRtDict }) {
  const base = useSiteBase();
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Lock className="h-5 w-5 text-muted-foreground" /></span>
      <p className="text-sm font-semibold">{t.membersOnly}</p>
      <p className="text-sm text-muted-foreground">{t.signInToAccess}</p>
      <Link href={`${base}/login`} className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        {t.login}
      </Link>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">{children}</div>;
}

/** Shown when the organization's owner has no active subscription — the whole
 *  org is temporarily dark. Distinct from the members-only sign-in gate. */
function OrgGate({ t }: { t: SiteRtDict }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Lock className="h-5 w-5 text-muted-foreground" /></span>
      <p className="text-sm font-semibold">{t.orgInactiveTitle}</p>
      <p className="text-sm text-muted-foreground">{t.orgInactiveText}</p>
    </div>
  );
}

/** Fetch a member resource. State distinguishes login/approval gates from
 *  paid-plan requirements, so public landing pages can hide member-only blocks
 *  until the visitor has paid. */
function useMemberResource<T>(resource: string, id?: string) {
  const siteId = useSiteId();
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'gated' | 'org_inactive' | 'subscription_required' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  useEffect(() => {
    if (!siteId) return;
    let alive = true;
    setState('loading');
    const q = new URLSearchParams({ site: siteId, resource });
    if (id) q.set('id', id);
    fetch(`/api/site-auth?${q.toString()}`)
      .then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json() }))
      .then(({ ok, status, body }) => {
        if (!alive) return;
        if (ok) { setData(body as T); setState('ok'); }
        // The org's plan lapsed — distinct from the members-only gate so we can
        // show a "temporarily unavailable" notice instead of a sign-in prompt.
        else if (status === 403 && body?.code === 'org_inactive') setState('org_inactive');
        else if (status === 402 && body?.code === 'subscription_required') setState('subscription_required');
        else if (status === 401 || status === 403) setState('gated');
        else setState('error');
      })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, [siteId, resource, id, reloadKey]);
  return { data, state, reload };
}

function BlockShell({ title, columns, children }: { title?: string; columns?: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <section className={sectionCls}>
      {title && (
        <div className="mb-7">
          <span className="mb-2 block h-1 w-10 rounded-full bg-primary" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        </div>
      )}
      <motion.div
        variants={reduced ? undefined : stagger}
        initial={reduced ? undefined : 'hidden'}
        whileInView={reduced ? undefined : 'show'}
        viewport={{ once: true, margin: '-60px' }}
        className={`grid gap-4 sm:gap-5 ${gridCols[columns || '3'] ?? gridCols['3']}`}
      >
        {children}
      </motion.div>
    </section>
  );
}

/** One animated card wrapper (a stagger child that lifts into view). */
function CardItem({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div variants={reduced ? undefined : rise} className="h-full">{children}</motion.div>;
}

// ── Courses ──────────────────────────────────────────────────────────────────
export function CourseListBlock({ title, columns, showProgress }: { title?: string; columns?: string; showProgress?: string }) {
  const t = siteRt(useLocale().locale);
  const base = useSiteBase();
  const { data, state } = useMemberResource<{ courses: Course[] }>('courses');
  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  if (state === 'subscription_required') return null;
  if (state === 'gated') return <Gate t={t} />;
  if (state === 'org_inactive') return <OrgGate t={t} />;
  if (state === 'error') return <Centered>{t.loadFailed}</Centered>;
  const courses = data?.courses ?? [];
  if (courses.length === 0) return <BlockShell title={title} columns={columns}><Centered>{t.empty}</Centered></BlockShell>;
  return (
    <BlockShell title={title} columns={columns}>
      {courses.map((c) => {
        const pct = c.lessonCount > 0 ? Math.round((c.completedCount / c.lessonCount) * 100) : 0;
        return (
          <CardItem key={c.id}>
            <Link href={`${base}/course/${c.id}`} className={cardCls}>
              {c.accent && <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.accent }} />}
              <span className={iconWrap}><BookOpen className="h-5 w-5" /></span>
              <h3 className="font-semibold leading-tight">{c.title}</h3>
              {c.description && <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              <div className="mt-auto pt-3">
                {showProgress !== 'false' && c.lessonCount > 0 && (
                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {c.lessonCount} {t.lessonsCount}
                  {showProgress !== 'false' && c.lessonCount > 0 && ` · ${c.completedCount}/${c.lessonCount} ${t.completedOf}`}
                </p>
              </div>
            </Link>
          </CardItem>
        );
      })}
    </BlockShell>
  );
}

export function CourseDetail({ id }: { id: string }) {
  const t = siteRt(useLocale().locale);
  const siteId = useSiteId();
  const base = useSiteBase();
  const { data, state, reload } = useMemberResource<{ course: CourseDetailData }>('course', id);
  const [busy, setBusy] = useState<string>('');

  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  if (state === 'subscription_required') return <div className={sectionCls}><Gate t={t} /></div>;
  if (state === 'gated') return <div className={sectionCls}><Gate t={t} /></div>;
  if (state === 'org_inactive') return <div className={sectionCls}><OrgGate t={t} /></div>;
  if (state === 'error' || !data?.course) return <div className={sectionCls}><Centered>{t.notFound}</Centered></div>;
  const course = data.course;

  const toggle = async (lesson: Lesson) => {
    setBusy(lesson.id);
    try {
      await fetch('/api/site-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lesson-complete', siteId, lessonId: lesson.id, done: !lesson.completed }),
      });
      reload();
    } finally { setBusy(''); }
  };

  return (
    <section className={sectionCls}>
      <Link href={base || '/'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
      {course.description && <p className="mt-2 max-w-2xl text-muted-foreground">{course.description}</p>}
      <ol className="mt-8 space-y-4">
        {course.lessons.map((l, i) => (
          <li key={l.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold">{i + 1}. {l.title}</h3>
              <button
                onClick={() => toggle(l)}
                disabled={busy === l.id}
                className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                {l.completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
                {l.completed ? t.completed : t.markComplete}
              </button>
            </div>
            {l.videoUrl && (
              <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-black">
                <video src={l.videoUrl} controls className="h-full w-full" />
              </div>
            )}
            {l.body && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{l.body}</p>}
            {l.attachmentUrl && (
              <a href={l.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Download className="h-4 w-4" /> {t.download}
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentListBlock({ title, columns }: { title?: string; columns?: string }) {
  const t = siteRt(useLocale().locale);
  const base = useSiteBase();
  const { data, state } = useMemberResource<{ documents: Document[] }>('documents');
  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  if (state === 'subscription_required') return null;
  if (state === 'gated') return <Gate t={t} />;
  if (state === 'org_inactive') return <OrgGate t={t} />;
  if (state === 'error') return <Centered>{t.loadFailed}</Centered>;
  const docs = data?.documents ?? [];
  if (docs.length === 0) return <BlockShell title={title} columns={columns}><Centered>{t.empty}</Centered></BlockShell>;
  return (
    <BlockShell title={title} columns={columns}>
      {docs.map((d) => (
        <CardItem key={d.id}>
          <Link href={`${base}/document/${d.id}`} className={cardCls}>
            <span className={iconWrap}><FileText className="h-5 w-5" /></span>
            <h3 className="font-semibold leading-tight">{d.title}</h3>
            <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
              <Download className="h-3.5 w-3.5" /> {humanSize(d.size)}
            </p>
          </Link>
        </CardItem>
      ))}
    </BlockShell>
  );
}

export function DocumentDetail({ id }: { id: string }) {
  const t = siteRt(useLocale().locale);
  const base = useSiteBase();
  const { data, state } = useMemberResource<{ documents: Document[] }>('documents');
  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  if (state === 'subscription_required') return <div className={sectionCls}><Gate t={t} /></div>;
  if (state === 'gated') return <div className={sectionCls}><Gate t={t} /></div>;
  if (state === 'org_inactive') return <div className={sectionCls}><OrgGate t={t} /></div>;
  const doc = data?.documents?.find((d) => d.id === id);
  if (state === 'error' || !doc) return <div className={sectionCls}><Centered>{t.notFound}</Centered></div>;
  const isImage = doc.contentType.startsWith('image/');
  const isVideo = doc.contentType.startsWith('video/');
  return (
    <section className={sectionCls}>
      <Link href={base || '/'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{doc.fileName} · {humanSize(doc.size)}</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doc.url} alt={doc.title} className="w-full" />
        ) : isVideo ? (
          <video src={doc.url} controls className="w-full" />
        ) : (
          <div className="flex flex-col items-center gap-4 p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{doc.fileName}</p>
          </div>
        )}
      </div>
      <a href={doc.url} target="_blank" rel="noopener noreferrer" download className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        <Download className="h-4 w-4" /> {t.download}
      </a>
    </section>
  );
}

// ── Materials ──────────────────────────────────────────────────────────────────
export function MaterialListBlock({ title, columns }: { title?: string; columns?: string }) {
  const t = siteRt(useLocale().locale);
  const base = useSiteBase();
  const { data, state } = useMemberResource<{ materials: Material[] }>('materials');
  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  if (state === 'subscription_required') return null;
  if (state === 'gated') return <Gate t={t} />;
  if (state === 'org_inactive') return <OrgGate t={t} />;
  if (state === 'error') return <Centered>{t.loadFailed}</Centered>;
  const materials = data?.materials ?? [];
  if (materials.length === 0) return <BlockShell title={title} columns={columns}><Centered>{t.empty}</Centered></BlockShell>;
  return (
    <BlockShell title={title} columns={columns}>
      {materials.map((m) => (
        <CardItem key={m.id}>
          <Link href={`${base}/material/${m.id}`} className={cardCls}>
            <span className={iconWrap}><Layers className="h-5 w-5" /></span>
            <h3 className="font-semibold leading-tight">{m.title}</h3>
            {m.body && <p className="line-clamp-3 text-sm text-muted-foreground">{m.body}</p>}
          </Link>
        </CardItem>
      ))}
    </BlockShell>
  );
}

export function MaterialDetail({ id }: { id: string }) {
  const t = siteRt(useLocale().locale);
  const base = useSiteBase();
  const { data, state } = useMemberResource<{ materials: Material[] }>('materials');
  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  if (state === 'subscription_required') return <div className={sectionCls}><Gate t={t} /></div>;
  if (state === 'gated') return <div className={sectionCls}><Gate t={t} /></div>;
  if (state === 'org_inactive') return <div className={sectionCls}><OrgGate t={t} /></div>;
  const material = data?.materials?.find((m) => m.id === id);
  if (state === 'error' || !material) return <div className={sectionCls}><Centered>{t.notFound}</Centered></div>;
  return (
    <section className={sectionCls}>
      <Link href={base || '/'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{material.title}</h1>
      {material.body && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-muted-foreground">{material.body}</p>}
      {material.url && (
        <a href={material.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <ExternalLink className="h-4 w-4" /> {t.openLink}
        </a>
      )}
    </section>
  );
}


// ── Public member-plans section (tenant landing) ────────────────────────────
// Presentational catalog of the org's ACTIVE plans (public marketing data via
// ?resource=public-plans — no auth). The CTA sends visitors to the join/register
// page; after joining (auto-approved via QR) they hit the account paywall to
// subscribe. Purely a funnel entry — payment happens in the member account.
interface LandingPlan {
  id: string; name: string; description: string; amountCents: number;
  currency: string; interval: 'month' | 'year'; perks: string[];
}
export function MemberPlansBlock({ title, columns, ctaHref }: { title?: string; columns?: string; ctaHref?: string }) {
  const t = siteRt(useLocale().locale);
  const locale = useLocale().locale;
  const base = useSiteBase();
  const { data, state } = useMemberResource<{ plans: LandingPlan[] }>('public-plans');
  if (state === 'loading') return <Centered><Loader2 className="h-5 w-5 animate-spin" /></Centered>;
  const plans = data?.plans ?? [];
  if (plans.length === 0) return null; // nothing to advertise
  const money = (cents: number, cur: string) =>
    new Intl.NumberFormat(locale === 'hy' ? 'hy-AM' : locale, { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 2 }).format(cents / 100);
  const join = ctaHref || `${base}/register`;
  const per = (i: string) => (i === 'year' ? t.perYear : t.perMonth);
  return (
    <BlockShell title={title} columns={columns}>
      {plans.map((p) => (
        <CardItem key={p.id}>
          <div className={cardCls}>
            <h3 className="font-semibold leading-tight">{p.name}</h3>
            <div className="text-2xl font-bold">{money(p.amountCents, p.currency)}<span className="text-sm font-normal text-muted-foreground">{per(p.interval)}</span></div>
            {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
            {p.perks.length > 0 && (
              <ul className="mt-1 space-y-1 text-sm">
                {p.perks.map((perk, i) => (<li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{perk}</li>))}
              </ul>
            )}
            <Link href={join} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              {t.planJoinCta}
            </Link>
          </div>
        </CardItem>
      ))}
    </BlockShell>
  );
}

// ── Pricing-card CTA wired to real subscriptions ────────────────────────────
// The builder's `pricing` block CTA. When linked to a catalog plan (planId), it
// starts a real Stripe subscription: logged-in members go straight to Checkout,
// visitors are sent to the join/register page first. Unlinked → a plain link.
export function PricingCta({ planId, href, cta, featured }: { planId?: string; href?: string; cta: string; featured: boolean }) {
  const siteId = useSiteId();
  const base = useSiteBase();
  const [busy, setBusy] = useState(false);
  const cls = [
    'bn-btn mt-auto inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90',
    featured ? 'bg-primary text-primary-foreground' : 'border border-border bg-background',
  ].join(' ');

  // No linked plan → behave exactly as before (a styled link).
  if (!planId || !siteId) {
    return <Link href={href || '#'} className={cls}>{cta}</Link>;
  }

  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/site-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', siteId, planId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && typeof d.url === 'string') { window.location.assign(d.url); return; }
      // Not signed in (or not a member yet) → send them to join/register first.
      if (res.status === 401) { window.location.assign(`${base}/register`); return; }
      setBusy(false);
    } catch { setBusy(false); }
  };

  return (
    <button type="button" onClick={go} disabled={busy} className={cls}>
      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{cta}
    </button>
  );
}
