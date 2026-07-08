// i18n for the Telegram message CONTENT (event notifications + daily digest).
// Resolved with the superadmin's saved notification locale (see getNotifyLocale).

import type { Locale } from '@/lib/seo';

export interface NotifyDict {
  headers: {
    registration: string;
    sitePublished: string;
    submission: string;
    orgRequest: string;
    subscription: string;
    ticket: string;
  };
  labels: {
    who: string; object: string; details: string; action: string;
    name: string; email: string; role: string;
    title: string; address: string; owner: string;
    site: string; form: string;
    type: string; from: string; org: string; message: string;
    client: string; plan: string; period: string; amount: string; status: string;
    subject: string; author: string;
    Name: string; Email: string; Phone: string; Message: string; Subject: string;
  };
  footers: {
    users: string; allSites: string; submissions: string; organizations: string; billing: string; control: string;
  };
  orgType: { create: string; join: string };
  subStatus: { trial: string; active: string };
  noSubject: string;
  criticalActions: Record<string, string>;
  digest: {
    title: string;
    last24h: string;
    totals: string;
    regs: string; newSites: string; publishes: string; submissions: string; logins: string;
    users: string; sites: string; published: string; leads: string;
    hotSites: string; siteLeads: string; // siteLeads: "{n} leads"
    control: string;
  };
}

const ru: NotifyDict = {
  headers: {
    registration: '🎉 Новый пользователь',
    sitePublished: '🚀 Опубликован сайт',
    submission: '📨 Новая заявка с формы',
    orgRequest: '🏢 Заявка на организацию',
    subscription: '💳 Подписка',
    ticket: '🎫 Новое обращение в поддержку',
  },
  labels: {
    who: 'Кто', object: 'Объект', details: 'Детали', action: 'Действие',
    name: 'Имя', email: 'Email', role: 'Роль',
    title: 'Название', address: 'Адрес', owner: 'Владелец',
    site: 'Сайт', form: 'Форма',
    type: 'Тип', from: 'От', org: 'Организация', message: 'Сообщение',
    client: 'Клиент', plan: 'Тариф', period: 'Период', amount: 'Сумма', status: 'Статус',
    subject: 'Тема', author: 'Автор',
    Name: 'Имя', Email: 'Email', Phone: 'Телефон', Message: 'Сообщение', Subject: 'Тема',
  },
  footers: {
    users: '👥 Пользователи', allSites: '🌐 Все сайты', submissions: '📥 Заявки',
    organizations: '🏢 Организации', billing: '📊 Биллинг', control: '🛡 Центр управления',
  },
  orgType: { create: 'создание', join: 'вступление' },
  subStatus: { trial: 'триал', active: 'активна' },
  noSubject: '(без темы)',
  criticalActions: {
    'user.suspend': '🚫 Пользователь заблокирован',
    'user.activate': '✅ Пользователь разблокирован',
    'user.delete': '🗑 Пользователь удалён',
    'role.change': '👑 Изменена роль',
    'impersonate': '🎭 Вход под пользователем',
    'sessions.revoke_user': '🔒 Отозваны все сессии',
    'site.delete': '🗑 Удалён сайт',
    'db.export': '💾 Скачан файл БД',
    'data.snapshot': '💾 Снят JSON-снапшот БД',
    'auth.lockout': '🔐 Аккаунт заблокирован на 15 мин (перебор пароля)',
    'auth.password_reset': '🔑 Пароль сброшен по email-ссылке',
  },
  digest: {
    title: '📊 Ежедневный отчёт — Builder Studio',
    last24h: 'За последние 24 часа',
    totals: 'Всего на платформе',
    regs: 'Регистрации', newSites: 'Новые сайты', publishes: 'Публикации', submissions: 'Заявки с форм', logins: 'Входы',
    users: 'Пользователи', sites: 'Сайты', published: 'опубликовано', leads: 'Заявки',
    hotSites: '🔥 Активные сайты (24ч)', siteLeads: '{n} заявок',
    control: '🛡 Центр управления',
  },
};

const en: NotifyDict = {
  headers: {
    registration: '🎉 New user',
    sitePublished: '🚀 Site published',
    submission: '📨 New form lead',
    orgRequest: '🏢 Organization request',
    subscription: '💳 Subscription',
    ticket: '🎫 New support ticket',
  },
  labels: {
    who: 'Who', object: 'Object', details: 'Details', action: 'Action',
    name: 'Name', email: 'Email', role: 'Role',
    title: 'Name', address: 'Address', owner: 'Owner',
    site: 'Site', form: 'Form',
    type: 'Type', from: 'From', org: 'Organization', message: 'Message',
    client: 'Customer', plan: 'Plan', period: 'Period', amount: 'Amount', status: 'Status',
    subject: 'Subject', author: 'Author',
    Name: 'Name', Email: 'Email', Phone: 'Phone', Message: 'Message', Subject: 'Subject',
  },
  footers: {
    users: '👥 Users', allSites: '🌐 All sites', submissions: '📥 Leads',
    organizations: '🏢 Organizations', billing: '📊 Billing', control: '🛡 Control Center',
  },
  orgType: { create: 'create', join: 'join' },
  subStatus: { trial: 'trial', active: 'active' },
  noSubject: '(no subject)',
  criticalActions: {
    'user.suspend': '🚫 User suspended',
    'user.activate': '✅ User reactivated',
    'user.delete': '🗑 User deleted',
    'role.change': '👑 Role changed',
    'impersonate': '🎭 Impersonation started',
    'sessions.revoke_user': '🔒 All sessions revoked',
    'site.delete': '🗑 Site deleted',
    'db.export': '💾 Database file downloaded',
    'data.snapshot': '💾 JSON DB snapshot taken',
    'auth.lockout': '🔐 Account locked for 15 min (password brute-force)',
    'auth.password_reset': '🔑 Password reset via email link',
  },
  digest: {
    title: '📊 Daily report — Builder Studio',
    last24h: 'Last 24 hours',
    totals: 'Platform totals',
    regs: 'Sign-ups', newSites: 'New sites', publishes: 'Publishes', submissions: 'Form leads', logins: 'Logins',
    users: 'Users', sites: 'Sites', published: 'published', leads: 'Leads',
    hotSites: '🔥 Active sites (24h)', siteLeads: '{n} leads',
    control: '🛡 Control Center',
  },
};

const hy: NotifyDict = {
  headers: {
    registration: '🎉 Նոր օգտատեր',
    sitePublished: '🚀 Կայքը հրապարակվեց',
    submission: '📨 Նոր հայտ ձևից',
    orgRequest: '🏢 Կազմակերպության հայտ',
    subscription: '💳 Բաժանորդագրություն',
    ticket: '🎫 Նոր դիմում աջակցությանը',
  },
  labels: {
    who: 'Ով', object: 'Օբյեկտ', details: 'Մանրամասներ', action: 'Գործողություն',
    name: 'Անուն', email: 'Email', role: 'Դեր',
    title: 'Անվանում', address: 'Հասցե', owner: 'Սեփականատեր',
    site: 'Կայք', form: 'Ձև',
    type: 'Տեսակ', from: 'Ումից', org: 'Կազմակերպություն', message: 'Հաղորդագրություն',
    client: 'Հաճախորդ', plan: 'Սակագին', period: 'Ժամանակահատված', amount: 'Գումար', status: 'Կարգավիճակ',
    subject: 'Թեմա', author: 'Հեղինակ',
    Name: 'Անուն', Email: 'Email', Phone: 'Հեռախոս', Message: 'Հաղորդագրություն', Subject: 'Թեմա',
  },
  footers: {
    users: '👥 Օգտատերեր', allSites: '🌐 Բոլոր կայքերը', submissions: '📥 Հայտեր',
    organizations: '🏢 Կազմակերպություններ', billing: '📊 Վճարումներ', control: '🛡 Կառավարման կենտրոն',
  },
  orgType: { create: 'ստեղծում', join: 'միանալ' },
  subStatus: { trial: 'փորձնական', active: 'ակտիվ' },
  noSubject: '(առանց թեմայի)',
  criticalActions: {
    'user.suspend': '🚫 Օգտատերը արգելափակված է',
    'user.activate': '✅ Օգտատերը ապաարգելափակված է',
    'user.delete': '🗑 Օգտատերը ջնջված է',
    'role.change': '👑 Դերը փոփոխվել է',
    'impersonate': '🎭 Մուտք օգտատիրոջ անունից',
    'sessions.revoke_user': '🔒 Բոլոր սեսիաները չեղարկվել են',
    'site.delete': '🗑 Կայքը ջնջված է',
    'db.export': '💾 ԲԴ ֆայլը ներբեռնվել է',
    'data.snapshot': '💾 JSON ԲԴ նկար է վերցվել',
    'auth.lockout': '🔐 Հաշիվն արգելափակվեց 15 րոպեով (գաղտնաբառի փորձեր)',
    'auth.password_reset': '🔑 Գաղտնաբառը վերականգնվել է email հղումով',
  },
  digest: {
    title: '📊 Օրվա հաշվետվություն — Builder Studio',
    last24h: 'Վերջին 24 ժամում',
    totals: 'Ընդհանուր հարթակում',
    regs: 'Գրանցումներ', newSites: 'Նոր կայքեր', publishes: 'Հրապարակումներ', submissions: 'Հայտեր ձևից', logins: 'Մուտքեր',
    users: 'Օգտատերեր', sites: 'Կայքեր', published: 'հրապարակված', leads: 'Հայտեր',
    hotSites: '🔥 Ակտիվ կայքեր (24ժ)', siteLeads: '{n} հայտ',
    control: '🛡 Կառավարման կենտրոն',
  },
};

const DICTS: Record<Locale, NotifyDict> = { ru, en, hy };

export function notifyDict(locale: Locale): NotifyDict {
  return DICTS[locale] ?? ru;
}
