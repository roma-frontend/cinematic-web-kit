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
  searchResults: string;
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
  statusFetching: string;
  shiftEnterHint: string;
  loadingChat: string;
  examplesTitle: string;
  mentionTitle: string;
  // Memory
  memory: string;
  memoryTitle: string;
  memoryEmpty: string;
  memoryHint: string;
  memoryClear: string;
  remembered: string;
  forget: string;
  sources: string;
  toolCalls: string;
  messagesUsed: string;
  generateImage: string;
  imagePrompt: string;
  imageGenerating: string;
  webSearch: string;
  webSearchResults: string;
  artifact: string;
  artifactPreview: string;
  artifactCode: string;
  shareConversation: string;
  shareCopied: string;
  shareLink: string;
  shareLinkDescription: string;
  feedbackGood: string;
  feedbackBad: string;
  feedbackReason: string;
  feedbackSent: string;
  // Action confirmation
  proposedAction: string;
  confirmAction: string;
  actionProceed: string;
  actionSuccess: string;
  actionFailed: string;
  actionCancelled: string;
  actionNetworkError: string;
  openResult: string;
  // Canvas workspace (fullscreen side panel)
  canvasTitle: string;
  canvasEmpty: string;
  canvasPreview: string;
  canvasData: string;
  canvasThemeDiff: string;
  canvasClose: string;
  canvasApply: string;
  canvasRollback: string;
  canvasCurrentTheme: string;
  canvasProposedTheme: string;
  canvasLivePreview: string;
  canvasDataTable: string;
  canvasOpenPreview: string;
  canvasHint: string;
  exportChat: string;
  pin: string;
  pinned: string;
  shortcuts: string;
  shortcutToggle: string;
  shortcutClose: string;
  shortcutSend: string;
  shortcutNewline: string;
  shortcutCommands: string;
  shortcutMentions: string;
  shortcutHistory: string;
  shortcutHelp: string;
  speak: string;
  stopSpeaking: string;
  fork: string;
  customInstructions: string;
  customInstructionsHint: string;
  dropHere: string;
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
  searchResults: 'Результаты поиска',
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
  statusThinking: 'Думает…',
  statusWriting: 'Пишет…',
  statusFetching: 'Ищет данные…',
  shiftEnterHint: 'Enter — отправить · Shift+Enter — перенос · / — команды · @ — упоминание',
  loadingChat: 'Загружаю переписку…',
  examplesTitle: 'С чего начнём?',
  mentionTitle: 'Упомянуть',
  memory: 'Память',
  memoryTitle: 'Что ассистент запомнил',
  memoryEmpty: 'Пока ничего не запомнено. Расскажите о своём бизнесе или предпочтениях — и я буду это учитывать.',
  memoryHint: 'Эти факты подмешиваются в ответы, чтобы ассистент вас помнил.',
  memoryClear: 'Очистить всё',
  remembered: 'Запомнил',
  forget: 'Забыть',
  sources: 'Источники',
  toolCalls: 'Инструменты',
  messagesUsed: 'сообщений использовано',
  generateImage: 'Сгенерировать изображение',
  imagePrompt: 'Опишите изображение...',
  imageGenerating: 'Генерация изображения...',
  webSearch: 'Поиск в интернете',
  webSearchResults: 'Результаты поиска',
  artifact: 'Артефакт',
  artifactPreview: 'Предпросмотр',
  artifactCode: 'Код',
  shareConversation: 'Поделиться диалогом',
  shareCopied: 'Ссылка скопирована',
  shareLink: 'Ссылка на диалог',
  shareLinkDescription: 'Скопируйте ссылку, чтобы поделиться этим диалогом. Любой, у кого есть ссылка, сможет его просмотреть.',
  feedbackGood: 'Хороший ответ',
  feedbackBad: 'Плохой ответ',
  feedbackReason: 'Что пошло не так?',
  feedbackSent: 'Спасибо за фидбек',
  proposedAction: 'Предложенное действие',
  confirmAction: 'Подтвердить',
  actionProceed: 'Выполнить',
  actionSuccess: 'Готово',
  actionFailed: 'Не удалось выполнить',
  actionCancelled: 'Отменено',
  actionNetworkError: 'Ошибка связи',
  openResult: 'Открыть',
  canvasTitle: 'Рабочая область',
  canvasEmpty: 'Здесь появится предпросмотр сайта или таблица данных, когда ассистент предложит посмотреть результат.',
  canvasPreview: 'Предпросмотр сайта',
  canvasData: 'Данные',
  canvasThemeDiff: 'Смена темы',
  canvasClose: 'Закрыть панель',
  canvasApply: 'Применить',
  canvasRollback: 'Откатить',
  canvasCurrentTheme: 'Текущая тема',
  canvasProposedTheme: 'Предлагаемая тема',
  canvasLivePreview: 'Живой предпросмотр',
  canvasDataTable: 'Таблица',
  canvasOpenPreview: 'Открыть предпросмотр',
  canvasHint: 'Ассистент может открыть здесь предпросмотр сайта или данные.',
  exportChat: 'Экспорт чата',
  pin: 'Закрепить',
  pinned: 'Закреплённые',
  shortcuts: 'Горячие клавиши',
  shortcutToggle: 'Открыть/закрыть ассистента',
  shortcutClose: 'Закрыть панель',
  shortcutSend: 'Отправить сообщение',
  shortcutNewline: 'Новая строка',
  shortcutCommands: 'Команды',
  shortcutMentions: 'Упоминания',
  shortcutHistory: 'История сообщений',
  shortcutHelp: 'Показать горячие клавиши',
  speak: 'Озвучить',
  stopSpeaking: 'Остановить',
  fork: 'Новая ветка',
  customInstructions: 'Инструкции',
  customInstructionsHint: 'Дополнительные инструкции для ассистента (например: отвечай кратко, используй таблицы)…',
  dropHere: 'Перетащите изображения сюда',
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
  searchResults: 'Search results',
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
  statusWriting: 'Writing…',
  statusFetching: 'Fetching data…',
  shiftEnterHint: 'Enter to send · Shift+Enter for newline · / for commands · @ to mention',
  loadingChat: 'Loading conversation…',
  examplesTitle: 'Where do we start?',
  mentionTitle: 'Mention',
  memory: 'Memory',
  memoryTitle: 'What the assistant remembers',
  memoryEmpty: 'Nothing remembered yet. Tell me about your business or preferences and I’ll keep them in mind.',
  memoryHint: 'These facts are mixed into replies so the assistant remembers you.',
  memoryClear: 'Clear all',
  remembered: 'Remembered',
  forget: 'Forget',
  sources: 'Sources',
  toolCalls: 'Tools',
  messagesUsed: 'messages used',
  generateImage: 'Generate image',
  imagePrompt: 'Describe the image...',
  imageGenerating: 'Generating image...',
  webSearch: 'Web search',
  webSearchResults: 'Search results',
  artifact: 'Artifact',
  artifactPreview: 'Preview',
  artifactCode: 'Code',
  shareConversation: 'Share conversation',
  shareCopied: 'Link copied',
  shareLink: 'Conversation link',
  shareLinkDescription: 'Copy the link to share this conversation. Anyone with the link can view it.',
  feedbackGood: 'Helpful',
  feedbackBad: 'Not helpful',
  feedbackReason: 'What went wrong?',
  feedbackSent: 'Thanks for the feedback',
  proposedAction: 'Proposed action',
  confirmAction: 'Confirm',
  actionProceed: 'Proceed',
  actionSuccess: 'Done',
  actionFailed: 'Could not complete',
  actionCancelled: 'Cancelled',
  actionNetworkError: 'Connection error',
  openResult: 'Open',
  canvasTitle: 'Workspace',
  canvasEmpty: 'A site preview or data table will appear here when the assistant suggests viewing something.',
  canvasPreview: 'Site preview',
  canvasData: 'Data',
  canvasThemeDiff: 'Theme change',
  canvasClose: 'Close panel',
  canvasApply: 'Apply',
  canvasRollback: 'Rollback',
  canvasCurrentTheme: 'Current theme',
  canvasProposedTheme: 'Proposed theme',
  canvasLivePreview: 'Live preview',
  canvasDataTable: 'Table',
  canvasOpenPreview: 'Open preview',
  canvasHint: 'The assistant can open a site preview or data here.',
  exportChat: 'Export chat',
  pin: 'Pin',
  pinned: 'Pinned',
  shortcuts: 'Keyboard shortcuts',
  shortcutToggle: 'Toggle assistant',
  shortcutClose: 'Close panel',
  shortcutSend: 'Send message',
  shortcutNewline: 'New line',
  shortcutCommands: 'Commands',
  shortcutMentions: 'Mentions',
  shortcutHistory: 'Message history',
  shortcutHelp: 'Show shortcuts',
  speak: 'Read aloud',
  stopSpeaking: 'Stop reading',
  fork: 'New branch',
  customInstructions: 'Custom instructions',
  customInstructionsHint: 'Additional instructions for the assistant (e.g. be concise, use tables)…',
  dropHere: 'Drop images here',
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
  searchResults: 'Փնտրման արդյունքներ',
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
  statusThinking: 'Մտածում է…',
  statusWriting: 'Գրում է…',
  statusFetching: 'Տվյալներ է որոնում…',
  shiftEnterHint: 'Enter — ուղարկել · Shift+Enter — նոր տող · / — հրամաններ · @ — հիշատակում',
  loadingChat: 'Բեռնում եմ զրույցը…',
  examplesTitle: 'Որտեղի՞ց սկսենք',
  mentionTitle: 'Հիշատակել',
  memory: 'Հիշողություն',
  memoryTitle: 'Ինչ է հիշում օգնականը',
  memoryEmpty: 'Դեռ ոչինչ չի հիշվել։ Պատմեք ձեր բիզնեսի կամ նախապատվությունների մասին, և ես կհաշվի առնեմ։',
  memoryHint: 'Այս փաստերը միախառնվում են պատասխաններին, որպեսզի օգնականը հիշի ձեզ։',
  memoryClear: 'Մաքրել բոլորը',
  remembered: 'Հիշեցի',
  forget: 'Մոռանալ',
  sources: 'Աղբյուրներ',
  toolCalls: 'Գործիքներ',
  messagesUsed: 'Օգտագործված հաղորդագրություններ',
  generateImage: 'Ստեղծել պատկեր',
  imagePrompt: 'Նկարագրեք պատկերը...',
  imageGenerating: 'Ստեղծում է պատկեր…',
  webSearch: 'Որոնել վեբում',
  webSearchResults: 'Որոնման արդյունքներ',
  artifact: 'Արտիֆակտ',
  artifactPreview: 'Նախադիտում',
  artifactCode: 'Կոդ',
  shareConversation: 'Կիսվել զրույցով',
  shareCopied: 'Հեղագրվել է',
  shareLink: 'Կիսվել հղումով',
  shareLinkDescription: 'Կիսվել հղումով',
  feedbackGood: 'Օգտակար պատասխան',
  feedbackBad: 'Անօգուտ պատասխան',
  feedbackReason: 'Ինչն էր սխալ?',
  feedbackSent: 'Շնորհակալության ֆիդբեքի համար',
  proposedAction: 'Առաջարկվող գործողություն',
  confirmAction: 'Հաստատել',
  actionProceed: 'Կատարել',
  actionSuccess: 'Պատրաստ է',
  actionFailed: 'Չհաջողվեց կատարել',
  actionCancelled: 'Չեղարկվեց',
  actionNetworkError: 'Սխալ կապի մեջ',
  openResult: 'Բացել',
  canvasTitle: 'Աշխատատարածք',
  canvasEmpty: 'Այստեղ կայքի նախադիտումը կամ տվյալների աղյուսակը կհայտնվի, երբ օգնականը առաջարկի դիտել արդյունքը։',
  canvasPreview: 'Կայքի նախադիտում',
  canvasData: 'Տվյալներ',
  canvasThemeDiff: 'Թեմայի փոփոխում',
  canvasClose: 'Փակել վահանակը',
  canvasApply: 'Կիրառել',
  canvasRollback: 'Հետարկել',
  canvasCurrentTheme: 'Ընթացիկ թեմա',
  canvasProposedTheme: 'Առաջարկվող թեմա',
  canvasLivePreview: 'Ապրող նախադիտում',
  canvasDataTable: 'Աղյուսակ',
  canvasOpenPreview: 'Բացել նախադիտումը',
  canvasHint: 'Օգնականը կարող է այստեղ բացել կայքի նախադիտում կամ տվյալներ։',
  exportChat: 'Արտահանել զրույցը',
  pin: 'Ամրացնել',
  pinned: 'Ամրակցված',
  shortcuts: 'Կարճ ուղիներ',
  shortcutToggle: 'Բացել/փակել օգնականը',
  shortcutClose: 'Փակել',
  shortcutSend: 'Ուղարկել',
  shortcutNewline: 'Նոր տող',
  shortcutCommands: 'Հրամաններ',
  shortcutMentions: 'Հիշատակումներ',
  shortcutHistory: 'Պատմություն',
  shortcutHelp: 'Օգնություն',
  speak: 'Արտասանել',
  stopSpeaking: 'դադարեցնել',
  fork: 'Նոր տարածք',
  customInstructions: 'Հարցումներ',
  customInstructionsHint: 'Լրացման հարցումներ…',
  dropHere: 'Ներդնել այստեղ',
  starters: {
    customer: [
      '✨ Ինչպե՞ս ստեղծել կայք',
      '🎨 Ընտրել թեմա',
      '🎬 Գեներացնել վիդեոներ',
      '🚀 Ինչպե՞ս ստեղծել կայք',
    ],
    admin: [
      '✨ Ինչպե՞ս ստեղծել կայք',
      '🌐 Բացել կայք',
      '👥 Օգտագործողներ',
      '🚀 Ինչպե՞ս ստեղծել կայք',
    ],
    superadmin: [
      '🎬 Բացել ստուդիան',
      '🌐 Բոլոր կայքերը',
      '🏢 Կազմակերպություններ',
      '👑 Կառավարման վահանակ',
    ],
  },
};

const DICTS: Record<Locale, AssistantDict> = { ru, en, hy };

export function assistantDict(locale: Locale): AssistantDict {
  return DICTS[locale] ?? en;
}
