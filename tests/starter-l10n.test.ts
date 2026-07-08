import { describe, it, expect, beforeEach } from 'vitest';
import { createSite, parseDoc } from '@/lib/sites';
import { createUser } from '@/lib/auth';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function txt(doc: any): string {
  return JSON.stringify(doc);
}

describe('createSite localization', () => {
  it('ru keeps original demo content + all 3 primary pages', () => {
    const u = createUser('a@b.com', 'password123', 'A');
    const doc = parseDoc(createSite(u.id, 'My Site', 'ru').draftDoc)!;
    const paths = doc.pages.map((p) => p.path);
    expect(paths).toContain('');
    expect(paths).toContain('about');
    expect(paths).toContain('contact');
    // no preset pages leaked in
    expect(paths).not.toContain('home-2');
    expect(txt(doc)).toContain('Создайте сайт, который впечатляет');
    expect(doc.brand).toBe('My Site');
  });

  it('en localizes headings, nav, features and faq', () => {
    const u = createUser('c@d.com', 'password123', 'C');
    const doc = parseDoc(createSite(u.id, 'My Site', 'en').draftDoc)!;
    const s = txt(doc);
    expect(s).toContain('Create a website that impresses');
    expect(s).toContain('Everything you need for a website');
    expect(s).toContain('◆ Sections and blocks');
    expect(s).toContain('Ready to build your website?');
    expect(s).not.toContain('Создайте сайт');
    expect(doc.nav.map((n) => n.label)).toEqual(['Home', 'About', 'Contacts']);
  });

  it('hy localizes the hero heading', () => {
    const u = createUser('e@f.com', 'password123', 'E');
    const doc = parseDoc(createSite(u.id, 'My Site', 'hy').draftDoc)!;
    expect(txt(doc)).toContain('Ստեղծեք կայք, որ տպավորում է');
  });
});
