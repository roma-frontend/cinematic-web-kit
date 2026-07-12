import { describe, it, expect } from 'vitest';
import {
  parseActionTag,
  stripActionTags,
  summarizeAction,
  canProposeAction,
  actionRoles,
} from '@/lib/assistant-action-tags';

describe('parseActionTag', () => {
  it('parses create_site from attributes (self-closing)', () => {
    expect(parseActionTag('hello <ACTION kind="create_site" name="Coffee" locale="ru" /> there')).toEqual({
      kind: 'create_site',
      name: 'Coffee',
      locale: 'ru',
    });
  });

  it('parses create_site from body tags', () => {
    expect(parseActionTag('<ACTION><kind>create_site</kind><name>Roast</name></ACTION>')).toEqual({
      kind: 'create_site',
      name: 'Roast',
      locale: undefined,
    });
  });

  it('ignores invalid locale and falls back to undefined', () => {
    expect(parseActionTag('<ACTION kind="create_site" name="X" locale="zz" />')).toEqual({
      kind: 'create_site',
      name: 'X',
      locale: undefined,
    });
  });

  it('parses publish_site from attributes', () => {
    expect(parseActionTag('<ACTION kind="publish_site" siteId="s_abc123" />')).toEqual({
      kind: 'publish_site',
      siteId: 's_abc123',
    });
  });

  it('parses publish_site from body tags', () => {
    expect(parseActionTag('<ACTION><kind>publish_site</kind><siteId>site_1</siteId></ACTION>')).toEqual({
      kind: 'publish_site',
      siteId: 'site_1',
    });
  });

  it('parses invite_site_user from attributes', () => {
    expect(parseActionTag('<ACTION kind="invite_site_user" siteId="s_1" email="a@x.com" name="Alex" />')).toEqual({
      kind: 'invite_site_user',
      siteId: 's_1',
      email: 'a@x.com',
      name: 'Alex',
    });
  });

  it('parses invite_member alias', () => {
    expect(parseActionTag('<ACTION kind="invite_member" siteId="s_1" email="b@x.com" />')).toEqual({
      kind: 'invite_site_user',
      siteId: 's_1',
      email: 'b@x.com',
      name: undefined,
    });
  });

  it('returns null for unknown action kind', () => {
    expect(parseActionTag('<ACTION kind="destroy_everything" />')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseActionTag('<ACTION kind="create_site" />')).toBeNull();
    expect(parseActionTag('<ACTION kind="publish_site" />')).toBeNull();
    expect(parseActionTag('<ACTION kind="invite_site_user" siteId="s_1" />')).toBeNull();
  });

  it('returns null for invalid email', () => {
    expect(parseActionTag('<ACTION kind="invite_site_user" siteId="s_1" email="not-an-email" />')).toBeNull();
  });

  it('takes only the first <ACTION> block', () => {
    const raw = '<ACTION kind="create_site" name="First" /><ACTION kind="create_site" name="Second" />';
    expect(parseActionTag(raw)).toEqual({ kind: 'create_site', name: 'First', locale: undefined });
  });
});

describe('stripActionTags', () => {
  it('removes closed <ACTION> blocks with attributes', () => {
    expect(stripActionTags('hello <ACTION kind="x">body</ACTION> world')).toBe('hello  world');
  });

  it('removes self-closing attribute blocks', () => {
    expect(stripActionTags('hello <ACTION kind="x" name="y" /> world')).toBe('hello  world');
  });

  it('removes dangling partial tags', () => {
    expect(stripActionTags('hello <ACTION kind="x"')).toBe('hello');
    expect(stripActionTags('hello <ACTION')).toBe('hello');
    expect(stripActionTags('hello </ACTION> world')).toBe('hello world');
  });

  it('returns clean text when no tags exist', () => {
    expect(stripActionTags('no tags here')).toBe('no tags here');
  });
});

describe('summarizeAction', () => {
  it('summarises each action kind in English', () => {
    expect(summarizeAction({ kind: 'create_site', name: 'Roast' }, 'en')).toContain('Create site');
    expect(summarizeAction({ kind: 'publish_site', siteId: 's_1' }, 'en')).toBe('Publish site');
    expect(summarizeAction({ kind: 'invite_site_user', siteId: 's_1', email: 'a@x.com' }, 'en')).toContain('Invite a@x.com');
  });

  it('localises into Russian', () => {
    expect(summarizeAction({ kind: 'create_site', name: 'Roast' }, 'ru')).toContain('Создать сайт');
    expect(summarizeAction({ kind: 'publish_site', siteId: 's_1' }, 'ru')).toBe('Опубликовать сайт');
  });

  it('localises into Armenian', () => {
    expect(summarizeAction({ kind: 'create_site', name: 'Roast' }, 'hy')).toContain('Ստեղծել');
    expect(summarizeAction({ kind: 'publish_site', siteId: 's_1' }, 'hy')).toContain('Հրապարակել');
  });
});

describe('canProposeAction / actionRoles', () => {
  it('lists roles for every action kind', () => {
    for (const kind of ['create_site', 'publish_site', 'invite_site_user'] as const) {
      expect(actionRoles(kind).length).toBeGreaterThan(0);
      expect(canProposeAction('customer', kind)).toBe(true);
      expect(canProposeAction('admin', kind)).toBe(true);
      expect(canProposeAction('superadmin', kind)).toBe(true);
    }
  });
});
