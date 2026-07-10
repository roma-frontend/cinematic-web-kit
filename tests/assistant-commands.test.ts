import { describe, it, expect } from 'vitest';
import {
  buildSlashCommands,
  filterCommands,
  parseSlashQuery,
  quickActionPrompt,
  pushInputHistory,
  QUICK_ACTIONS,
  type CommandLabels,
} from '@/lib/assistant-commands';

const labels: CommandLabels = {
  routes: {
    '/dashboard': 'Обзор',
    '/dashboard/submissions': 'Заявки',
    '/studio/builder': 'Конструктор',
    '/dashboard/super': 'Суперадмин',
  },
  data: { 'my-sites': 'Мои сайты', users: 'Пользователи', 'all-sites': 'Все сайты' },
  newChat: 'Новый чат',
  clearChat: 'Очистить чат',
  openVerb: 'Открыть',
  showVerb: 'Показать',
};

describe('buildSlashCommands', () => {
  it('always leads with new + clear chat commands', () => {
    const cmds = buildSlashCommands('customer', labels);
    expect(cmds[0].kind).toBe('new');
    expect(cmds[1].kind).toBe('clear');
  });

  it('gates routes and data by role', () => {
    const customer = buildSlashCommands('customer', labels);
    const superadmin = buildSlashCommands('superadmin', labels);
    // superadmin sees strictly more commands than a customer
    expect(superadmin.length).toBeGreaterThan(customer.length);
    // customer has no superadmin-only route
    expect(customer.some((c) => c.value === '/dashboard/super')).toBe(false);
    expect(superadmin.some((c) => c.value === '/dashboard/super')).toBe(true);
    // customer only gets the my-sites data set
    const customerData = customer.filter((c) => c.kind === 'data').map((c) => c.value);
    expect(customerData).toEqual(['my-sites']);
  });

  it('uses provided labels and falls back to the raw route otherwise', () => {
    const cmds = buildSlashCommands('customer', { ...labels, routes: {} });
    const nav = cmds.find((c) => c.value === '/dashboard');
    expect(nav?.label).toBe('/dashboard');
  });
});

describe('parseSlashQuery', () => {
  it('activates on a bare /token and lowercases it', () => {
    expect(parseSlashQuery('/Sub')).toEqual({ active: true, query: 'sub' });
    expect(parseSlashQuery('/')).toEqual({ active: true, query: '' });
  });
  it('deactivates once a space is typed or without a leading slash', () => {
    expect(parseSlashQuery('/go sites').active).toBe(false);
    expect(parseSlashQuery('hello').active).toBe(false);
    expect(parseSlashQuery(' /x').active).toBe(false);
  });
});

describe('filterCommands', () => {
  const cmds = buildSlashCommands('superadmin', labels);
  it('returns all commands for an empty query', () => {
    expect(filterCommands(cmds, '')).toHaveLength(cmds.length);
  });
  it('matches by label, route path and data key', () => {
    expect(filterCommands(cmds, 'заяв').some((c) => c.value === '/dashboard/submissions')).toBe(true);
    expect(filterCommands(cmds, 'submissions').some((c) => c.value === '/dashboard/submissions')).toBe(true);
    expect(filterCommands(cmds, 'my-sites').some((c) => c.value === 'my-sites')).toBe(true);
  });
  it('prioritises label prefix matches', () => {
    const res = filterCommands(cmds, 'нов'); // "Новый чат"
    expect(res[0].kind).toBe('new');
  });
  it('returns nothing when a token has no match', () => {
    expect(filterCommands(cmds, 'zzzznope')).toHaveLength(0);
  });
});

describe('quickActionPrompt', () => {
  it('returns a non-empty localized prompt for every action & locale', () => {
    for (const locale of ['ru', 'en', 'hy'] as const) {
      for (const action of QUICK_ACTIONS) {
        expect(quickActionPrompt(action, locale).length).toBeGreaterThan(3);
      }
    }
  });
  it('translate targets the opposite major language', () => {
    expect(quickActionPrompt('translate', 'ru')).toMatch(/англ/i);
    expect(quickActionPrompt('translate', 'en')).toMatch(/russian/i);
  });
  it('falls back to English for an unknown locale', () => {
    // @ts-expect-error intentional bad locale
    expect(quickActionPrompt('shorter', 'zz')).toBe(quickActionPrompt('shorter', 'en'));
  });
});

describe('pushInputHistory', () => {
  it('appends newest last and ignores blanks', () => {
    let h: string[] = [];
    h = pushInputHistory(h, 'a');
    h = pushInputHistory(h, '  ');
    h = pushInputHistory(h, 'b');
    expect(h).toEqual(['a', 'b']);
  });
  it('collapses duplicates by moving them to the end', () => {
    const h = pushInputHistory(['a', 'b'], 'a');
    expect(h).toEqual(['b', 'a']);
  });
  it('respects the capacity bound', () => {
    let h: string[] = [];
    for (let i = 0; i < 60; i++) h = pushInputHistory(h, `m${i}`, 50);
    expect(h).toHaveLength(50);
    expect(h[h.length - 1]).toBe('m59');
    expect(h[0]).toBe('m10');
  });
});
