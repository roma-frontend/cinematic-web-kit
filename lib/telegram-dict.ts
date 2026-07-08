// i18n for the Telegram notifications settings page/panel (ru/en/hy).

import type { Locale } from '@/lib/seo';

type Category = 'registrations' | 'publishes' | 'submissions' | 'orgRequests' | 'subscriptions' | 'tickets' | 'security' | 'dailyDigest';

export interface TelegramDict {
  metaTitle: string;
  pageTitle: string;
  pageDesc: string;
  connected: string;
  notConnected: string;
  connectHint: string;
  enabled: string;
  disabled: string;
  refresh: string;
  credentials: string;
  botToken: string;
  tokenSavedPlaceholder: string;
  tokenPlaceholder: string;
  tokenFromEnv: string;
  tokenHint: string; // uses @BotFather
  chatId: string;
  chatIdPlaceholder: string;
  chatIdHint: string;
  notifTypes: string;
  save: string;
  sendTest: string;
  reportNow: string;
  saved: string;
  saveFailed: string;
  testSent: string;
  sendError: string;
  digestSent: string;
  digestDisabled: string;
  cat: Record<Category, { label: string; hint: string }>;
}

const ru: TelegramDict = {
  metaTitle: 'Уведомления Telegram — Builder Studio',
  pageTitle: 'Уведомления Telegram',
  pageDesc: 'Получайте события платформы в Telegram: регистрации, публикации, заявки, оплаты и события безопасности.',
  connected: 'Бот подключён',
  notConnected: 'Бот не подключён',
  connectHint: 'Введите токен бота и chat ID, затем сохраните.',
  enabled: 'Включено',
  disabled: 'Выключено',
  refresh: 'Обновить',
  credentials: 'Учётные данные',
  botToken: 'Токен бота',
  tokenSavedPlaceholder: '•••••••••• (сохранён)',
  tokenPlaceholder: '123456:ABC-DEF...',
  tokenFromEnv: 'Задан через переменную окружения TELEGRAM_BOT_TOKEN.',
  tokenHint: 'Получите у @BotFather. Оставьте пустым, чтобы не менять.',
  chatId: 'Chat ID',
  chatIdPlaceholder: 'напр. 123456789 или -1001234567890',
  chatIdHint: 'Личный чат, группа или канал. Напишите боту, затем узнайте ID.',
  notifTypes: 'Типы уведомлений',
  save: 'Сохранить',
  sendTest: 'Отправить тест',
  reportNow: 'Отчёт сейчас',
  saved: 'Настройки сохранены',
  saveFailed: 'Не удалось сохранить',
  testSent: 'Тестовое сообщение отправлено ✅',
  sendError: 'Ошибка отправки',
  digestSent: 'Ежедневный отчёт отправлен 📊',
  digestDisabled: 'Дайджест выключен в категориях',
  cat: {
    registrations: { label: 'Регистрации', hint: 'Новый пользователь платформы' },
    publishes: { label: 'Публикации', hint: 'Сайт опубликован' },
    submissions: { label: 'Заявки', hint: 'Отправка формы на сайте' },
    orgRequests: { label: 'Организации', hint: 'Запросы на создание/вступление' },
    subscriptions: { label: 'Подписки', hint: 'Оплаты и смена тарифа' },
    tickets: { label: 'Поддержка', hint: 'Новые обращения' },
    security: { label: 'Безопасность', hint: 'Критические события аудита' },
    dailyDigest: { label: 'Ежедневный отчёт', hint: 'Сводка каждый день в 21:00 (Ереван)' },
  },
};

const en: TelegramDict = {
  metaTitle: 'Telegram notifications — Builder Studio',
  pageTitle: 'Telegram notifications',
  pageDesc: 'Get platform events in Telegram: sign-ups, publishes, form leads, payments and security events.',
  connected: 'Bot connected',
  notConnected: 'Bot not connected',
  connectHint: 'Enter the bot token and chat ID, then save.',
  enabled: 'Enabled',
  disabled: 'Disabled',
  refresh: 'Refresh',
  credentials: 'Credentials',
  botToken: 'Bot token',
  tokenSavedPlaceholder: '•••••••••• (saved)',
  tokenPlaceholder: '123456:ABC-DEF...',
  tokenFromEnv: 'Set via the TELEGRAM_BOT_TOKEN environment variable.',
  tokenHint: 'Get one from @BotFather. Leave empty to keep the current token.',
  chatId: 'Chat ID',
  chatIdPlaceholder: 'e.g. 123456789 or -1001234567890',
  chatIdHint: 'A direct chat, group or channel. Message the bot, then look up the ID.',
  notifTypes: 'Notification types',
  save: 'Save',
  sendTest: 'Send test',
  reportNow: 'Report now',
  saved: 'Settings saved',
  saveFailed: 'Could not save',
  testSent: 'Test message sent ✅',
  sendError: 'Sending error',
  digestSent: 'Daily report sent 📊',
  digestDisabled: 'Digest is turned off in categories',
  cat: {
    registrations: { label: 'Sign-ups', hint: 'New platform user' },
    publishes: { label: 'Publishes', hint: 'A site went live' },
    submissions: { label: 'Leads', hint: 'A form was submitted on a site' },
    orgRequests: { label: 'Organizations', hint: 'Create / join requests' },
    subscriptions: { label: 'Subscriptions', hint: 'Payments and plan changes' },
    tickets: { label: 'Support', hint: 'New tickets' },
    security: { label: 'Security', hint: 'Critical audit events' },
    dailyDigest: { label: 'Daily report', hint: 'Summary every day at 21:00 (Yerevan)' },
  },
};

const hy: TelegramDict = {
  metaTitle: 'Telegram ծանուցումներ — Builder Studio',
  pageTitle: 'Telegram ծանուցումներ',
  pageDesc: 'Ստացեք հարթակի իրադարձությունները Telegram-ում՝ գրանցումներ, հրապարակումներ, հայտեր, վճարումներ և անվտանգության իրադարձություններ։',
  connected: 'Բոտը միացված է',
  notConnected: 'Բոտը միացված չէ',
  connectHint: 'Մուտքագրեք բոտի թոքենը և chat ID-ն, ապա պահպանեք։',
  enabled: 'Միացված',
  disabled: 'Անջատված',
  refresh: 'Թարմացնել',
  credentials: 'Մուտքի տվյալներ',
  botToken: 'Բոտի թոքեն',
  tokenSavedPlaceholder: '•••••••••• (պահպանված)',
  tokenPlaceholder: '123456:ABC-DEF...',
  tokenFromEnv: 'Սահմանված է TELEGRAM_BOT_TOKEN միջավայրի փոփոխականով։',
  tokenHint: 'Ստացեք @BotFather-ից։ Թողեք դատարկ՝ չփոխելու համար։',
  chatId: 'Chat ID',
  chatIdPlaceholder: 'օր․ 123456789 կամ -1001234567890',
  chatIdHint: 'Անձնական զրույց, խումբ կամ ալիք։ Գրեք բոտին, ապա իմացեք ID-ն։',
  notifTypes: 'Ծանուցումների տեսակներ',
  save: 'Պահպանել',
  sendTest: 'Ուղարկել թեստ',
  reportNow: 'Հաշվետվություն հիմա',
  saved: 'Կարգավորումները պահպանվեցին',
  saveFailed: 'Չհաջողվեց պահպանել',
  testSent: 'Թեստային հաղորդագրությունն ուղարկվեց ✅',
  sendError: 'Ուղարկման սխալ',
  digestSent: 'Օրվա հաշվետվությունն ուղարկվեց 📊',
  digestDisabled: 'Հաշվետվությունն անջատված է կատեգորիաներում',
  cat: {
    registrations: { label: 'Գրանցումներ', hint: 'Հարթակի նոր օգտատեր' },
    publishes: { label: 'Հրապարակումներ', hint: 'Կայքը հրապարակվեց' },
    submissions: { label: 'Հայտեր', hint: 'Կայքում ձևաթուղթ լրացվեց' },
    orgRequests: { label: 'Կազմակերպություններ', hint: 'Ստեղծման/միանալու հայտեր' },
    subscriptions: { label: 'Բաժանորդագրություններ', hint: 'Վճարումներ և սակագնի փոփոխություն' },
    tickets: { label: 'Աջակցություն', hint: 'Նոր դիմումներ' },
    security: { label: 'Անվտանգություն', hint: 'Աուդիտի կրիտիկական իրադարձություններ' },
    dailyDigest: { label: 'Օրվա հաշվետվություն', hint: 'Ամփոփում ամեն օր 21:00-ին (Երևան)' },
  },
};

const DICTS: Record<Locale, TelegramDict> = { ru, en, hy };

export function telegramDict(locale: Locale): TelegramDict {
  return DICTS[locale] ?? ru;
}
