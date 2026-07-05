import Link from 'next/link';
import type { BuilderDoc } from '@/lib/builder/types';
import { MobileNav } from './mobile-nav';
import { ScrollHeader } from './scroll-header';
import { SiteAuthButtons } from './site-auth-blocks';
import { SiteThemeToggle } from './site-theme-toggle';

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

export function Header({ doc }: { doc: BuilderDoc }) {
  const variant = doc.headerVariant || 'minimal';
  const home = homeHref(doc);
  const contact = contactHref(doc);
  const brand = (
    <Link href={home} className="font-display text-lg font-black tracking-tight">
      {doc.brand}
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
  const auth = showAuth(doc) ? <SiteAuthButtons base={authBase(doc)} /> : null;
  const themeToggle = <SiteThemeToggle />;
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
      {/* mobile / tablet bar — auth + theme toggle live inside the burger */}
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-6 md:hidden">
        {brand}
        <MobileNav links={doc.nav} authBase={authBase(doc)} showAuth={showAuth(doc)} />
      </div>
    </ScrollHeader>
  );
}

export function Footer({ doc }: { doc: BuilderDoc }) {
  const variant = doc.footerVariant || 'simple';
  const links = doc.footer.links;
  if (variant === 'centered') {
    return (
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
          <Link href={homeHref(doc)} className="font-display text-lg font-black">{doc.brand}</Link>
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
            <Link href={homeHref(doc)} className="font-display text-lg font-black">{doc.brand}</Link>
            <p className="text-sm text-muted-foreground">{doc.footer.text}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Навигация</p>
            {doc.nav.map((l) => <Link key={l.href + l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>)}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Ссылки</p>
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
            <Link href={homeHref(doc)} className="font-display text-lg font-black">{doc.brand}</Link>
            <p className="text-sm text-muted-foreground">{doc.footer.text}</p>
          </div>
          <form action="/api/form" method="post" className="flex w-full gap-2">
            <input type="email" name="email" placeholder="you@example.com" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Подписаться</button>
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
          <SiteAuthButtons base={authBase(doc)} />
        </div>
      )}
    </aside>
  );
}

export function SiteChrome({ doc, children }: { doc: BuilderDoc; children: React.ReactNode }) {
  const aside = doc.asideVariant && doc.asideVariant !== 'none' ? doc.asideVariant : null;

  if (aside) {
    return (
      <div className="flex min-h-dvh">
        {aside === 'left' && <Aside doc={doc} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header doc={doc} />
          <main className="flex-1">{children}</main>
          <Footer doc={doc} />
        </div>
        {aside === 'right' && <Aside doc={doc} />}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header doc={doc} />
      <main className="flex-1">{children}</main>
      <Footer doc={doc} />
    </div>
  );
}
