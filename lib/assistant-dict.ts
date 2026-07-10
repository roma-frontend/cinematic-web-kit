import type { Locale } from '@/lib/seo';

// UI strings + starter suggestions for the Studio Assistant widget (ru/en/hy).
// Named *-dict.ts so it's excluded from coverage (static i18n data).

type Role = 'customer' | 'admin' | 'superadmin';

export interface AssistantDict {
  title: string;
  subtitle: string;
  open: string;
  close: string;
  expand: string;
  collapse: string;
  placeholder: string;
  send: string;
  listening: string;
  voice: string;
  clear: string;
  greeting: string;
  unavailable: string;
  error: string;
  poweredBy: string;
  newChat: string;
  history: string;
  emptyHistory: string;
  renameAction: string;
  deleteAction: string;
  undo: string;
  deletingIn: string; // contains {n}
  save: string;
  cancel: string;
  edit: string;
  copy: string;
  copied: string;
  goTo: string;
  stop: string;
  regenerate: string;
  searchHistory: string;
  noMatches: string;
  newMessages: string;
  groupToday: string;
  groupWeek: string;
  groupOlder: string;
  // Phase 1 additions
  commandsTitle: string;
  cmdOpen: string;
  cmdShow: string;
  cmdRoutes: Record<string, string>;
  cmdData: Record<string, string>;
  quick: { shorter: string; longer: string; simplify: string; translate: string; continue: string };
  statusThinking: string;
  statusWriting: string;
  shiftEnterHint: string;
  loadingChat: string;
  examplesTitle: string;
  starters: Record<Role, string[]>;
}

const ru: AssistantDict = {
  title: 'Studio-ассистент',
  subtitle: 'Помогу собрать и опубликовать сайт',
  open: 'Открыть ассистента',
  close: 'Закрыть',
  expand: 'Во весь экран',
  collapse: 'Свернуть',
  placeholder: 'Спросите что угодно о конструкторе…',
  send: 'Отправить',
  listening: 'Слушаю…',
  voice: 'Голосовой ввод',
  clear: 'Очистить чат',
  greeting: 'Привет! Я помогу с темами, пресетами, генерацией страниц и публикацией. С чего начнём?',
  unavailable: 'Ассистент пока не настроен (нужен ключ LLM). Обратитесь к администратору.',
  error: 'Не удалось получить ответ. Попробуйте ещё раз.',
  poweredBy: 'на базе ИИ',
  newChat: 'Новый чат',
  history: 'История',
  emptyHistory: 'Пока нет переписок',
  renameAction: 'Переименовать',
  deleteAction: 'Удалить',
  undo: 'Отменить',
  deletingIn: 'Удаление через {n}с',
  save: 'Сохранить',
  cancel: 'Отмена',
  edit: 'Редактировать',
  copy: 'Копировать',
  copied: 'Скопировано',
  goTo: 'Перейти',
  stop: 'Остановить',
  regenerate: 'Сгенерировать заново',
  searchHistory: 'Поиск по чатам…',
  noMatches: 'Ничего не найдено',
  newMessages: 'Новые сообщения',
  groupToday: 'Сегодня',
  groupWeek: 'Последние 7 дней',
  groupOlder: 'Ранее',
  commandsTitle: 'Команды',
  cmdOpen: 'Открыть',
  cmdShow: 'Показать',
  cmdRoutes: {
    '/dashboard': 'Обзор', '/dashboard/sites': 'Мои сайты', '/dashboard/submissions': 'Заявки',
    '/dashboard/account': 'Аккаунт', '/dashboard/billing': 'Подписка', '/studio/builder': 'Конструктор',
    '/presets': 'Пресеты', '/themes': 'Темы', '/vitals': 'Показатели', '/dashboard/staff': 'Персонал',
    '/dashboard/users': 'Пользователи', '/dashboard/all-sites': 'Все сайты', '/dashboard/audit': 'Аудит',
    '/dashboard/super': 'Суперадмин', '/dashboard/organizations': 'Организации', '/dashboard/database': 'База данных',
    '/dashboard/access': 'Доступы', '/dashboard/activity': 'Активность', '/dashboard/trash': 'Корзина',
    '/dashboard/control': 'Панель управления', '/dashboard/billing-admin': 'Биллинг (админ)', '/studio': 'Студия',
  },
  cmdData: { 'my-sites': 'Мои сайты', users: 'Пользователи', 'all-sites': 'Все сайты' },
  quick: { shorter: 'Короче', longer: 'Подробнее', simplify: 'Проще', translate: 'Перевести', continue: 'Продолжить' },
  statusThinking: 'Думаю…',
  statusWriting: 'Печатаю…',
  shiftEnterHint: 'Enter — отправить · Shift+Enter — перенос · / — команды',
  loadingChat: 'Загружаю переписку…',
  examplesTitle: 'С чего начнём?',
  starters: {
    customer: [
      '✨ Как создать сайт?',
      '🎨 Подобрать тему',
      '🎬 Сгенерировать видео-герой',
      '🚀 Как опубликовать сайт?',
    ],
    admin: [
      '✨ Как создать сайт?',
      '🌐 Показать все сайты',
      '👥 Управление пользователями',
      '🚀 Как опубликовать сайт?',
    ],
    superadmin: [
      '🎬 Открыть студию',
      '🌐 Все сайты платформы',
      '🏢 Организации',
      '👑 Панель управления',
    ],
  },
};

const en: AssistantDict = {
  title: 'Studio Assistant',
  subtitle: 'I help you build & publish your site',
  open: 'Open assistant',
  close: 'Close',
  expand: 'Fullscreen',
  collapse: 'Shrink',
  placeholder: 'Ask anything about the builder…',
  send: 'Send',
  listening: 'Listening…',
  voice: 'Voice input',
  clear: 'Clear chat',
  greeting: "Hi! I can help with themes, presets, page generation and publishing. Where do we start?",
  unavailable: 'The assistant is not configured yet (needs an LLM key). Contact your admin.',
  error: 'Could not get a response. Please try again.',
  poweredBy: 'AI-powered',
  newChat: 'New chat',
  history: 'History',
  emptyHistory: 'No conversations yet',
  renameAction: 'Rename',
  deleteAction: 'Delete',
  undo: 'Undo',
  deletingIn: 'Deleting in {n}s',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  copy: 'Copy',
  copied: 'Copied',
  goTo: 'Go to',
  stop: 'Stop',
  regenerate: 'Regenerate',
  searchHistory: 'Search chats…',
  noMatches: 'No matches',
  newMessages: 'New messages',
  groupToday: 'Today',
  groupWeek: 'Previous 7 days',
  groupOlder: 'Older',
  commandsTitle: 'Commands',
  cmdOpen: 'Open',
  cmdShow: 'Show',
  cmdRoutes: {
    '/dashboard': 'Overview', '/dashboard/sites': 'My sites', '/dashboard/submissions': 'Leads',
    '/dashboard/account': 'Account', '/dashboard/billing': 'Subscription', '/studio/builder': 'Builder',
    '/presets': 'Presets', '/themes': 'Themes', '/vitals': 'Vitals', '/dashboard/staff': 'Staff',
    '/dashboard/users': 'Users', '/dashboard/all-sites': 'All sites', '/dashboard/audit': 'Audit',
    '/dashboard/super': 'Superadmin', '/dashboard/organizations': 'Organizations', '/dashboard/database': 'Database',
    '/dashboard/access': 'Access', '/dashboard/activity': 'Activity', '/dashboard/trash': 'Trash',
    '/dashboard/control': 'Control center', '/dashboard/billing-admin': 'Billing (admin)', '/studio': 'Studio',
  },
  cmdData: { 'my-sites': 'My sites', users: 'Users', 'all-sites': 'All sites' },
  quick: { shorter: 'Shorter', longer: 'Longer', simplify: 'Simpler', translate: 'Translate', continue: 'Continue' },
  statusThinking: 'Thinking…',
  statusWriting: 'Typing…',
  shiftEnterHint: 'Enter to send · Shift+Enter for newline · / for commands',
  loadingChat: 'Loading conversation…',
  examplesTitle: 'Where do we start?',
  starters: {
    customer: [
      '✨ How do I create a site?',
      '🎨 Pick a theme',
      '🎬 Generate a video hero',
      '🚀 How do I publish?',
    ],
    admin: [
      '✨ How do I create a site?',
      '🌐 Show all sites',
      '👥 Manage users',
      '🚀 How do I publish?',
    ],
    superadmin: [
      '🎬 Open the studio',
      '🌐 All platform sites',
      '🏢 Organizations',
      '👑 Control center',
    ],
  },
};

const hy: AssistantDict = {
  title: 'Studio օգնական',
  subtitle: 'Կօգնեմ կառուցել և հրապարակել կայքը',
  open: 'Բացել օգնականը',
  close: 'Փակել',
  expand: 'Ամբողջ էկրան',
  collapse: 'Փոքրացնել',
  placeholder: 'Հարցրու ցանկացած բան կոնստրուկտորի մասին…',
  send: 'Ուղարկել',
  listening: 'Լսում եմ…',
  voice: 'Ձայնային մուտք',
  clear: 'Մաքրել զրույցը',
  greeting: 'Բարև։ Կօգնեմ թեմաների, պրեսետների, էջերի գեներացիայի և հրապարակման հարցում։ Որտեղի՞ց սկսենք։',
  unavailable: 'Օգնականը դեռ կարգավորված չէ (անհրաժեշտ է LLM բանալի)։ Դիմեք ադմինիստրատորին։',
  error: 'Չհաջողվեց ստանալ պատասխան։ Փորձեք կրկին։',
  poweredBy: 'ԱԲ-ի հիման վրա',
  newChat: 'Նոր զրույց',
  history: 'Պատմություն',
  emptyHistory: 'Դեռ զրույցներ չկան',
  renameAction: 'Վերանվանել',
  deleteAction: 'Ջնջել',
  undo: 'Հետարկել',
  deletingIn: 'Ջնջում {n}վրկ-ից',
  save: 'Պահպանել',
  cancel: 'Չեղարկել',
  edit: 'Խմբագրել',
  copy: 'Պատճենել',
  copied: 'Պատճենվեց',
  goTo: 'Անցնել',
  stop: 'Կանգնեցնել',
  regenerate: 'Վերագեներացնել',
  searchHistory: 'Փնտրել զրույցներում…',
  noMatches: 'Ոչինչ չգտնվեց',
  newMessages: 'Նոր հաղորդագրություններ',
  groupToday: 'Այսօր',
  groupWeek: 'Վերջին 7 օրը',
  groupOlder: 'Ավելի վաղ',
  commandsTitle: 'Հրամաններ',
  cmdOpen: 'Բացել',
  cmdShow: 'Ցույց տալ',
  cmdRoutes: {
    '/dashboard': 'Ակնարկ', '/dashboard/sites': 'Իմ կայքերը', '/dashboard/submissions': 'Հայտեր',
    '/dashboard/account': 'Հաշիվ', '/dashboard/billing': 'Բաժանորդագրություն', '/studio/builder': 'Կառուցիչ',
    '/presets': 'Պրեսեթներ', '/themes': 'Թեմաներ', '/vitals': 'Ցուցանիշներ', '/dashboard/staff': 'Անձնակազմ',
    '/dashboard/users': 'Օգտատերեր', '/dashboard/all-sites': 'Բոլոր կայքերը', '/dashboard/audit': 'Աուդիտ',
    '/dashboard/super': 'Սուպերադմին', '/dashboard/organizations': 'Կազմակերպություններ', '/dashboard/database': 'Տվյալների բազա',
    '/dashboard/access': 'Հասանելիություն', '/dashboard/activity': 'Ակտիվություն', '/dashboard/trash': 'Աղբարկղ',
    '/dashboard/control': 'Կառավարման վահանակ', '/dashboard/billing-admin': 'Բիլինգ (ադմին)', '/studio': 'Ստուդիա',
  },
  cmdData: { 'my-sites': 'Իմ կայքերը', users: 'Օգտատերեր', 'all-sites': 'Բոլոր կայքերը' },
  quick: { shorter: 'Կարճ', longer: 'Մանրամասն', simplify: 'Պարզ', translate: 'Թարգմանել', continue: 'Շարունակել' },
  statusThinking: 'Մտածում եմ…',
  statusWriting: 'Գրում եմ…',
  shiftEnterHint: 'Enter — ուղարկել · Shift+Enter — նոր տող · / — հրամաններ',
  loadingChat: 'Բեռնում եմ զրույցը…',
  examplesTitle: 'Որտեղի՞ց սկսենք',
  starters: {
    customer: [
      '✨ Ինչպե՞ս ստեղծել կայք',
      '🎨 Ընտրել թեմա',
      '🎬 Գեներացնել վիդեո-հերո',
      '🚀 Ինչպե՞ս հրապարակել',
    ],
    admin: [
      '✨ Ինչպե՞ս ստեղծել կայք',
      '🌐 Բոլոր կայքերը',
      '👥 Օգտատերերի կառավարում',
      '🚀 Ինչպե՞ս հրապարակել',
    ],
    superadmin: [
      '🎬 Բացել ստուդիան',
      '🌐 Հարթակի բոլոր կայքերը',
      '🏢 Կազմակերպություններ',
      '👑 Կառավարման վահանակ',
    ],
  },
};

const DICTS: Record<Locale, AssistantDict> = { ru, en, hy };

export function assistantDict(locale: Locale): AssistantDict {
  return DICTS[locale] ?? en;
}
