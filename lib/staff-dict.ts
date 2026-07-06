// Staff/superadmin dictionary (ru/en/hy): Users page + users table, All sites.
// Client- and server-safe, domain-scoped.

import type { Locale } from '@/lib/seo';

export type StaffDict = {
  roles: { superadmin: string; admin: string; customer: string };
  usersMetaTitle: string;
  usersTitle: string;
  usersDescEdit: string;
  usersDescView: string;
  // users table
  colUser: string;
  colStatus: string;
  colSites: string;
  colSessions: string;
  colRegistered: string;
  colRole: string;
  noName: string;
  you: string;
  blocked: string;
  online: string;
  justNow: string;
  minAgo: string; // {n}
  hAgo: string; // {n}
  roleChangeFailed: string;
  statusChangeFailed: string;
  networkError: string;
  dossierAction: string;
  block: string;
  unblock: string;
  blockTitle: string; // {name}
  blockDesc: string;
  unblockTitle: string; // {name}
  // all sites
  allMetaTitle: string;
  allTitle: string;
  allSubtitle: string;
  allEmpty: string;
  colSite: string;
  colOwner: string;
  colUpdated: string;
  published: string;
  draft: string;
  open: string;
  dash: string;
  // database page
  dbMetaTitle: string;
  dbTitle: string;
  dbSubtitle: string;
  db: {
    storageLabel: string;
    r2: string;
    local: string;
    loading: string;
    bucketInfo: string; // {bucket} {base}
    localInfo: string;
    gcButton: string;
    gcDone: string; // {n}
    error: string;
    searchIn: string; // {table}
    find: string;
    noRows: string;
    edit: string;
    delete: string;
    total: string; // {n}
    deleteRowTitle: string;
    deleteRowDesc: string;
    cancel: string;
    close: string;
    editRow: string; // {table}
    editHint: string;
    save: string;
  };
  // user dossier
  dossier: {
    metaTitle: string;
    backAll: string;
    noName: string;
    blocked: string;
    online: string;
    wasSeen: string; // {ago}
    desc: string; // {email} {date}
    roleTitle: string;
    loginAs: string;
    block: string;
    unblock: string;
    revokeAllTitle: string;
    deleteUserTitle: string;
    opError: string;
    network: string;
    agoLong: string;
    impTitle: string; // {name}
    impDesc: string;
    impConfirm: string;
    blockTitle: string; // {name}
    blockDesc: string;
    unblockTitle: string; // {name}
    unblockDesc: string;
    revokeAllConfirmTitle: string; // {name}
    revokeAllDesc: string;
    revokeAllConfirm: string;
    deleteTitle: string; // {name}
    deleteDesc: string;
    deleteConfirm: string;
    statTotal: string;
    stat24h: string;
    stat7d: string;
    statLogins30d: string;
    statActiveSessions: string;
    statSites: string;
    activityMap: string;
    activityMapSub: string;
    days: string[];
    heatCell: string; // {day} {h} {v}
    sessions: string;
    sessionsActive: string; // {n}
    noSessions: string;
    created: string;
    activity: string;
    sessionActive: string;
    sessionExpired: string;
    revoke: string;
    sitesTitle: string; // {n} handled inline
    noSites: string;
    updated: string;
    timelineTitle: string;
    noTimeline: string;
  };
};

const ru: StaffDict = {
  roles: { superadmin: 'Суперадмин', admin: 'Админ', customer: 'Клиент' },
  usersMetaTitle: 'Пользователи',
  usersTitle: 'Пользователи',
  usersDescEdit: 'Управляйте ролями и смотрите активность аккаунтов.',
  usersDescView: 'Список аккаунтов платформы.',
  colUser: 'Пользователь',
  colStatus: 'Статус',
  colSites: 'Сайты',
  colSessions: 'Сессии',
  colRegistered: 'Регистрация',
  colRole: 'Роль',
  noName: 'Без имени',
  you: '(вы)',
  blocked: 'Заблокирован',
  online: 'Онлайн',
  justNow: 'только что',
  minAgo: '{n} мин назад',
  hAgo: '{n} ч назад',
  roleChangeFailed: 'Не удалось изменить роль.',
  statusChangeFailed: 'Не удалось изменить статус.',
  networkError: 'Сеть недоступна.',
  dossierAction: 'Досье',
  block: 'Заблокировать',
  unblock: 'Разблокировать',
  blockTitle: 'Заблокировать {name}?',
  blockDesc: 'Все сессии будут завершены, вход станет невозможен.',
  unblockTitle: 'Разблокировать {name}?',
  allMetaTitle: 'Все сайты',
  allTitle: 'Все сайты',
  allSubtitle: 'Каждый сайт на платформе и его владелец.',
  allEmpty: 'Сайтов пока нет',
  colSite: 'Сайт',
  colOwner: 'Владелец',
  colUpdated: 'Обновлён',
  published: 'Опубликован',
  draft: 'Черновик',
  open: 'Открыть',
  dash: '—',
  dbMetaTitle: 'База данных',
  dbTitle: 'База данных',
  dbSubtitle: 'Просмотр и редактирование таблиц. Изменения применяются немедленно — будьте внимательны.',
  db: {
    storageLabel: 'Хранилище:',
    r2: 'Cloudflare R2',
    local: 'Локально (диск)',
    loading: 'Загрузка…',
    bucketInfo: 'bucket {bucket} · {base}',
    localInfo: 'public/uploads на диске сервера',
    gcButton: 'Очистить хранилище',
    gcDone: 'Очищено: удалено {n} неиспользуемых файлов.',
    error: 'Ошибка',
    searchIn: 'Поиск в {table}…',
    find: 'Найти',
    noRows: 'Нет строк.',
    edit: 'Изменить',
    delete: 'Удалить',
    total: 'Всего: {n}',
    deleteRowTitle: 'Удалить строку?',
    deleteRowDesc: 'Действие необратимо. Связанные записи могут удалиться каскадно.',
    cancel: 'Отмена',
    close: 'Закрыть',
    editRow: 'Изменить строку · {table}',
    editHint: 'Пустое поле сохранится как NULL. Первичный ключ менять нельзя.',
    save: 'Сохранить',
  },
  dossier: {
    metaTitle: 'Досье пользователя',
    backAll: 'Все пользователи',
    noName: 'Без имени',
    blocked: 'Заблокирован',
    online: 'Онлайн',
    wasSeen: 'был(а) {ago}',
    desc: '{email} · регистрация {date}',
    roleTitle: 'Роль',
    loginAs: 'Войти как',
    block: 'Заблокировать',
    unblock: 'Разблокировать',
    revokeAllTitle: 'Завершить все сессии',
    deleteUserTitle: 'Удалить пользователя',
    opError: 'Ошибка операции.',
    network: 'Сеть недоступна.',
    agoLong: 'давно',
    impTitle: 'Войти под пользователем {name}?',
    impDesc: 'Вы увидите платформу его глазами. В любой момент сможете вернуться в свой аккаунт.',
    impConfirm: 'Войти как',
    blockTitle: 'Заблокировать {name}?',
    blockDesc: 'Все активные сессии будут немедленно завершены, вход в аккаунт станет невозможен до разблокировки.',
    unblockTitle: 'Разблокировать {name}?',
    unblockDesc: 'Пользователь снова сможет входить в аккаунт.',
    revokeAllConfirmTitle: 'Завершить все сессии {name}?',
    revokeAllDesc: 'Пользователь будет разлогинен на всех устройствах, но сможет войти снова.',
    revokeAllConfirm: 'Завершить',
    deleteTitle: 'Удалить {name}?',
    deleteDesc: 'Пользователь будет удалён вместе со всеми его сайтами, сессиями и заявками. Действие необратимо.',
    deleteConfirm: 'Удалить',
    statTotal: 'Действий всего',
    stat24h: 'За 24 часа',
    stat7d: 'За 7 дней',
    statLogins30d: 'Входов за 30 дней',
    statActiveSessions: 'Активных сессий',
    statSites: 'Сайтов',
    activityMap: 'Карта активности',
    activityMapSub: '— день недели × час, последние 60 дней',
    days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    heatCell: '{day}, {h}:00 — {v} действий',
    sessions: 'Сессии',
    sessionsActive: '{n} активных',
    noSessions: 'Сессий нет.',
    created: 'создана',
    activity: 'активность',
    sessionActive: 'Активна',
    sessionExpired: 'Истекла',
    revoke: 'Отозвать',
    sitesTitle: 'Сайты',
    noSites: 'Сайтов нет.',
    updated: 'обновлён',
    timelineTitle: 'Хронология действий (60 дней)',
    noTimeline: 'Аудит-событий за 60 дней нет.',
  },
};

const en: StaffDict = {
  roles: { superadmin: 'Superadmin', admin: 'Admin', customer: 'Customer' },
  usersMetaTitle: 'Users',
  usersTitle: 'Users',
  usersDescEdit: 'Manage roles and see account activity.',
  usersDescView: 'Platform accounts list.',
  colUser: 'User',
  colStatus: 'Status',
  colSites: 'Sites',
  colSessions: 'Sessions',
  colRegistered: 'Registered',
  colRole: 'Role',
  noName: 'No name',
  you: '(you)',
  blocked: 'Blocked',
  online: 'Online',
  justNow: 'just now',
  minAgo: '{n} min ago',
  hAgo: '{n} h ago',
  roleChangeFailed: 'Could not change the role.',
  statusChangeFailed: 'Could not change the status.',
  networkError: 'Network unavailable.',
  dossierAction: 'Dossier',
  block: 'Block',
  unblock: 'Unblock',
  blockTitle: 'Block {name}?',
  blockDesc: 'All sessions will be terminated, sign-in will be blocked.',
  unblockTitle: 'Unblock {name}?',
  allMetaTitle: 'All sites',
  allTitle: 'All sites',
  allSubtitle: 'Every site on the platform and its owner.',
  allEmpty: 'No sites yet',
  colSite: 'Site',
  colOwner: 'Owner',
  colUpdated: 'Updated',
  published: 'Published',
  draft: 'Draft',
  open: 'Open',
  dash: '—',
  dbMetaTitle: 'Database',
  dbTitle: 'Database',
  dbSubtitle: 'View and edit tables. Changes apply immediately — be careful.',
  db: {
    storageLabel: 'Storage:',
    r2: 'Cloudflare R2',
    local: 'Local (disk)',
    loading: 'Loading…',
    bucketInfo: 'bucket {bucket} · {base}',
    localInfo: 'public/uploads on the server disk',
    gcButton: 'Clean storage',
    gcDone: 'Cleaned: {n} unused files deleted.',
    error: 'Error',
    searchIn: 'Search in {table}…',
    find: 'Search',
    noRows: 'No rows.',
    edit: 'Edit',
    delete: 'Delete',
    total: 'Total: {n}',
    deleteRowTitle: 'Delete row?',
    deleteRowDesc: 'This action is irreversible. Related records may be deleted cascadingly.',
    cancel: 'Cancel',
    close: 'Close',
    editRow: 'Edit row · {table}',
    editHint: 'An empty field is saved as NULL. The primary key cannot be changed.',
    save: 'Save',
  },
  dossier: {
    metaTitle: 'User dossier',
    backAll: 'All users',
    noName: 'No name',
    blocked: 'Blocked',
    online: 'Online',
    wasSeen: 'last seen {ago}',
    desc: '{email} · registered {date}',
    roleTitle: 'Role',
    loginAs: 'Log in as',
    block: 'Block',
    unblock: 'Unblock',
    revokeAllTitle: 'End all sessions',
    deleteUserTitle: 'Delete user',
    opError: 'Operation failed.',
    network: 'Network unavailable.',
    agoLong: 'long ago',
    impTitle: 'Log in as {name}?',
    impDesc: 'You will see the platform through their eyes. You can return to your account at any time.',
    impConfirm: 'Log in as',
    blockTitle: 'Block {name}?',
    blockDesc: 'All active sessions will be terminated immediately, sign-in will be blocked until unblocked.',
    unblockTitle: 'Unblock {name}?',
    unblockDesc: 'The user will be able to sign in again.',
    revokeAllConfirmTitle: 'End all sessions of {name}?',
    revokeAllDesc: 'The user will be signed out on all devices but can sign in again.',
    revokeAllConfirm: 'End',
    deleteTitle: 'Delete {name}?',
    deleteDesc: 'The user will be deleted along with all their sites, sessions and submissions. This action is irreversible.',
    deleteConfirm: 'Delete',
    statTotal: 'Total actions',
    stat24h: 'Last 24 hours',
    stat7d: 'Last 7 days',
    statLogins30d: 'Logins in 30 days',
    statActiveSessions: 'Active sessions',
    statSites: 'Sites',
    activityMap: 'Activity map',
    activityMapSub: '— weekday × hour, last 60 days',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    heatCell: '{day}, {h}:00 — {v} actions',
    sessions: 'Sessions',
    sessionsActive: '{n} active',
    noSessions: 'No sessions.',
    created: 'created',
    activity: 'activity',
    sessionActive: 'Active',
    sessionExpired: 'Expired',
    revoke: 'Revoke',
    sitesTitle: 'Sites',
    noSites: 'No sites.',
    updated: 'updated',
    timelineTitle: 'Action timeline (60 days)',
    noTimeline: 'No audit events in the last 60 days.',
  },
};

const hy: StaffDict = {
  roles: { superadmin: 'Գերադմին', admin: 'Ադմին', customer: 'Հաճախորդ' },
  usersMetaTitle: 'Օգտատերեր',
  usersTitle: 'Օգտատերեր',
  usersDescEdit: 'Կառավարեք դերերը և դիտեք հաշիվների ակտիվությունը։',
  usersDescView: 'Հարթակի հաշիվների ցանկ։',
  colUser: 'Օգտատեր',
  colStatus: 'Կարգավիճակ',
  colSites: 'Կայքեր',
  colSessions: 'Սեսիաներ',
  colRegistered: 'Գրանցում',
  colRole: 'Դեր',
  noName: 'Առանց անվան',
  you: '(դուք)',
  blocked: 'Արգելափակված',
  online: 'Առցանց',
  justNow: 'հենց հիմա',
  minAgo: '{n} րոպե առաջ',
  hAgo: '{n} ժ առաջ',
  roleChangeFailed: 'Չհաջողվեց փոխել դերը։',
  statusChangeFailed: 'Չհաջողվեց փոխել կարգավիճակը։',
  networkError: 'Ցանցն անհասանելի է։',
  dossierAction: 'Անձնական գործ',
  block: 'Արգելափակել',
  unblock: 'Ապաարգելափակել',
  blockTitle: 'Արգելափակե՞լ {name}-ին։',
  blockDesc: 'Բոլոր սեսիաները կդադարեցվեն, մուտքն անհնար կդառնա։',
  unblockTitle: 'Ապաարգելափակե՞լ {name}-ին։',
  allMetaTitle: 'Բոլոր կայքերը',
  allTitle: 'Բոլոր կայքերը',
  allSubtitle: 'Հարթակի յուրաքանչյուր կայք և իր սեփականատերը։',
  allEmpty: 'Կայքեր դեռ չկան',
  colSite: 'Կայք',
  colOwner: 'Սեփականատեր',
  colUpdated: 'Թարմացված',
  published: 'Հրապարակված',
  draft: 'Սևագիր',
  open: 'Բացել',
  dash: '—',
  dbMetaTitle: 'Տվյալների բազա',
  dbTitle: 'Տվյալների բազա',
  dbSubtitle: 'Դիտեք և խմբագրեք աղյուսակները։ Փոփոխություններն ուժի մեջ են մտնում անմիջապես — եղեք ուշադիր։',
  db: {
    storageLabel: 'Պահեստ՝',
    r2: 'Cloudflare R2',
    local: 'Տեղական (սկավառակ)',
    loading: 'Բեռնում…',
    bucketInfo: 'bucket {bucket} · {base}',
    localInfo: 'public/uploads սերվերի սկավառակի վրա',
    gcButton: 'Մաքրել պահեստը',
    gcDone: 'Մաքրված է՝ ջնջվել է {n} չօգտագործվող ֆայլ։',
    error: 'Սխալ',
    searchIn: 'Որոնում {table}-ում…',
    find: 'Գտնել',
    noRows: 'Տողեր չկան։',
    edit: 'Խմբագրել',
    delete: 'Ջնջել',
    total: 'Ընդամենը՝ {n}',
    deleteRowTitle: 'Ջնջե՞լ տողը։',
    deleteRowDesc: 'Գործողությունն անշրջելի է։ Կապակցված գրառումները կարող են ջնջվել կասկադով։',
    cancel: 'Չեղարկել',
    close: 'Փակել',
    editRow: 'Խմբագրել տողը · {table}',
    editHint: 'Դատարկ դաշտը կպահվի որպես NULL։ Առաջնային բանալին հնարավոր չէ փոխել։',
    save: 'Պահպանել',
  },
  dossier: {
    metaTitle: 'Օգտատիրոջ անձնական գործ',
    backAll: 'Բոլոր օգտատերերը',
    noName: 'Առանց անվան',
    blocked: 'Արգելափակված',
    online: 'Առցանց',
    wasSeen: 'վերջին անգամ {ago}',
    desc: '{email} · գրանցում {date}',
    roleTitle: 'Դեր',
    loginAs: 'Մուտք գործել որպես',
    block: 'Արգելափակել',
    unblock: 'Ապաարգելափակել',
    revokeAllTitle: 'Ավարտել բոլոր սեսիաները',
    deleteUserTitle: 'Ջնջել օգտատիրոջը',
    opError: 'Գործողությունը ձախողվեց։',
    network: 'Ցանցն անհասանելի է։',
    agoLong: 'վաղուց',
    impTitle: 'Մուտք գործե՞լ որպես {name}։',
    impDesc: 'Դուք հարթակը կտեսնեք նրա աչքերով։ Ցանկացած պահի կարող եք վերադառնալ ձեր հաշիվ։',
    impConfirm: 'Մուտք գործել որպես',
    blockTitle: 'Արգելափակե՞լ {name}-ին։',
    blockDesc: 'Բոլոր ակտիվ սեսիաները անմիջապես կավարտվեն, մուտքն անհնար կդառնա մինչև ապաարգելափակումը։',
    unblockTitle: 'Ապաարգելափակե՞լ {name}-ին։',
    unblockDesc: 'Օգտատերը կրկին կկարողանա մուտք գործել։',
    revokeAllConfirmTitle: 'Ավարտե՞լ {name}-ի բոլոր սեսիաները։',
    revokeAllDesc: 'Օգտատերը դուրս կգա բոլոր սարքերից, բայց կկարողանա կրկին մուտք գործել։',
    revokeAllConfirm: 'Ավարտել',
    deleteTitle: 'Ջնջե՞լ {name}-ին։',
    deleteDesc: 'Օգտատերը կջնջվի իր բոլոր կայքերի, սեսիաների և հայտերի հետ։ Գործողությունն անշրջելի է։',
    deleteConfirm: 'Ջնջել',
    statTotal: 'Ընդամենը գործողություններ',
    stat24h: '24 ժամում',
    stat7d: '7 օրում',
    statLogins30d: 'Մուտքեր 30 օրում',
    statActiveSessions: 'Ակտիվ սեսիաներ',
    statSites: 'Կայքեր',
    activityMap: 'Ակտիվության քարտեզ',
    activityMapSub: '— շաբաթվա օր × ժամ, վերջին 60 օրը',
    days: ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուր', 'Շբթ', 'Կիր'],
    heatCell: '{day}, {h}:00 — {v} գործողություն',
    sessions: 'Սեսիաներ',
    sessionsActive: '{n} ակտիվ',
    noSessions: 'Սեսիաներ չկան։',
    created: 'ստեղծված',
    activity: 'ակտիվություն',
    sessionActive: 'Ակտիվ',
    sessionExpired: 'Ժամկետանց',
    revoke: 'Հետ կանչել',
    sitesTitle: 'Կայքեր',
    noSites: 'Կայքեր չկան։',
    updated: 'թարմացված',
    timelineTitle: 'Գործողությունների ժամանակագրություն (60 օր)',
    noTimeline: 'Վերջին 60 օրում աուդիտի իրադարձություններ չկան։',
  },
};

export const STAFF: Record<Locale, StaffDict> = { ru, en, hy };

export function staffDict(locale: Locale): StaffDict {
  return STAFF[locale];
}
