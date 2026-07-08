// Dashboard UI dictionary (ru/en/hy): shell navigation, command palette, top
// bar and shared chrome. Client-safe, domain-scoped.

import type { Locale } from '@/lib/seo';

export type DashDict = {
  nav: {
    overview: string;
    sites: string;
    organization: string;
    submissions: string;
    account: string;
    users: string;
    allSites: string;
    organizations: string;
    database: string;
    control: string;
    studio: string;
    audit: string;
    access: string;
    activity: string;
    trash: string;
    billing: string;
    billingAdmin: string;
    notifications: string;
  };
  roles: { superadmin: string; admin: string; customer: string };
  userMenu: { label: string; signedIn: string };
  sidebar: {
    groupWorkspace: string;
    groupStaff: string;
    groupSuper: string;
    collapse: string;
    expand: string;
    search: string;
    noResults: string;
  };
  hub: {
    open: string;
    staffTitle: string;
    staffSubtitle: string;
    superTitle: string;
    superSubtitle: string;
    desc: {
      users: string;
      allSites: string;
      audit: string;
      organizations: string;
      database: string;
      access: string;
      activity: string;
      trash: string;
      control: string;
      studio: string;
      billing: string;
      billingAdmin: string;
      notifications: string;
    };
  };
  brandSub: string;
  gatedTitle: string;
  gatedNote: string;
  dashboard: string;
  searchCommands: string;
  newSite: string;
  site: string;
  logout: string;
  close: string;
  menu: string;
  noName: string;
  cmd: {
    section: string;
    createSite: string;
    action: string;
    openSite: string;
    link: string;
    studio: string;
    goto: string;
    builder: string;
    logout: string;
  };
  sites: {
    title: string;
    subtitle: string;
    newNamePlaceholder: string;
    create: string;
    createFailed: string;
    networkError: string;
    publishError: string;
    published: string;
    draft: string;
    edit: string;
    open: string;
    publish: string;
    unpublish: string;
    settings: string;
    emptyTitle: string;
    emptyDesc: string;
    reqOne: string;
    reqMany: string; // contains {n}
    review: string;
  };
  overview: {
    metaTitle: string;
    hi: string;
    friend: string;
    subtitle: string;
    statSites: string;
    statPublished: string;
    ofN: string;
    statSubmissions: string;
    platformStaff: string;
    statUsers: string;
    statAllSites: string;
    recentSites: string;
  };
  members: {
    status: { pending: string; approved: string; rejected: string; suspended: string };
    reasonPrompt: string;
    approvalTitle: string;
    approvalDesc: string;
    requestsTitle: string;
    noRequests: string;
    noName: string;
    approve: string;
    reject: string;
    membersTitle: string;
    noMembers: string;
    suspend: string;
    restore: string;
    materialsTitle: string;
    materialTitle: string;
    materialBody: string;
    materialUrl: string;
    addMaterial: string;
    untitled: string;
    delete: string;
  };
  submissions: {
    metaTitle: string;
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyDesc: string;
    liveNew: string;
  };
  org: {
    create: string;
    join: string;
    acceptedTitle: string;
    acceptedDesc: string;
    enterCabinet: string;
    pendingTitle: string;
    pendingCreate: string; // {name}
    pendingJoin: string;
    rejectedPrefix: string;
    orgName: string;
    orgNamePlaceholder: string;
    slugLabel: string;
    slugPlaceholder: string;
    availableAt: string;
    orgLabel: string;
    chooseOrg: string;
    messageLabel: string;
    messagePlaceholder: string;
    submit: string;
    reviewedBySuper: string;
    errGeneric: string;
    welcomeTitle: string;
    welcomeDesc: string;
    joinMetaTitle: string;
    joinDesc: string;
  };
  account: {
    metaTitle: string;
    subtitle: string;
    registered: string;
    statSites: string;
    statPublished: string;
    statSubmissions: string;
    logout: string;
  };
  orgReview: {
    rejectReason: string;
    title: string;
    create: string;
    joinTo: string;
  };
  orgConsole: {
    metaTitle: string;
    subtitle: string;
    noOrgs: string;
    tenantUsersTitle: string;
    tenantUsersDesc: string;
    searchOrg: string;
    nothingFound: string;
    chooseOrg: string;
    createdOn: string;
    published: string;
    draft: string;
    open: string;
    statMembers: string;
    statPending: string;
    statMaterials: string;
    statSubmissions: string;
    adminOf: string; // {name}
    noName: string;
    noAdmin: string;
    assignNewAdmin: string; // {name}
    searchByNameEmail: string;
    platform: string;
    member: string;
    assign: string;
    picked: string;
    assignError: string;
    assignedAdmin: string; // {email}
    ownershipNote: string;
  };
  tenantUsers: {
    search: string;
    noUsers: string;
    noName: string;
    now: string;
    assign: string;
    error: string;
    approve: string;
    suspend: string;
  };
  learning: {
    title: string; desc: string; courseTitle: string; courseDesc: string; addCourse: string;
    noCourses: string; lessonsN: string; publish: string; unpublish: string; published: string;
    draft: string; manage: string; lessonTitle: string; lessonBody: string; lessonVideo: string;
    lessonAttach: string; addLesson: string; noLessons: string; delete: string;
  };
  documents: {
    title: string; desc: string; upload: string; uploading: string; noDocuments: string; titlePh: string; delete: string;
  };
  support: {
    title: string; desc: string; noTickets: string; open: string; closed: string; reply: string; replyPh: string;
    send: string; close: string; reopen: string; you: string; team: string; back: string;
  };
  announcements: {
    title: string; desc: string; titlePh: string; bodyPh: string; pinned: string; add: string; empty: string; delete: string;
  };
};

const ru: DashDict = {
  nav: {
    overview: 'Обзор',
    sites: 'Мои сайты',
    organization: 'Организация',
    submissions: 'Заявки',
    account: 'Аккаунт',
    users: 'Пользователи',
    allSites: 'Все сайты',
    organizations: 'Организации',
    database: 'База данных',
    control: 'Центр контроля',
    studio: 'Студия',
    audit: 'Журнал аудита',
    access: 'Доступ ролей',
    activity: 'Активность персонала',
    trash: 'Корзина',
    billing: 'Подписка',
    billingAdmin: 'Платежи',
    notifications: 'Уведомления',
  },
  roles: { superadmin: 'Суперадмин', admin: 'Админ', customer: 'Клиент' },
  userMenu: { label: 'Меню аккаунта', signedIn: 'Вы вошли как' },
  sidebar: {
    groupWorkspace: 'Рабочее пространство',
    groupStaff: 'Персонал платформы',
    groupSuper: 'Суперадмин',
    collapse: 'Свернуть меню',
    expand: 'Развернуть меню',
    search: 'Поиск разделов…',
    noResults: 'Ничего не найдено',
  },
  hub: {
    open: 'Открыть',
    staffTitle: 'Персонал платформы',
    staffSubtitle: 'Инструменты для сотрудников платформы: пользователи, сайты и журнал аудита.',
    superTitle: 'Суперадмин',
    superSubtitle: 'Управление платформой: организации, база данных, доступ и контроль.',
    desc: {
      users: 'Управление учётными записями и ролями пользователей.',
      allSites: 'Все сайты платформы в одном списке.',
      audit: 'История действий и событий безопасности.',
      organizations: 'Организации, их данные и назначение администраторов.',
      database: 'Просмотр и обслуживание таблиц базы данных.',
      access: 'Матрица доступа ролей к разделам дашборда.',
      activity: 'Активность персонала в реальном времени.',
      trash: 'Удалённые объекты и их восстановление.',
      control: 'Сводный центр контроля платформы.',
      studio: 'Студия генерации медиа и конструктор сайтов.',
      billing: 'Ваш тариф, продление и счета.',
      billingAdmin: 'Подписки, выручка и метрики платформы.',
      notifications: 'Уведомления в Telegram о событиях платформы.',
    },
  },
  brandSub: 'Дашборд',
  gatedTitle: 'Доступ ограничен',
  gatedNote: 'Доступ к разделам откроется после одобрения заявки суперадмином.',
  dashboard: 'Дашборд',
  searchCommands: 'Поиск команд',
  newSite: 'Новый сайт',
  site: 'Сайт',
  logout: 'Выйти',
  close: 'Закрыть',
  menu: 'Меню',
  noName: 'Без имени',
  cmd: {
    section: 'Раздел',
    createSite: 'Создать новый сайт',
    action: 'Действие',
    openSite: 'Открыть сайт',
    link: 'Ссылка',
    studio: 'Студия',
    goto: 'Переход',
    builder: 'Конструктор',
    logout: 'Выйти из аккаунта',
  },
  sites: {
    title: 'Мои сайты',
    subtitle: 'Создавайте, редактируйте и публикуйте свои сайты.',
    newNamePlaceholder: 'Название нового сайта, например «Кофейня У Ромы»',
    create: 'Создать сайт',
    createFailed: 'Не удалось создать сайт.',
    networkError: 'Сеть недоступна.',
    publishError: 'Ошибка публикации.',
    published: 'Опубликован',
    draft: 'Черновик',
    edit: 'Редактировать',
    open: 'Открыть',
    publish: 'Опубликовать',
    unpublish: 'Снять',
    settings: 'Настройки',
    emptyTitle: 'Пока ни одного сайта',
    emptyDesc: 'Создайте первый — конструктор откроется автоматически.',
    reqOne: '1 заявка на вступление',
    reqMany: '{n} заявок на вступление',
    review: 'Рассмотреть →',
  },
  overview: {
    metaTitle: 'Обзор',
    hi: 'Привет',
    friend: 'друг',
    subtitle: 'Общая картина по вашим сайтам и заявкам.',
    statSites: 'Сайты',
    statPublished: 'Опубликовано',
    ofN: 'из',
    statSubmissions: 'Заявки',
    platformStaff: 'Платформа (staff)',
    statUsers: 'Пользователи',
    statAllSites: 'Всего сайтов',
    recentSites: 'Недавние сайты',
  },
  members: {
    status: { pending: 'Ожидает', approved: 'Участник', rejected: 'Отклонён', suspended: 'Приостановлен' },
    reasonPrompt: 'Причина (необязательно):',
    approvalTitle: 'Одобрение участников',
    approvalDesc: 'Новые регистрации ждут вашего одобрения, прежде чем увидят материалы.',
    requestsTitle: 'Заявки на вступление',
    noRequests: 'Нет новых заявок.',
    noName: 'Без имени',
    approve: 'Одобрить',
    reject: 'Отклонить',
    membersTitle: 'Участники',
    noMembers: 'Пока нет участников.',
    suspend: 'Приостановить',
    restore: 'Восстановить',
    materialsTitle: 'Материалы для участников',
    materialTitle: 'Заголовок',
    materialBody: 'Текст материала…',
    materialUrl: 'Ссылка (необязательно)',
    addMaterial: 'Добавить материал',
    untitled: 'Без названия',
    delete: 'Удалить',
  },
  submissions: {
    metaTitle: 'Заявки',
    title: 'Заявки',
    subtitle: 'Все обращения из форм на ваших сайтах.',
    emptyTitle: 'Пока нет заявок',
    emptyDesc: 'Как только посетитель отправит форму, она появится здесь.',
    liveNew: 'Новая заявка',
  },
  org: {
    create: 'Создать организацию',
    join: 'Присоединиться',
    acceptedTitle: 'Вы приняты в организацию',
    acceptedDesc: 'Вы участник организации. Доступ к материалам — в кабинете на самом сайте (отдельный вход для участников).',
    enterCabinet: 'Войти в кабинет участника',
    pendingTitle: 'Заявка на рассмотрении',
    pendingCreate: 'Ваша заявка на создание организации «{name}» отправлена суперадмину. Ожидайте одобрения.',
    pendingJoin: 'Ваша заявка на присоединение к организации отправлена суперадмину. Ожидайте одобрения.',
    rejectedPrefix: 'Прошлая заявка отклонена',
    orgName: 'Название организации',
    orgNamePlaceholder: 'Моя компания',
    slugLabel: 'Адрес (slug)',
    slugPlaceholder: 'my-company',
    availableAt: 'Сайт будет доступен по',
    orgLabel: 'Организация',
    chooseOrg: 'Выберите организацию…',
    messageLabel: 'Сообщение (необязательно)',
    messagePlaceholder: 'Пара слов для суперадмина…',
    submit: 'Отправить заявку',
    reviewedBySuper: 'Заявку рассмотрит суперадмин.',
    errGeneric: 'Ошибка',
    welcomeTitle: 'Добро пожаловать',
    welcomeDesc: 'Чтобы пользоваться платформой, создайте организацию или присоединитесь к существующей. Доступ откроется после одобрения суперадмином.',
    joinMetaTitle: 'Организация — Builder Studio',
    joinDesc: 'Создайте свою организацию или присоединитесь к существующей. Заявку рассмотрит суперадмин.',
  },
  account: {
    metaTitle: 'Аккаунт',
    subtitle: 'Данные вашего профиля и сессии.',
    registered: 'Регистрация',
    statSites: 'сайтов',
    statPublished: 'опубликовано',
    statSubmissions: 'заявок',
    logout: 'Выйти',
  },
  orgReview: {
    rejectReason: 'Причина отклонения (необязательно):',
    title: 'Заявки организаций',
    create: 'Создать',
    joinTo: 'Присоединиться к',
  },
  orgConsole: {
    metaTitle: 'Организации',
    subtitle: 'Выберите организацию, чтобы увидеть её данные и назначить администратора.',
    noOrgs: 'Организаций пока нет',
    tenantUsersTitle: 'Пользователи тенантов',
    tenantUsersDesc: 'Клиенты сайтов, зарегистрированные на организациях. Здесь можно присвоить пользователю организацию и статус (в т.ч. тем, кто регистрировался до появления организаций).',
    searchOrg: 'Поиск организации',
    nothingFound: 'Ничего не найдено.',
    chooseOrg: 'Выберите организацию.',
    createdOn: 'создана',
    published: 'Опубликован',
    draft: 'Черновик',
    open: 'Открыть',
    statMembers: 'Участники',
    statPending: 'Ожидают',
    statMaterials: 'Материалы',
    statSubmissions: 'Заявки',
    adminOf: 'Администратор организации «{name}»',
    noName: 'Без имени',
    noAdmin: 'Админ не назначен.',
    assignNewAdmin: 'Назначить нового админа организации «{name}»',
    searchByNameEmail: 'Поиск по имени или email',
    platform: 'Платформа',
    member: 'Участник',
    assign: 'Назначить',
    picked: 'Выбран:',
    assignError: 'Ошибка',
    assignedAdmin: 'Админом назначен {email}',
    ownershipNote: 'Владение организацией перейдёт выбранному пользователю (роль → admin). Если выбран участник (tenant), он будет перенесён в платформенные администраторы и удалён из участников — без дублей.',
  },
  tenantUsers: {
    search: 'Поиск по имени, email, организации',
    noUsers: 'Пользователей нет.',
    noName: 'Без имени',
    now: 'сейчас:',
    assign: 'Присвоить',
    error: 'Ошибка',
    approve: 'Одобрить',
    suspend: 'Приостановить',
  },
  learning: {
    title: 'Курсы и обучение',
    desc: 'Соберите структурированные курсы из уроков. Участники видят их в кабинете и отмечают прогресс.',
    courseTitle: 'Название курса',
    courseDesc: 'Описание курса…',
    addCourse: 'Добавить курс',
    noCourses: 'Курсов пока нет.',
    lessonsN: 'уроков',
    publish: 'Опубликовать',
    unpublish: 'Снять с публикации',
    published: 'Опубликован',
    draft: 'Черновик',
    manage: 'Уроки',
    lessonTitle: 'Название урока',
    lessonBody: 'Содержание урока…',
    lessonVideo: 'Ссылка на видео (необязательно)',
    lessonAttach: 'Ссылка на материал (необязательно)',
    addLesson: 'Добавить урок',
    noLessons: 'В курсе пока нет уроков.',
    delete: 'Удалить',
  },
  documents: {
    title: 'Файлы и документы',
    desc: 'Загрузите файлы (PDF, видео и др.) — участники смогут скачать их в кабинете.',
    upload: 'Загрузить файл',
    uploading: 'Загрузка…',
    noDocuments: 'Файлов пока нет.',
    titlePh: 'Название (необязательно)',
    delete: 'Удалить',
  },
  support: {
    title: 'Обращения в поддержку',
    desc: 'Отвечайте на вопросы участников. Ответ приходит им уведомлением.',
    noTickets: 'Обращений пока нет.',
    open: 'Открыто',
    closed: 'Закрыто',
    reply: 'Ответить',
    replyPh: 'Ваш ответ…',
    send: 'Отправить',
    close: 'Закрыть',
    reopen: 'Открыть заново',
    you: 'Вы',
    team: 'Участник',
    back: 'К списку',
  },
  announcements: {
    title: 'Объявления',
    desc: 'Отправьте объявление участникам — оно появится у них и придёт уведомлением.',
    titlePh: 'Заголовок',
    bodyPh: 'Текст объявления…',
    pinned: 'Закрепить',
    add: 'Опубликовать',
    empty: 'Объявлений пока нет.',
    delete: 'Удалить',
  },
};

const en: DashDict = {
  nav: {
    overview: 'Overview',
    sites: 'My sites',
    organization: 'Organization',
    submissions: 'Submissions',
    account: 'Account',
    users: 'Users',
    allSites: 'All sites',
    organizations: 'Organizations',
    database: 'Database',
    control: 'Control center',
    studio: 'Studio',
    audit: 'Audit log',
    access: 'Role access',
    activity: 'Staff activity',
    trash: 'Trash',
    billing: 'Subscription',
    billingAdmin: 'Billing',
    notifications: 'Notifications',
  },
  roles: { superadmin: 'Superadmin', admin: 'Admin', customer: 'Customer' },
  userMenu: { label: 'Account menu', signedIn: 'Signed in as' },
  sidebar: {
    groupWorkspace: 'Workspace',
    groupStaff: 'Platform staff',
    groupSuper: 'Superadmin',
    collapse: 'Collapse menu',
    expand: 'Expand menu',
    search: 'Search sections…',
    noResults: 'Nothing found',
  },
  hub: {
    open: 'Open',
    staffTitle: 'Platform staff',
    staffSubtitle: 'Tools for platform staff: users, sites and the audit log.',
    superTitle: 'Superadmin',
    superSubtitle: 'Platform management: organizations, database, access and control.',
    desc: {
      users: 'Manage user accounts and roles.',
      allSites: 'Every site on the platform in one list.',
      audit: 'History of actions and security events.',
      organizations: 'Organizations, their data and admin assignment.',
      database: 'Browse and maintain database tables.',
      access: 'Role access matrix for dashboard sections.',
      activity: 'Real-time staff activity.',
      trash: 'Deleted items and their restoration.',
      control: 'The platform control center.',
      studio: 'Media generation studio and site builder.',
      billing: 'Your plan, renewal and invoices.',
      billingAdmin: 'Subscriptions, revenue and platform metrics.',
      notifications: 'Telegram alerts for platform events.',
    },
  },
  brandSub: 'Dashboard',
  gatedTitle: 'Access restricted',
  gatedNote: 'Sections unlock once a superadmin approves your request.',
  dashboard: 'Dashboard',
  searchCommands: 'Search commands',
  newSite: 'New site',
  site: 'Site',
  logout: 'Sign out',
  close: 'Close',
  menu: 'Menu',
  noName: 'No name',
  cmd: {
    section: 'Section',
    createSite: 'Create a new site',
    action: 'Action',
    openSite: 'Open the site',
    link: 'Link',
    studio: 'Studio',
    goto: 'Navigate',
    builder: 'Builder',
    logout: 'Sign out of the account',
  },
  sites: {
    title: 'My sites',
    subtitle: 'Create, edit and publish your sites.',
    newNamePlaceholder: 'New site name, e.g. “Roma’s Coffee”',
    create: 'Create site',
    createFailed: 'Could not create the site.',
    networkError: 'Network unavailable.',
    publishError: 'Publishing error.',
    published: 'Published',
    draft: 'Draft',
    edit: 'Edit',
    open: 'Open',
    publish: 'Publish',
    unpublish: 'Unpublish',
    settings: 'Settings',
    emptyTitle: 'No sites yet',
    emptyDesc: 'Create the first one — the builder opens automatically.',
    reqOne: '1 join request',
    reqMany: '{n} join requests',
    review: 'Review →',
  },
  overview: {
    metaTitle: 'Overview',
    hi: 'Hi',
    friend: 'friend',
    subtitle: 'A snapshot of your sites and submissions.',
    statSites: 'Sites',
    statPublished: 'Published',
    ofN: 'of',
    statSubmissions: 'Submissions',
    platformStaff: 'Platform (staff)',
    statUsers: 'Users',
    statAllSites: 'Total sites',
    recentSites: 'Recent sites',
  },
  members: {
    status: { pending: 'Pending', approved: 'Member', rejected: 'Rejected', suspended: 'Suspended' },
    reasonPrompt: 'Reason (optional):',
    approvalTitle: 'Member approval',
    approvalDesc: 'New registrations await your approval before they can see materials.',
    requestsTitle: 'Join requests',
    noRequests: 'No new requests.',
    noName: 'No name',
    approve: 'Approve',
    reject: 'Reject',
    membersTitle: 'Members',
    noMembers: 'No members yet.',
    suspend: 'Suspend',
    restore: 'Restore',
    materialsTitle: 'Member materials',
    materialTitle: 'Title',
    materialBody: 'Material text…',
    materialUrl: 'Link (optional)',
    addMaterial: 'Add material',
    untitled: 'Untitled',
    delete: 'Delete',
  },
  submissions: {
    metaTitle: 'Submissions',
    title: 'Submissions',
    subtitle: 'All form submissions from your sites.',
    emptyTitle: 'No submissions yet',
    emptyDesc: 'As soon as a visitor submits a form, it appears here.',
    liveNew: 'New submission',
  },
  org: {
    create: 'Create organization',
    join: 'Join',
    acceptedTitle: 'You’ve joined the organization',
    acceptedDesc: 'You are a member. Access materials from the member cabinet on the site itself (a separate member login).',
    enterCabinet: 'Open member cabinet',
    pendingTitle: 'Request under review',
    pendingCreate: 'Your request to create the “{name}” organization has been sent to the superadmin. Please wait for approval.',
    pendingJoin: 'Your request to join the organization has been sent to the superadmin. Please wait for approval.',
    rejectedPrefix: 'Previous request rejected',
    orgName: 'Organization name',
    orgNamePlaceholder: 'My company',
    slugLabel: 'Address (slug)',
    slugPlaceholder: 'my-company',
    availableAt: 'The site will be available at',
    orgLabel: 'Organization',
    chooseOrg: 'Choose an organization…',
    messageLabel: 'Message (optional)',
    messagePlaceholder: 'A few words for the superadmin…',
    submit: 'Send request',
    reviewedBySuper: 'A superadmin will review your request.',
    errGeneric: 'Error',
    welcomeTitle: 'Welcome',
    welcomeDesc: 'To use the platform, create an organization or join an existing one. Access opens once a superadmin approves.',
    joinMetaTitle: 'Organization — Builder Studio',
    joinDesc: 'Create your own organization or join an existing one. A superadmin will review your request.',
  },
  account: {
    metaTitle: 'Account',
    subtitle: 'Your profile details and session.',
    registered: 'Registered',
    statSites: 'sites',
    statPublished: 'published',
    statSubmissions: 'submissions',
    logout: 'Sign out',
  },
  orgReview: {
    rejectReason: 'Rejection reason (optional):',
    title: 'Organization requests',
    create: 'Create',
    joinTo: 'Join',
  },
  orgConsole: {
    metaTitle: 'Organizations',
    subtitle: 'Pick an organization to see its data and assign an administrator.',
    noOrgs: 'No organizations yet',
    tenantUsersTitle: 'Tenant users',
    tenantUsersDesc: 'Site customers registered on organizations. Here you can assign a user an organization and status (including those who registered before organizations existed).',
    searchOrg: 'Search organization',
    nothingFound: 'Nothing found.',
    chooseOrg: 'Pick an organization.',
    createdOn: 'created',
    published: 'Published',
    draft: 'Draft',
    open: 'Open',
    statMembers: 'Members',
    statPending: 'Pending',
    statMaterials: 'Materials',
    statSubmissions: 'Submissions',
    adminOf: 'Administrator of “{name}”',
    noName: 'No name',
    noAdmin: 'No admin assigned.',
    assignNewAdmin: 'Assign a new admin for “{name}”',
    searchByNameEmail: 'Search by name or email',
    platform: 'Platform',
    member: 'Member',
    assign: 'Assign',
    picked: 'Picked:',
    assignError: 'Error',
    assignedAdmin: 'Admin assigned: {email}',
    ownershipNote: 'Ownership of the organization transfers to the selected user (role → admin). If a member (tenant) is chosen, they are moved to platform admins and removed from members — no duplicates.',
  },
  tenantUsers: {
    search: 'Search by name, email, organization',
    noUsers: 'No users.',
    noName: 'No name',
    now: 'now:',
    assign: 'Assign',
    error: 'Error',
    approve: 'Approve',
    suspend: 'Suspend',
  },
  learning: {
    title: 'Courses & learning',
    desc: 'Build structured courses from lessons. Members see them in their cabinet and track progress.',
    courseTitle: 'Course title',
    courseDesc: 'Course description…',
    addCourse: 'Add course',
    noCourses: 'No courses yet.',
    lessonsN: 'lessons',
    publish: 'Publish',
    unpublish: 'Unpublish',
    published: 'Published',
    draft: 'Draft',
    manage: 'Lessons',
    lessonTitle: 'Lesson title',
    lessonBody: 'Lesson content…',
    lessonVideo: 'Video URL (optional)',
    lessonAttach: 'Material URL (optional)',
    addLesson: 'Add lesson',
    noLessons: 'This course has no lessons yet.',
    delete: 'Delete',
  },
  documents: {
    title: 'Files & documents',
    desc: 'Upload files (PDF, video, etc.) — members can download them in their cabinet.',
    upload: 'Upload file',
    uploading: 'Uploading…',
    noDocuments: 'No files yet.',
    titlePh: 'Title (optional)',
    delete: 'Delete',
  },
  support: {
    title: 'Support tickets',
    desc: 'Reply to member questions. They get notified of your reply.',
    noTickets: 'No tickets yet.',
    open: 'Open',
    closed: 'Closed',
    reply: 'Reply',
    replyPh: 'Your reply…',
    send: 'Send',
    close: 'Close',
    reopen: 'Reopen',
    you: 'You',
    team: 'Member',
    back: 'Back to list',
  },
  announcements: {
    title: 'Announcements',
    desc: 'Broadcast an announcement to members — it shows in their cabinet and notifies them.',
    titlePh: 'Title',
    bodyPh: 'Announcement text…',
    pinned: 'Pin',
    add: 'Publish',
    empty: 'No announcements yet.',
    delete: 'Delete',
  },
};

const hy: DashDict = {
  nav: {
    overview: 'Ընդհանուր',
    sites: 'Իմ կայքերը',
    organization: 'Կազմակերպություն',
    submissions: 'Հայտեր',
    account: 'Հաշիվ',
    users: 'Օգտատերեր',
    allSites: 'Բոլոր կայքերը',
    organizations: 'Կազմակերպություններ',
    database: 'Տվյալների բազա',
    control: 'Կառավարման կենտրոն',
    studio: 'Ստուդիա',
    audit: 'Աուդիտի մատյան',
    access: 'Դերերի հասանելիություն',
    activity: 'Անձնակազմի ակտիվություն',
    trash: 'Աղբարկղ',
    billing: 'Բաժանորդագրություն',
    billingAdmin: 'Վճարումներ',
    notifications: 'Ծանուցումներ',
  },
  roles: { superadmin: 'Գերադմին', admin: 'Ադմին', customer: 'Հաճախորդ' },
  userMenu: { label: 'Հաշվի ընտրացանկ', signedIn: 'Մուտք եք գործել որպես' },
  sidebar: {
    groupWorkspace: 'Աշխատանքային տարածք',
    groupStaff: 'Հարթակի անձնակազմ',
    groupSuper: 'Գերադմին',
    collapse: 'Ծալել ընտրացանկը',
    expand: 'Բացել ընտրացանկը',
    search: 'Բաժինների որոնում…',
    noResults: 'Ոչինչ չի գտնվել',
  },
  hub: {
    open: 'Բացել',
    staffTitle: 'Հարթակի անձնակազմ',
    staffSubtitle: 'Հարթակի անձնակազմի գործիքներ՝ օգտատերեր, կայքեր և աուդիտի մատյան։',
    superTitle: 'Գերադմին',
    superSubtitle: 'Հարթակի կառավարում՝ կազմակերպություններ, տվյալների բազա, հասանելիություն և վերահսկողություն։',
    desc: {
      users: 'Օգտատերերի հաշիվների և դերերի կառավարում։',
      allSites: 'Հարթակի բոլոր կայքերը մեկ ցանկում։',
      audit: 'Գործողությունների և անվտանգության իրադարձությունների պատմություն։',
      organizations: 'Կազմակերպությունները, դրանց տվյալները և ադմինի նշանակումը։',
      database: 'Տվյալների բազայի աղյուսակների դիտում և սպասարկում։',
      access: 'Դերերի հասանելիության մատրից՝ վահանակի բաժինների համար։',
      activity: 'Անձնակազմի ակտիվությունն իրական ժամանակում։',
      trash: 'Ջնջված տարրերը և դրանց վերականգնումը։',
      control: 'Հարթակի վերահսկման կենտրոն։',
      studio: 'Մեդիա գեներացիայի ստուդիա և կայքերի կառուցիչ։',
      billing: 'Ձեր պլանը, երկարաձգումը և հաշիվները։',
      billingAdmin: 'Բաժանորդագրություններ, եկամուտ և հարթակի մետրիկա։',
      notifications: 'Telegram ծանուցումներ հարթակի իրադարձությունների մասին։',
    },
  },
  brandSub: 'Վահանակ',
  gatedTitle: 'Մուտքը սահմանափակ է',
  gatedNote: 'Բաժինները կբացվեն, երբ գերադմինը հաստատի ձեր հայտը։',
  dashboard: 'Վահանակ',
  searchCommands: 'Հրամանների որոնում',
  newSite: 'Նոր կայք',
  site: 'Կայք',
  logout: 'Ելք',
  close: 'Փակել',
  menu: 'Ընտրացանկ',
  noName: 'Առանց անվան',
  cmd: {
    section: 'Բաժին',
    createSite: 'Ստեղծել նոր կայք',
    action: 'Գործողություն',
    openSite: 'Բացել կայքը',
    link: 'Հղում',
    studio: 'Ստուդիա',
    goto: 'Անցում',
    builder: 'Կառուցիչ',
    logout: 'Դուրս գալ հաշվից',
  },
  sites: {
    title: 'Իմ կայքերը',
    subtitle: 'Ստեղծեք, խմբագրեք և հրապարակեք ձեր կայքերը։',
    newNamePlaceholder: 'Նոր կայքի անուն, օրինակ՝ «Ռոմայի սրճարան»',
    create: 'Ստեղծել կայք',
    createFailed: 'Չհաջողվեց ստեղծել կայքը։',
    networkError: 'Ցանցն անհասանելի է։',
    publishError: 'Հրապարակման սխալ։',
    published: 'Հրապարակված',
    draft: 'Սևագիր',
    edit: 'Խմբագրել',
    open: 'Բացել',
    publish: 'Հրապարակել',
    unpublish: 'Հանել',
    settings: 'Կարգավորումներ',
    emptyTitle: 'Դեռ կայքեր չկան',
    emptyDesc: 'Ստեղծեք առաջինը — կառուցիչը կբացվի ինքնաբերաբար։',
    reqOne: '1 միանալու հայտ',
    reqMany: '{n} միանալու հայտ',
    review: 'Դիտել →',
  },
  overview: {
    metaTitle: 'Ընդհանուր',
    hi: 'Բարև',
    friend: 'ընկեր',
    subtitle: 'Ձեր կայքերի և հայտերի ընդհանուր պատկերը։',
    statSites: 'Կայքեր',
    statPublished: 'Հրապարակված',
    ofN: '/',
    statSubmissions: 'Հայտեր',
    platformStaff: 'Հարթակ (staff)',
    statUsers: 'Օգտատերեր',
    statAllSites: 'Ընդամենը կայքեր',
    recentSites: 'Վերջին կայքերը',
  },
  members: {
    status: { pending: 'Սպասում է', approved: 'Մասնակից', rejected: 'Մերժված', suspended: 'Կասեցված' },
    reasonPrompt: 'Պատճառ (ըստ ցանկության)՝',
    approvalTitle: 'Մասնակիցների հաստատում',
    approvalDesc: 'Նոր գրանցումները սպասում են ձեր հաստատմանը, նախքան նյութերը տեսնելը։',
    requestsTitle: 'Միանալու հայտեր',
    noRequests: 'Նոր հայտեր չկան։',
    noName: 'Առանց անվան',
    approve: 'Հաստատել',
    reject: 'Մերժել',
    membersTitle: 'Մասնակիցներ',
    noMembers: 'Դեռ մասնակիցներ չկան։',
    suspend: 'Կասեցնել',
    restore: 'Վերականգնել',
    materialsTitle: 'Նյութեր մասնակիցների համար',
    materialTitle: 'Վերնագիր',
    materialBody: 'Նյութի տեքստ…',
    materialUrl: 'Հղում (ըստ ցանկության)',
    addMaterial: 'Ավելացնել նյութ',
    untitled: 'Առանց վերնագրի',
    delete: 'Ջնջել',
  },
  submissions: {
    metaTitle: 'Հայտեր',
    title: 'Հայտեր',
    subtitle: 'Ձեր կայքերի ձևերից բոլոր դիմումները։',
    emptyTitle: 'Դեռ հայտեր չկան',
    emptyDesc: 'Հենց այցելուն ուղարկի ձևը, այն կհայտնվի այստեղ։',
    liveNew: 'Նոր հայտ',
  },
  org: {
    create: 'Ստեղծել կազմակերպություն',
    join: 'Միանալ',
    acceptedTitle: 'Դուք ընդունվել եք կազմակերպություն',
    acceptedDesc: 'Դուք մասնակից եք։ Նյութերի հասանելիությունը՝ կայքի մասնակիցների կաբինետում (առանձին մուտք մասնակիցների համար)։',
    enterCabinet: 'Մուտք մասնակցի կաբինետ',
    pendingTitle: 'Հայտը դիտարկման փուլում է',
    pendingCreate: '«{name}» կազմակերպությունը ստեղծելու ձեր հայտն ուղարկվել է գերադմինին։ Սպասեք հաստատմանը։',
    pendingJoin: 'Կազմակերպությանը միանալու ձեր հայտն ուղարկվել է գերադմինին։ Սպասեք հաստատմանը։',
    rejectedPrefix: 'Նախորդ հայտը մերժվել է',
    orgName: 'Կազմակերպության անվանում',
    orgNamePlaceholder: 'Իմ ընկերությունը',
    slugLabel: 'Հասցե (slug)',
    slugPlaceholder: 'my-company',
    availableAt: 'Կայքը հասանելի կլինի',
    orgLabel: 'Կազմակերպություն',
    chooseOrg: 'Ընտրեք կազմակերպությունը…',
    messageLabel: 'Հաղորդագրություն (ըստ ցանկության)',
    messagePlaceholder: 'Մի քանի բառ գերադմինի համար…',
    submit: 'Ուղարկել հայտը',
    reviewedBySuper: 'Հայտը կդիտարկի գերադմինը։',
    errGeneric: 'Սխալ',
    welcomeTitle: 'Բարի գալուստ',
    welcomeDesc: 'Հարթակն օգտագործելու համար ստեղծեք կազմակերպություն կամ միացեք գոյություն ունեցողին։ Մուտքը կբացվի գերադմինի հաստատումից հետո։',
    joinMetaTitle: 'Կազմակերպություն — Builder Studio',
    joinDesc: 'Ստեղծեք ձեր կազմակերպությունը կամ միացեք գոյություն ունեցողին։ Հայտը կդիտարկի գերադմինը։',
  },
  account: {
    metaTitle: 'Հաշիվ',
    subtitle: 'Ձեր պրոֆիլի տվյալները և սեսիան։',
    registered: 'Գրանցում',
    statSites: 'կայք',
    statPublished: 'հրապարակված',
    statSubmissions: 'հայտ',
    logout: 'Ելք',
  },
  orgReview: {
    rejectReason: 'Մերժման պատճառ (ըստ ցանկության)՝',
    title: 'Կազմակերպությունների հայտեր',
    create: 'Ստեղծել',
    joinTo: 'Միանալ',
  },
  orgConsole: {
    metaTitle: 'Կազմակերպություններ',
    subtitle: 'Ընտրեք կազմակերպությունը՝ տեսնելու տվյալները և նշանակելու ադմինիստրատոր։',
    noOrgs: 'Կազմակերպություններ դեռ չկան',
    tenantUsersTitle: 'Թենանտների օգտատերեր',
    tenantUsersDesc: 'Կազմակերպություններում գրանցված կայքի հաճախորդներ։ Այստեղ կարող եք օգտատիրոջը վերագրել կազմակերպություն և կարգավիճակ (այդ թվում՝ նրանց, ովքեր գրանցվել են մինչև կազմակերպությունների հայտնվելը)։',
    searchOrg: 'Կազմակերպության որոնում',
    nothingFound: 'Ոչինչ չի գտնվել։',
    chooseOrg: 'Ընտրեք կազմակերպությունը։',
    createdOn: 'ստեղծված',
    published: 'Հրապարակված',
    draft: 'Սևագիր',
    open: 'Բացել',
    statMembers: 'Մասնակիցներ',
    statPending: 'Սպասում են',
    statMaterials: 'Նյութեր',
    statSubmissions: 'Հայտեր',
    adminOf: '«{name}» կազմակերպության ադմինիստրատոր',
    noName: 'Առանց անվան',
    noAdmin: 'Ադմին նշանակված չէ։',
    assignNewAdmin: 'Նշանակել «{name}»-ի նոր ադմին',
    searchByNameEmail: 'Որոնում ըստ անվան կամ email-ի',
    platform: 'Հարթակ',
    member: 'Մասնակից',
    assign: 'Նշանակել',
    picked: 'Ընտրված է՝',
    assignError: 'Սխալ',
    assignedAdmin: 'Ադմին նշանակվեց՝ {email}',
    ownershipNote: 'Կազմակերպության սեփականությունը կանցնի ընտրված օգտատիրոջը (դեր → admin)։ Եթե ընտրված է մասնակից (tenant), նա կտեղափոխվի հարթակի ադմիններ և կհեռացվի մասնակիցներից — առանց կրկնօրինակների։',
  },
  tenantUsers: {
    search: 'Որոնում ըստ անվան, email-ի, կազմակերպության',
    noUsers: 'Օգտատերեր չկան։',
    noName: 'Առանց անվան',
    now: 'այժմ՝',
    assign: 'Վերագրել',
    error: 'Սխալ',
    approve: 'Հաստատել',
    suspend: 'Կասեցնել',
  },
  learning: {
    title: 'Դասընթացներ և ուսուցում',
    desc: 'Կառուցեք կառուցվածքային դասընթացներ դասերից։ Մասնակիցները տեսնում են դրանք կաբինետում և հետևում առաջընթացին։',
    courseTitle: 'Դասընթացի անվանում',
    courseDesc: 'Դասընթացի նկարագրություն…',
    addCourse: 'Ավելացնել դասընթաց',
    noCourses: 'Դասընթացներ դեռ չկան։',
    lessonsN: 'դաս',
    publish: 'Հրապարակել',
    unpublish: 'Հանել հրապարակումից',
    published: 'Հրապարակված',
    draft: 'Սևագիր',
    manage: 'Դասեր',
    lessonTitle: 'Դասի անվանում',
    lessonBody: 'Դասի բովանդակություն…',
    lessonVideo: 'Տեսանյութի հղում (ըստ ցանկության)',
    lessonAttach: 'Նյութի հղում (ըստ ցանկության)',
    addLesson: 'Ավելացնել դաս',
    noLessons: 'Այս դասընթացը դեռ դասեր չունի։',
    delete: 'Ջնջել',
  },
  documents: {
    title: 'Ֆայլեր և փաստաթղթեր',
    desc: 'Վերբեռնեք ֆայլեր (PDF, տեսանյութ և այլն) — մասնակիցները կկարողանան ներբեռնել դրանք կաբինետում։',
    upload: 'Վերբեռնել ֆայլ',
    uploading: 'Վերբեռնում…',
    noDocuments: 'Ֆայլեր դեռ չկան։',
    titlePh: 'Անվանում (ըստ ցանկության)',
    delete: 'Ջնջել',
  },
  support: {
    title: 'Աջակցության դիմումներ',
    desc: 'Պատասխանեք մասնակիցների հարցերին։ Նրանք ծանուցում կստանան ձեր պատասխանի մասին։',
    noTickets: 'Դիմումներ դեռ չկան։',
    open: 'Բաց',
    closed: 'Փակված',
    reply: 'Պատասխանել',
    replyPh: 'Ձեր պատասխանը…',
    send: 'Ուղարկել',
    close: 'Փակել',
    reopen: 'Բացել կրկին',
    you: 'Դուք',
    team: 'Մասնակից',
    back: 'Դեպի ցանկ',
  },
  announcements: {
    title: 'Հայտարարություններ',
    desc: 'Ուղարկեք հայտարարություն մասնակիցներին — այն կհայտնվի կաբինետում և կգա ծանուցումով։',
    titlePh: 'Վերնագիր',
    bodyPh: 'Հայտարարության տեքստ…',
    pinned: 'Ամրացնել',
    add: 'Հրապարակել',
    empty: 'Հայտարարություններ դեռ չկան։',
    delete: 'Ջնջել',
  },
};

export const DASH: Record<Locale, DashDict> = { ru, en, hy };

export function dashDict(locale: Locale): DashDict {
  return DASH[locale];
}
