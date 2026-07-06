import Link from 'next/link';
import type { BuilderDoc } from '@/lib/builder/types';
import { chromeBtnClass, type ChromeBtnStyles } from '@/lib/builder/chrome-buttons';
import { MobileNav } from './mobile-nav';
import { ScrollHeader } from './scroll-header';
import { SiteAuthButtons } from './site-auth-blocks';
import { SiteThemeToggle } from './site-theme-toggle';
import { siteRt, type SiteRtDict } from '@/lib/site-runtime-dict';

const RT_DEFAULT = siteRt('ru');

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
  const home = homeHref(doc);
  const brand = (
    <Link href={home} className="inline-flex items-center" aria-label={doc.brand}>
      <BrandInner doc={doc} />
    </Link>
  );
  const nav = (
    <nav className="hidden flex-wrap items-center gap-1 md:flex lg:gap-2">
      {doc.nav.map((l) => (
        <Link key={l.href + l.label} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {l.label}
        </Link>
      ))}
    </nav>
  );
  const auth = showAuth(doc) ? <SiteAuthButtons base={authBase(doc)} styles={authStyles(doc)} /> : null;
  const themeToggle = <SiteThemeToggle siteId={doc.siteId ?? ''} />;
  void contactHref;

  const shell = 'sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md';
  void shell;

  let desktop: React.ReactNode;
  if (variant === 'centered') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-6xl flex-col items-center gap-2 px-6 py-3 md:flex">
        {brand}
        <div className="flex items-center gap-3">{nav}{auth}{themeToggle}</div>
      </div>
    );
  } else if (variant === 'split') {
    desktop = (
      <div className="mx-auto hidden w-full max-w-6xl grid-cols-3 items-center px-6 py-3 md:grid">
        <div className="justify-self-start">{nav}</div>
        <div className="justify-self-center">{brand}</div>
        <div className="flex items-center gap-2 justify-self-end">{auth}{themeToggle}</div>
      </div>
    );
  } else if (variant === 'cta') {
    desktop = (
      <div className="mx-auto hidden h-16 w-full max-w-6xl items-center justify-between px-6 md:flex">
        {brand}
        <div className="flex items-center gap-3">
          {nav}
          {auth}
          {themeToggle}
        </div>
      </div>
    );
  } else {
    desktop = (
      <div className="mx-auto hidden h-16 w-full max-w-6xl items-center justify-between px-6 md:flex">
        {brand}
        <div className="flex items-center gap-3">{nav}{auth}{themeToggle}</div>
      </div>
    );
  }

  return (
    <ScrollHeader behavior={doc.headerBehavior || 'solid'}>
      {desktop}
      {/* mobile / tablet bar — theme toggle always visible, auth lives in the burger */}
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-6 md:hidden">
        {brand}
        <div className="flex items-center gap-2">
          {themeToggle}
          <MobileNav links={doc.nav} authBase={authBase(doc)} showAuth={showAuth(doc)} authStyles={authStyles(doc)} />
        </div>
      </div>
    </ScrollHeader>
  );
}

export function Footer({ doc, t = RT_DEFAULT }: { doc: BuilderDoc; t?: SiteRtDict }) {
  const variant = doc.footerVariant || 'simple';
  const links = doc.footer.links;
  if (variant === 'centered') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
          <Link href={homeHref(doc)} className="inline-flex items-center" aria-label={doc.brand}><BrandInner doc={doc} /></Link>
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
            <Link href={homeHref(doc)} className="inline-flex items-center" aria-label={doc.brand}><BrandInner doc={doc} /></Link>
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
            <Link href={homeHref(doc)} className="inline-flex items-center" aria-label={doc.brand}><BrandInner doc={doc} /></Link>
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

  if (aside) {
    return (
      <div className="flex min-h-dvh">
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
    <div className="flex min-h-dvh flex-col">
      <Header doc={doc} />
      <main className="flex-1">{children}</main>
      <Footer doc={doc} t={t} />
    </div>
  );
}
