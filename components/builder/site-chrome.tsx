import Link from 'next/link';
import type { BuilderDoc } from '@/lib/builder/types';
import { chromeBtnClass, navLinkClass, type ChromeBtnStyles } from '@/lib/builder/chrome-buttons';
import { MobileNav } from './mobile-nav';
import { ScrollHeader } from './scroll-header';
import { SiteAuthButtons } from './site-auth-blocks';
import { SiteThemeToggle } from './site-theme-toggle';
import { siteRt, type SiteRtDict } from '@/lib/site-runtime-dict';
import { LanguageSwitcher } from '../language-switcher';

const RT_DEFAULT = siteRt('ru');

export const HEADER_VARIANTS = ['minimal', 'centered', 'split', 'cta', 'command', 'orbital', 'studio', 'commerce', 'portal'] as const;
export const FOOTER_VARIANTS = ['simple', 'columns', 'centered', 'newsletter', 'mega', 'magazine', 'ctaBand', 'socialWall', 'sitemap'] as const;

// Shared header + footer (+ optional aside) for all builder pages, with several
// professional variants selectable in the editor.

// Brand/CTA link targets: rebaseDoc sets doc.base for tenant sites
// ('/s/<slug>' or '' for a custom domain root); the legacy /site route leaves
// it undefined so links keep pointing at '/site'.
function homeHref(doc: BuilderDoc): string {
  if (doc.base === undefined) return '/site';
  return doc.base || '/';
}
function contactHref(doc: BuilderDoc): string {
  if (doc.base === undefined) return '/site/contact';
  return `${doc.base}/contact`;
}
// Base for the built-in auth pages (/login, /register, /account).
function authBase(doc: BuilderDoc): string {
  return doc.base === undefined ? '/site' : doc.base || '';
}
const showAuth = (doc: BuilderDoc) => doc.authButtons !== 'false' && Boolean(doc.siteId);
// Editable look of the built-in chrome buttons (style only — hrefs are fixed).
const authStyles = (doc: BuilderDoc): ChromeBtnStyles => ({
  login: doc.authLoginVariant,
  cta: doc.authCtaVariant,
  size: doc.authBtnSize,
  rounded: doc.authBtnRounded,
});

// Brand content honouring logo/text mode. The <img> always carries alt +
// explicit width/height (defaults) so there is no layout shift and Lighthouse's
// "image elements have explicit width and height" / "alt" audits stay green.
function BrandInner({ doc, t = RT_DEFAULT }: { doc: BuilderDoc; t?: SiteRtDict }) {
  const mode = doc.brandMode || (doc.logoUrl ? 'both' : 'text');
  const showLogo = (mode === 'logo' || mode === 'both') && !!doc.logoUrl;
  const showText = mode === 'text' || (mode === 'both') || !doc.logoUrl;
  const h = Number(doc.logoHeight) || 32;
  const w = Number(doc.logoWidth) || 120;
  const alt = doc.logoAlt || doc.brand || t.logo;
  return (
    <span className="inline-flex items-center gap-2">
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.logoUrl} alt={alt} width={w} height={h} style={{ height: h, width: 'auto', maxWidth: w }} className="object-contain" decoding="async" />
      )}
      {showText && <span className="font-display text-lg font-black tracking-tight">{doc.brand}</span>}
    </span>
  );
}

export function Header({ doc }: { doc: BuilderDoc }) {
  const variant = doc.headerVariant || 'minimal';
  const heavyHeader = ['command', 'orbital', 'studio', 'commerce', 'portal'].includes(variant);
  const home = homeHref(doc);
  const brand = (
    <Link href={home} className="inline-flex items-center" aria-label={doc.brand}>
      <BrandInner doc={doc} />
    </Link>
  );
  const nav = (
    <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex lg:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {doc.nav.map((l) => (
        <Link key={l.href + l.label} href={l.href} className={navLinkClass(doc.navStyle)}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
  const auth = showAuth(doc) ? <SiteAuthButtons base={authBase(doc)} styles={authStyles(doc)} /> : null;
  const themeToggle = <SiteThemeToggle siteId={doc.siteId ?? ''} />;
  const lang = <LanguageSwitcher />;
  // Real CTA button for the 'cta' header variant. Text/style are editable in
  // the builder; the href can only point at one of the site's own pages
  // (defaults to the contact page).
  const hasCta = ['cta', 'studio', 'commerce', 'portal'].includes(variant);
  const cta = hasCta ? (
    <Link
      href={doc.headerCtaHref || contactHref(doc)}
      className={chromeBtnClass(doc.headerCtaVariant ?? 'default', doc.authBtnSize, doc.authBtnRounded)}
    >
      {doc.headerCtaText || 'Связаться'}
    </Link>
  ) : null;
  const search = (
    <form action={home} method="get" className="hidden w-44 shrink-0 items-center rounded-full border border-border/60 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur xl:flex">
      <span className="mr-2 h-2 w-2 rounded-full bg-primary" />
      <input name="q" type="search" aria-label="Search" placeholder="Search" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </form>
  );

  let desktop: React.ReactNode;
  if (variant === 'command') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-7xl px-4 py-3 xl:block">
        <div className="flex min-h-16 items-center justify-between gap-4 rounded-full border border-border/70 bg-background/75 px-4 shadow-2xl shadow-primary/10 backdrop-blur-2xl">
          <div className="flex items-center gap-3">{brand}<span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-primary lg:inline-flex">Live</span></div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">{nav}{search}</div>
          <div className="flex items-center gap-2">{auth}{lang}{themeToggle}</div>
        </div>
      </div>
    );
  } else if (variant === 'orbital') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-7xl px-6 py-3 xl:block">
        <div className="mb-2 flex items-center justify-between rounded-full border border-border/60 bg-muted/35 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium">24/7 digital presence</span>
          <div className="flex items-center gap-4"><span>Secure</span><span>Fast</span><span>Responsive</span></div>
        </div>
        <div className="grid min-h-16 grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-border/70 bg-background/85 px-4 shadow-lg backdrop-blur-xl">
          <div className="justify-self-start">{brand}</div>
          <div className="justify-self-center">{nav}</div>
          <div className="flex items-center gap-2 justify-self-end">{auth}{lang}{themeToggle}</div>
        </div>
      </div>
    );
  } else if (variant === 'studio') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-7xl items-center gap-3 px-6 py-3 xl:flex">
        <div className="rounded-2xl border border-border/70 bg-foreground px-4 py-3 text-background shadow-xl shadow-primary/10 [&_*]:text-background">{brand}</div>
        <div className="flex min-h-16 flex-1 items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/35 px-4 backdrop-blur-xl">
          {nav}
          <div className="flex items-center gap-2">{auth}{cta}{lang}{themeToggle}</div>
        </div>
      </div>
    );
  } else if (variant === 'commerce') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-7xl px-6 py-3 xl:block">
        <div className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-border/70 bg-background/90 px-4 shadow-xl shadow-black/5 backdrop-blur-xl">
          {brand}
          <div className="flex min-w-0 items-center justify-center gap-3">{search}{nav}</div>
          <div className="flex items-center gap-2">{auth}{cta}{themeToggle}</div>
        </div>
      </div>
    );
  } else if (variant === 'portal') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-7xl px-6 py-3 xl:block">
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/15 via-background to-muted/60 px-5 py-4 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <div className="relative flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">{brand}<span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Premium</span></div>
            <div className="flex items-center gap-3">{nav}{auth}{cta}{lang}{themeToggle}</div>
          </div>
        </div>
      </div>
    );
  } else if (variant === 'centered') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-6xl flex-col items-center gap-2 px-6 py-3 md:flex">
        {brand}
        <div className="flex items-center gap-3">{nav}{auth}{lang}{themeToggle}</div>
      </div>
    );
  } else if (variant === 'split') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-6xl grid-cols-3 items-center px-6 py-3 md:grid">
        <div className="justify-self-start">{nav}</div>
        <div className="justify-self-center">{brand}</div>
        <div className="flex items-center gap-2 justify-self-end">{auth}{lang}{themeToggle}</div>
      </div>
    );
  } else if (variant === 'cta') {
    desktop = (
      <div className="mx-auto hidden h-16 w-full max-w-6xl items-center justify-between px-6 md:flex">
        {brand}
        <div className="flex items-center gap-3">
          {nav}
          {auth}
          {cta}
          {lang}
          {themeToggle}
        </div>
      </div>
    );
  } else {
    desktop = (
      <div className="mx-auto hidden h-16 w-full max-w-6xl items-center justify-between px-6 md:flex">
        {brand}
        <div className="flex items-center gap-3">{nav}{auth}{lang}{themeToggle}</div>
      </div>
    );
  }

  return (
    <ScrollHeader behavior={doc.headerBehavior || 'solid'}>
      {desktop}
      {/* mobile / tablet bar — theme toggle always visible, auth lives in the burger */}
      <div className={`mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-6 ${heavyHeader ? 'xl:hidden' : 'md:hidden'}`}>
        {brand}
        <div className="flex items-center gap-2">
          {themeToggle}
          <MobileNav links={doc.nav} authBase={authBase(doc)} showAuth={showAuth(doc)} authStyles={authStyles(doc)} className={heavyHeader ? 'xl:hidden' : 'md:hidden'} />
        </div>
      </div>
    </ScrollHeader>
  );
}

// Legal pages (by reserved path) are auto-linked in the footer whenever the
// site has them — so a tenant's Privacy/Terms/Cookie pages always appear in the
// footer without the admin wiring links manually. Deduped against manual links.
const LEGAL_PATHS = ['privacy', 'terms', 'cookies', 'cookie-policy', 'acceptable-use'];
function footerLinks(doc: BuilderDoc): { href: string; label: string }[] {
  const links = [...doc.footer.links];
  const have = new Set(links.map((l) => l.href));
  for (const p of doc.pages) {
    if (!p.path || !LEGAL_PATHS.includes(p.path)) continue;
    // Match how nav/footer hrefs are rebased: undefined base = legacy /site.
    const href = doc.base === undefined ? `/site/${p.path}` : `${doc.base}/${p.path}`;
    if (!have.has(href)) {
      links.push({ href, label: p.title });
      have.add(href);
    }
  }
  return links;
}

export function Footer({ doc, t = RT_DEFAULT }: { doc: BuilderDoc; t?: SiteRtDict }) {
  const variant = doc.footerVariant || 'simple';
  const links = footerLinks(doc);
  const brandLink = <Link href={homeHref(doc)} className="inline-flex items-center" aria-label={doc.brand}><BrandInner doc={doc} /></Link>;
  const linkItems = links.length ? links : doc.nav;
  if (variant === 'mega') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-6 py-14">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-2xl shadow-primary/10">
              {brandLink}
              <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{doc.footer.text}</p>
              <Link href={contactHref(doc)} className={chromeBtnClass(doc.footerBtnVariant ?? 'default', 'md', doc.authBtnRounded ?? 'full', ' mt-6')}>Start a project</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-5"><p className="mb-3 text-sm font-semibold">{t.navigation}</p>{doc.nav.map((l) => <Link key={l.href + l.label} href={l.href} className="block rounded-lg py-1.5 text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}</div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-5"><p className="mb-3 text-sm font-semibold">{t.links}</p>{linkItems.map((l) => <Link key={l.href + l.label} href={l.href} className="block rounded-lg py-1.5 text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}</div>
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5"><p className="mb-3 text-sm font-semibold">Updates</p><form action="/api/form" method="post" className="space-y-2"><input type="email" name="email" placeholder="you@example.com" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50" /><button type="submit" className={chromeBtnClass(doc.footerBtnVariant ?? 'default', 'sm', doc.authBtnRounded ?? 'full')}>{t.subscribe}</button></form></div>
            </div>
          </div>
        </div>
      </footer>
    );
  }
  if (variant === 'magazine') {
    return (
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto w-full max-w-7xl px-6 py-12">
          <div className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
            <div>{brandLink}<p className="mt-3 max-w-xl text-sm text-muted-foreground">{doc.footer.text}</p></div>
            <p className="font-display text-5xl font-black uppercase text-muted-foreground/30 md:text-7xl">{doc.brand}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...doc.nav, ...linkItems].slice(0, 8).map((l, i) => <Link key={`${l.href}${l.label}${i}`} href={l.href} className="group border-t border-border/60 pt-4"><span className="text-xs text-muted-foreground">0{i + 1}</span><span className="mt-2 block text-lg font-semibold transition-colors group-hover:text-primary">{l.label}</span></Link>)}
          </div>
        </div>
      </footer>
    );
  }
  if (variant === 'ctaBand') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-6 py-12">
          <div className="overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/20 via-background to-muted p-8 shadow-2xl shadow-primary/10 md:p-10">
            <div className="grid gap-6 md:grid-cols-[1.4fr_auto] md:items-center">
              <div>{brandLink}<p className="mt-4 max-w-2xl text-2xl font-semibold leading-tight md:text-4xl">Build something visitors remember.</p><p className="mt-3 text-sm text-muted-foreground">{doc.footer.text}</p></div>
              <Link href={contactHref(doc)} className={chromeBtnClass(doc.footerBtnVariant ?? 'default', 'lg', doc.authBtnRounded ?? 'full')}>Contact</Link>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap justify-center gap-4">{linkItems.map((l) => <Link key={l.href + l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}</nav>
        </div>
      </footer>
    );
  }
  if (variant === 'socialWall') {
    return (
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-14 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">{brandLink}<p className="max-w-md text-sm leading-6 text-muted-foreground">{doc.footer.text}</p><div className="flex flex-wrap gap-2">{['Telegram', 'Instagram', 'YouTube', 'Email'].map((s) => <a key={s} href={s === 'Email' ? 'mailto:hi@example.com' : '#'} className="rounded-full border border-border/70 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">{s}</a>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">{linkItems.slice(0, 6).map((l) => <Link key={l.href + l.label} href={l.href} className="rounded-2xl border border-border/70 bg-muted/30 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"><span className="text-sm font-semibold">{l.label}</span><span className="mt-1 block text-xs text-muted-foreground">Open section</span></Link>)}</div>
        </div>
      </footer>
    );
  }
  if (variant === 'sitemap') {
    return (
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto w-full max-w-7xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr_1fr]">
            <div>{brandLink}<p className="mt-3 text-sm text-muted-foreground">{doc.footer.text}</p></div>
            <div className="grid gap-6 sm:grid-cols-2"><div><p className="mb-3 text-sm font-semibold">{t.navigation}</p>{doc.nav.map((l) => <Link key={l.href + l.label} href={l.href} className="block py-1.5 text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}</div><div><p className="mb-3 text-sm font-semibold">{t.links}</p>{linkItems.map((l) => <Link key={l.href + l.label} href={l.href} className="block py-1.5 text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}</div></div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4"><p className="text-sm font-semibold">Status</p><p className="mt-2 text-sm text-muted-foreground">All systems operational</p><Link href={contactHref(doc)} className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Contact support</Link></div>
          </div>
        </div>
      </footer>
    );
  }
  if (variant === 'centered') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
          {brandLink}
          <nav className="flex flex-wrap justify-center gap-4">
            {links.map((l) => <Link key={l.href + l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}
          </nav>
          <p className="text-xs text-muted-foreground">{doc.footer.text}</p>
        </div>
      </footer>
    );
  }
  if (variant === 'columns') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
          <div className="space-y-2">
            {brandLink}
            <p className="text-sm text-muted-foreground">{doc.footer.text}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t.navigation}</p>
            {doc.nav.map((l) => <Link key={l.href + l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t.links}</p>
            {links.map((l) => <Link key={l.href + l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}
          </div>
        </div>
      </footer>
    );
  }
  if (variant === 'newsletter') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-6 py-12 sm:grid-cols-2">
          <div className="space-y-2">
            {brandLink}
            <p className="text-sm text-muted-foreground">{doc.footer.text}</p>
          </div>
          <form action="/api/form" method="post" className="flex w-full gap-2">
            <input type="email" name="email" placeholder="you@example.com" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
            <button type="submit" className={chromeBtnClass(doc.footerBtnVariant ?? 'default', 'md', doc.authBtnRounded ?? 'lg')}>{t.subscribe}</button>
          </form>
        </div>
      </footer>
    );
  }
  // simple (default)
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <p className="text-sm text-muted-foreground">{doc.footer.text}</p>
        <nav className="flex flex-wrap items-center gap-4">
          {links.map((l) => <Link key={l.href + l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}

function Aside({ doc }: { doc: BuilderDoc }) {
  const style = doc.asideStyle || 'default';
  if (style === 'icons') {
    return (
      <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-border/60 bg-muted/20 py-4 lg:flex">
        <Link href={homeHref(doc)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground" title={doc.brand}>
          {doc.brand.charAt(0)}
        </Link>
        <nav className="mt-4 flex flex-col gap-2">
          {doc.nav.map((l) => (
            <Link key={l.href + l.label} href={l.href} title={l.label} className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {l.label.charAt(0)}
            </Link>
          ))}
        </nav>
      </aside>
    );
  }
  const width = style === 'compact' ? 'w-48' : 'w-60';
  return (
    <aside className={`hidden ${width} shrink-0 border-r border-border/60 bg-muted/20 p-4 lg:block`}>
      <Link href={homeHref(doc)} className="font-display text-lg font-black tracking-tight">{doc.brand}</Link>
      <nav className={`mt-6 flex flex-col ${style === 'compact' ? 'gap-0.5' : 'gap-1'}`}>
        {doc.nav.map((l) => (
          <Link key={l.href + l.label} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      {style !== 'compact' && showAuth(doc) && (
        <div className="mt-4">
          <SiteAuthButtons base={authBase(doc)} styles={authStyles(doc)} />
        </div>
      )}
    </aside>
  );
}

export function SiteChrome({ doc, children, t = RT_DEFAULT }: { doc: BuilderDoc; children: React.ReactNode; t?: SiteRtDict }) {
  const aside = doc.asideVariant && doc.asideVariant !== 'none' ? doc.asideVariant : null;
  // Site-wide button shape: page CTAs (marked .bn-btn) inherit the chrome
  // buttons' corner radius via globals.css, so the whole site reads as one
  // design language. Unset → buttons keep their default rounded-lg.
  const btnRound = doc.authBtnRounded || undefined;

  if (aside) {
    return (
      <div className="flex min-h-dvh" data-btn-round={btnRound}>
        {aside === 'left' && <Aside doc={doc} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header doc={doc} />
          <main className="flex-1">{children}</main>
          <Footer doc={doc} t={t} />
        </div>
        {aside === 'right' && <Aside doc={doc} />}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col" data-btn-round={btnRound}>
      <Header doc={doc} />
      <main className="flex-1">{children}</main>
      <Footer doc={doc} t={t} />
    </div>
  );
}
