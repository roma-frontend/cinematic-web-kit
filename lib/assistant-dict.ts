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
