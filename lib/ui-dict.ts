// Lightweight, dependency-free UI dictionaries (ru/en) for the shared chrome
// (header, footer, common actions). Landing marketing copy lives in
// data/landing[.en].json; per-tenant site content is data-driven and separate.
//
// Usage (client): const t = useUi();  t.actions.login
// Usage (server): const t = ui(await getLocale());

import type { Locale } from '@/lib/seo';

export type UiDict = {
  nav: {
    how: string;
    features: string;
    themes: string;
    examples: string;
    builder: string;
    studio: string;
    presets: string;
  };
  actions: {
    login: string;
    start: string;
    logout: string;
    dashboard: string;
    sites: string;
    account: string;
    allThemes: string;
  };
  roles: { superadmin: string; admin: string };
  header: { tagline: string; noName: string };
  a11y: { openMenu: string; closeMenu: string; language: string };
  examples: { badge: string; title: string; subtitle: string };
  active: string;
};

const ru: UiDict = {
  nav: {
    how: 'Как это работает',
    features: 'Возможности',
    themes: 'Темы',
    examples: 'Примеры',
    builder: 'Конструктор',
    studio: 'Студия',
    presets: 'Пресеты',
  },
  actions: {
    login: 'Войти',
    start: 'Начать',
    logout: 'Выйти',
    dashboard: 'Дашборд',
    sites: 'Мои сайты',
    account: 'Аккаунт',
    allThemes: 'Все темы',
  },
  roles: { superadmin: 'Суперадмин', admin: 'Админ' },
  header: { tagline: 'ИИ-конструктор сайтов', noName: 'Без имени' },
  a11y: { openMenu: 'Открыть меню', closeMenu: 'Закрыть меню', language: 'Язык' },
  examples: {
    badge: 'Сделано на платформе',
    title: 'Пример живого сайта',
    subtitle: 'Эти секции с ИИ-видео собраны прямо в Студии — так выглядит результат.',
  },
  active: 'активна',
};

const en: UiDict = {
  nav: {
    how: 'How it works',
    features: 'Features',
    themes: 'Themes',
    examples: 'Examples',
    builder: 'Builder',
    studio: 'Studio',
    presets: 'Presets',
  },
  actions: {
    login: 'Sign in',
    start: 'Get started',
    logout: 'Sign out',
    dashboard: 'Dashboard',
    sites: 'My sites',
    account: 'Account',
    allThemes: 'All themes',
  },
  roles: { superadmin: 'Superadmin', admin: 'Admin' },
  header: { tagline: 'AI website builder', noName: 'No name' },
  a11y: { openMenu: 'Open menu', closeMenu: 'Close menu', language: 'Language' },
  examples: {
    badge: 'Made on the platform',
    title: 'A live site example',
    subtitle: 'These AI-video sections were composed right in the Studio — this is the result.',
  },
  active: 'active',
};

export const UI: Record<Locale, UiDict> = { ru, en };

/** Dictionary for a locale. */
export function ui(locale: Locale): UiDict {
  return UI[locale];
}
