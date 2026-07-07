// Dictionary (ru/en/hy) for the tenant end-user self-service account
// (components/builder/site-account.tsx). Domain-scoped, client-safe (no
// server-only / no DB). Client components call siteAccountDict(useLocale().locale).

import type { Locale } from '@/lib/seo';

export type SiteAccountDict = {
  // shell / chrome
  cabinet: string; // sidebar eyebrow «Кабинет»
  accountFallback: string; // «Личный кабинет»
  notSignedIn: string;
  signIn: string;
  register: string;
  logout: string;
  toSite: string;
  closeMenu: string;
  openMenu: string;
  noName: string;
  noTitle: string;
  // sidebar (collapsible + drill-in, mirrors the platform dashboard)
  sidebar: {
    groupWorkspace: string;
    groupAccount: string;
    collapse: string;
    expand: string;
    search: string;
    noResults: string;
  };
  // feedback
  networkError: string;
  // tabs
  tabs: {
    overview: string;
    profile: string;
    materials: string;
    notifications: string;
    security: string;
    activity: string;
    settings: string;
  };
  // greeting words (by time of day)
  greetNight: string;
  greetMorning: string;
  greetDay: string;
  greetEvening: string;
  // overview
  withUsSince: string; // «с нами с» (inline)
  profileBtn: string;
  passwordBtn: string;
  statMaterials: string;
  statNotifications: string;
  statActivity: string;
  statDevices: string;
  checklistName: string;
  checklistPhone: string;
  checklistAvatar: string;
  completeTitle: string;
  completeDesc: (percent: number) => string;
  completeCta: string;
  recentNotifications: string;
  recentMaterials: string;
  seeAll: string;
  noNotificationsYet: string;
  noMaterialsYet: string;
  // notifications tab
  notificationsTitle: string;
  notificationsDesc: string;
  filterAll: string;
  filterUnread: string;
  noUnread: string;
  // materials tab
  materialsTitle: string;
  materialsDesc: string;
  searchMaterials: string;
  nothingFound: string;
  badgeNew: string;
  openLink: string;
  // membership gate
  gateRejectedTitle: string;
  gateSuspendedTitle: string;
  gatePendingTitle: string;
  gateRejectedText: string;
  gateSuspendedText: string;
  gatePendingText: string;
  gateReason: string; // «Причина: »
  // profile tab
  profileTitle: string;
  profileDesc: string;
  seenAs: string;
  labelName: string;
  namePlaceholder: string;
  labelPhone: string;
  phonePlaceholder: string;
  labelEmail: string;
  emailImmutable: string;
  labelAvatarColor: string;
  avatarColorAria: (c: string) => string;
  withUsSinceRow: string; // «С нами с»
  saveFailed: string;
  profileSaved: string;
  save: string;
  // security tab
  changePwTitle: string;
  changePwDesc: string;
  currentPw: string;
  showPassword: string;
  newPw: string;
  generate: string;
  copied: string;
  copy: string;
  pwMin6Ph: string;
  repeatNewPw: string;
  pwTooShort: string;
  pwMismatch: string;
  pwChangeFailed: string;
  pwChanged: string;
  updatePw: string;
  sessionsTitle: string;
  sessionsDesc: string;
  logoutOthers: string;
  noSessions: string;
  currentSession: string;
  ipHidden: string;
  activity: string; // «активность» inline
  endSession: string;
  // device labels
  unknownDevice: string;
  device: string;
  // activity tab
  activityTitle: string;
  activityDesc: string;
  searchActivity: string;
  noActivity: string;
  // settings tab
  settingsNotifTitle: string;
  settingsNotifDesc: string;
  saving: string;
  serviceNotif: string;
  serviceNotifDesc: string;
  marketingNotif: string;
  marketingNotifDesc: string;
  settingsSaved: string;
  deleteTitle: string;
  deleteDesc: string;
  deleteAccount: string;
  deleteConfirmPrefix: string; // «Для подтверждения введите»
  deleteWord: string;
  deleteForever: string;
  cancel: string;
  deleteFailed: string;
};

const ru: SiteAccountDict = {
  cabinet: 'Кабинет',
  accountFallback: 'Личный кабинет',
  notSignedIn: 'Вы не вошли в аккаунт.',
  signIn: 'Войти',
  register: 'Регистрация',
  logout: 'Выйти',
  toSite: 'На сайт',
  closeMenu: 'Закрыть',
  openMenu: 'Меню',
  noName: 'Без имени',
  noTitle: 'Без названия',
  sidebar: {
    groupWorkspace: 'Кабинет',
    groupAccount: 'Аккаунт',
    collapse: 'Свернуть меню',
    expand: 'Развернуть меню',
    search: 'Поиск разделов…',
    noResults: 'Ничего не найдено',
  },
  networkError: 'Сеть недоступна, попробуйте ещё раз.',
  tabs: {
    overview: 'Обзор',
    profile: 'Профиль',
    materials: 'Материалы',
    notifications: 'Уведомления',
    security: 'Безопасность',
    activity: 'Обращения',
    settings: 'Настройки',
  },
  greetNight: 'Доброй ночи',
  greetMorning: 'Доброе утро',
  greetDay: 'Добрый день',
  greetEvening: 'Добрый вечер',
  withUsSince: 'с нами с',
  profileBtn: 'Профиль',
  passwordBtn: 'Пароль',
  statMaterials: 'Материалы',
  statNotifications: 'Уведомления',
  statActivity: 'Обращения',
  statDevices: 'Устройства',
  checklistName: 'Укажите имя',
  checklistPhone: 'Добавьте телефон',
  checklistAvatar: 'Выберите цвет аватара',
  completeTitle: 'Заполните профиль',
  completeDesc: (p) => `Профиль заполнен на ${p}%`,
  completeCta: 'Дополнить',
  recentNotifications: 'Последние уведомления',
  recentMaterials: 'Свежие материалы',
  seeAll: 'Все',
  noNotificationsYet: 'Уведомлений пока нет.',
  noMaterialsYet: 'Материалов пока нет.',
  notificationsTitle: 'Уведомления',
  notificationsDesc: 'Сообщения о вашем членстве и новых материалах.',
  filterAll: 'Все',
  filterUnread: 'Непрочитанные',
  noUnread: 'Непрочитанных уведомлений нет.',
  materialsTitle: 'Материалы',
  materialsDesc: 'Материалы, доступные участникам организации.',
  searchMaterials: 'Поиск по материалам…',
  nothingFound: 'Ничего не найдено по запросу.',
  badgeNew: 'Новое',
  openLink: 'Открыть',
  gateRejectedTitle: 'Заявка отклонена',
  gateSuspendedTitle: 'Доступ приостановлен',
  gatePendingTitle: 'Заявка на рассмотрении',
  gateRejectedText: 'Администратор отклонил вашу заявку на вступление.',
  gateSuspendedText: 'Ваш доступ к материалам временно приостановлен администратором.',
  gatePendingText: 'Ваша регистрация ожидает одобрения администратора. Как только заявку одобрят, здесь появятся материалы.',
  gateReason: 'Причина: ',
  profileTitle: 'Профиль',
  profileDesc: 'Ваши личные данные и оформление аккаунта.',
  seenAs: 'Так вас видят на сайте',
  labelName: 'Имя',
  namePlaceholder: 'Как к вам обращаться',
  labelPhone: 'Телефон',
  phonePlaceholder: '+7 900 000-00-00',
  labelEmail: 'Email',
  emailImmutable: 'Email используется для входа и не меняется.',
  labelAvatarColor: 'Цвет аватара',
  avatarColorAria: (c) => `Цвет ${c}`,
  withUsSinceRow: 'С нами с',
  saveFailed: 'Не удалось сохранить',
  profileSaved: 'Профиль обновлён',
  save: 'Сохранить',
  changePwTitle: 'Смена пароля',
  changePwDesc: 'Для смены пароля подтвердите текущий.',
  currentPw: 'Текущий пароль',
  showPassword: 'Показать пароль',
  newPw: 'Новый пароль',
  generate: 'Сгенерировать',
  copied: 'Скопирован',
  copy: 'Копировать',
  pwMin6Ph: 'Минимум 6 символов',
  repeatNewPw: 'Повторите новый пароль',
  pwTooShort: 'Пароль должен быть не короче 6 символов',
  pwMismatch: 'Пароли не совпадают',
  pwChangeFailed: 'Не удалось изменить пароль',
  pwChanged: 'Пароль изменён',
  updatePw: 'Обновить пароль',
  sessionsTitle: 'Активные сеансы',
  sessionsDesc: 'Устройства, на которых выполнен вход.',
  logoutOthers: 'Выйти на других',
  noSessions: 'Нет активных сеансов.',
  currentSession: 'текущий',
  ipHidden: 'IP скрыт',
  activity: 'активность',
  endSession: 'Завершить сеанс',
  unknownDevice: 'Неизвестное устройство',
  device: 'Устройство',
  activityTitle: 'Мои обращения',
  activityDesc: 'Заявки и сообщения, отправленные через формы сайта.',
  searchActivity: 'Поиск по обращениям…',
  noActivity: 'Пока нет обращений.',
  settingsNotifTitle: 'Уведомления',
  settingsNotifDesc: 'Управляйте письмами, которые вы получаете.',
  saving: 'Сохранение…',
  serviceNotif: 'Сервисные уведомления',
  serviceNotifDesc: 'Важные письма о вашем аккаунте и обращениях.',
  marketingNotif: 'Новости и акции',
  marketingNotifDesc: 'Рассылка с новостями и специальными предложениями.',
  settingsSaved: 'Настройки сохранены',
  deleteTitle: 'Удаление аккаунта',
  deleteDesc: 'Аккаунт и все связанные данные будут удалены безвозвратно.',
  deleteAccount: 'Удалить аккаунт',
  deleteConfirmPrefix: 'Для подтверждения введите',
  deleteWord: 'УДАЛИТЬ',
  deleteForever: 'Удалить навсегда',
  cancel: 'Отмена',
  deleteFailed: 'Не удалось удалить аккаунт',
};

const en: SiteAccountDict = {
  cabinet: 'Account',
  accountFallback: 'Account',
  notSignedIn: 'You are not signed in.',
  signIn: 'Sign in',
  register: 'Sign up',
  logout: 'Log out',
  toSite: 'To site',
  closeMenu: 'Close',
  openMenu: 'Menu',
  noName: 'No name',
  noTitle: 'Untitled',
  sidebar: {
    groupWorkspace: 'Workspace',
    groupAccount: 'Account',
    collapse: 'Collapse menu',
    expand: 'Expand menu',
    search: 'Search sections…',
    noResults: 'Nothing found',
  },
  networkError: 'Network unavailable, please try again.',
  tabs: {
    overview: 'Overview',
    profile: 'Profile',
    materials: 'Materials',
    notifications: 'Notifications',
    security: 'Security',
    activity: 'Requests',
    settings: 'Settings',
  },
  greetNight: 'Good night',
  greetMorning: 'Good morning',
  greetDay: 'Good afternoon',
  greetEvening: 'Good evening',
  withUsSince: 'with us since',
  profileBtn: 'Profile',
  passwordBtn: 'Password',
  statMaterials: 'Materials',
  statNotifications: 'Notifications',
  statActivity: 'Requests',
  statDevices: 'Devices',
  checklistName: 'Add your name',
  checklistPhone: 'Add a phone number',
  checklistAvatar: 'Pick an avatar color',
  completeTitle: 'Complete your profile',
  completeDesc: (p) => `Profile is ${p}% complete`,
  completeCta: 'Complete',
  recentNotifications: 'Recent notifications',
  recentMaterials: 'Latest materials',
  seeAll: 'All',
  noNotificationsYet: 'No notifications yet.',
  noMaterialsYet: 'No materials yet.',
  notificationsTitle: 'Notifications',
  notificationsDesc: 'Messages about your membership and new materials.',
  filterAll: 'All',
  filterUnread: 'Unread',
  noUnread: 'No unread notifications.',
  materialsTitle: 'Materials',
  materialsDesc: 'Materials available to organization members.',
  searchMaterials: 'Search materials…',
  nothingFound: 'Nothing found for your query.',
  badgeNew: 'New',
  openLink: 'Open',
  gateRejectedTitle: 'Request declined',
  gateSuspendedTitle: 'Access suspended',
  gatePendingTitle: 'Request under review',
  gateRejectedText: 'The administrator declined your membership request.',
  gateSuspendedText: 'Your access to materials has been temporarily suspended by the administrator.',
  gatePendingText: 'Your registration is awaiting the administrator’s approval. Once approved, materials will appear here.',
  gateReason: 'Reason: ',
  profileTitle: 'Profile',
  profileDesc: 'Your personal details and account appearance.',
  seenAs: 'This is how you appear on the site',
  labelName: 'Name',
  namePlaceholder: 'What should we call you',
  labelPhone: 'Phone',
  phonePlaceholder: '+1 555 000-0000',
  labelEmail: 'Email',
  emailImmutable: 'Email is used for sign-in and cannot be changed.',
  labelAvatarColor: 'Avatar color',
  avatarColorAria: (c) => `Color ${c}`,
  withUsSinceRow: 'With us since',
  saveFailed: 'Could not save',
  profileSaved: 'Profile updated',
  save: 'Save',
  changePwTitle: 'Change password',
  changePwDesc: 'Confirm your current password to change it.',
  currentPw: 'Current password',
  showPassword: 'Show password',
  newPw: 'New password',
  generate: 'Generate',
  copied: 'Copied',
  copy: 'Copy',
  pwMin6Ph: 'At least 6 characters',
  repeatNewPw: 'Repeat new password',
  pwTooShort: 'Password must be at least 6 characters',
  pwMismatch: 'Passwords don’t match',
  pwChangeFailed: 'Could not change password',
  pwChanged: 'Password changed',
  updatePw: 'Update password',
  sessionsTitle: 'Active sessions',
  sessionsDesc: 'Devices where you are signed in.',
  logoutOthers: 'Log out others',
  noSessions: 'No active sessions.',
  currentSession: 'current',
  ipHidden: 'IP hidden',
  activity: 'active',
  endSession: 'End session',
  unknownDevice: 'Unknown device',
  device: 'Device',
  activityTitle: 'My requests',
  activityDesc: 'Requests and messages sent through the site forms.',
  searchActivity: 'Search requests…',
  noActivity: 'No requests yet.',
  settingsNotifTitle: 'Notifications',
  settingsNotifDesc: 'Manage the emails you receive.',
  saving: 'Saving…',
  serviceNotif: 'Service notifications',
  serviceNotifDesc: 'Important emails about your account and requests.',
  marketingNotif: 'News and offers',
  marketingNotifDesc: 'A newsletter with news and special offers.',
  settingsSaved: 'Settings saved',
  deleteTitle: 'Delete account',
  deleteDesc: 'Your account and all related data will be permanently deleted.',
  deleteAccount: 'Delete account',
  deleteConfirmPrefix: 'To confirm, type',
  deleteWord: 'DELETE',
  deleteForever: 'Delete forever',
  cancel: 'Cancel',
  deleteFailed: 'Could not delete the account',
};

const hy: SiteAccountDict = {
  cabinet: 'Անձնական էջ',
  accountFallback: 'Անձնական էջ',
  notSignedIn: 'Դուք մուտք չեք գործել։',
  signIn: 'Մուտք',
  register: 'Գրանցում',
  logout: 'Դուրս գալ',
  toSite: 'Դեպի կայք',
  closeMenu: 'Փակել',
  openMenu: 'Մենյու',
  noName: 'Առանց անվան',
  noTitle: 'Առանց վերնագրի',
  sidebar: {
    groupWorkspace: 'Կաբինետ',
    groupAccount: 'Հաշիվ',
    collapse: 'Ծալել ընտրացանկը',
    expand: 'Բացել ընտրացանկը',
    search: 'Բաժինների որոնում…',
    noResults: 'Ոչինչ չի գտնվել',
  },
  networkError: 'Ցանցն անհասանելի է, փորձեք կրկին։',
  tabs: {
    overview: 'Ակնարկ',
    profile: 'Պրոֆիլ',
    materials: 'Նյութեր',
    notifications: 'Ծանուցումներ',
    security: 'Անվտանգություն',
    activity: 'Դիմումներ',
    settings: 'Կարգավորումներ',
  },
  greetNight: 'Բարի գիշեր',
  greetMorning: 'Բարի լույս',
  greetDay: 'Բարի օր',
  greetEvening: 'Բարի երեկո',
  withUsSince: 'մեզ հետ՝',
  profileBtn: 'Պրոֆիլ',
  passwordBtn: 'Գաղտնաբառ',
  statMaterials: 'Նյութեր',
  statNotifications: 'Ծանուցումներ',
  statActivity: 'Դիմումներ',
  statDevices: 'Սարքեր',
  checklistName: 'Նշեք ձեր անունը',
  checklistPhone: 'Ավելացրեք հեռախոս',
  checklistAvatar: 'Ընտրեք ավատարի գույնը',
  completeTitle: 'Լրացրեք պրոֆիլը',
  completeDesc: (p) => `Պրոֆիլը լրացված է ${p}%-ով`,
  completeCta: 'Լրացնել',
  recentNotifications: 'Վերջին ծանուցումները',
  recentMaterials: 'Նոր նյութեր',
  seeAll: 'Բոլորը',
  noNotificationsYet: 'Ծանուցումներ դեռ չկան։',
  noMaterialsYet: 'Նյութեր դեռ չկան։',
  notificationsTitle: 'Ծանուցումներ',
  notificationsDesc: 'Հաղորդագրություններ ձեր անդամության և նոր նյութերի մասին։',
  filterAll: 'Բոլորը',
  filterUnread: 'Չկարդացված',
  noUnread: 'Չկարդացված ծանուցումներ չկան։',
  materialsTitle: 'Նյութեր',
  materialsDesc: 'Կազմակերպության անդամներին հասանելի նյութեր։',
  searchMaterials: 'Որոնում նյութերում…',
  nothingFound: 'Ձեր հարցմամբ ոչինչ չգտնվեց։',
  badgeNew: 'Նոր',
  openLink: 'Բացել',
  gateRejectedTitle: 'Դիմումը մերժված է',
  gateSuspendedTitle: 'Մուտքը կասեցված է',
  gatePendingTitle: 'Դիմումը դիտարկման փուլում է',
  gateRejectedText: 'Ադմինիստրատորը մերժեց ձեր անդամակցության դիմումը։',
  gateSuspendedText: 'Ձեր մուտքը դեպի նյութեր ժամանակավորապես կասեցվել է ադմինիստրատորի կողմից։',
  gatePendingText: 'Ձեր գրանցումը սպասում է ադմինիստրատորի հաստատմանը։ Հենց դիմումը հաստատվի, նյութերն այստեղ կհայտնվեն։',
  gateReason: 'Պատճառ՝ ',
  profileTitle: 'Պրոֆիլ',
  profileDesc: 'Ձեր անձնական տվյալները և հաշվի ձևավորումը։',
  seenAs: 'Այսպես են ձեզ տեսնում կայքում',
  labelName: 'Անուն',
  namePlaceholder: 'Ինչպես դիմել ձեզ',
  labelPhone: 'Հեռախոս',
  phonePlaceholder: '+374 00 000-000',
  labelEmail: 'Email',
  emailImmutable: 'Email-ն օգտագործվում է մուտքի համար և չի փոխվում։',
  labelAvatarColor: 'Ավատարի գույն',
  avatarColorAria: (c) => `Գույն ${c}`,
  withUsSinceRow: 'Մեզ հետ՝',
  saveFailed: 'Չհաջողվեց պահպանել',
  profileSaved: 'Պրոֆիլը թարմացվեց',
  save: 'Պահպանել',
  changePwTitle: 'Գաղտնաբառի փոփոխում',
  changePwDesc: 'Գաղտնաբառը փոխելու համար հաստատեք ընթացիկը։',
  currentPw: 'Ընթացիկ գաղտնաբառ',
  showPassword: 'Ցուցադրել գաղտնաբառը',
  newPw: 'Նոր գաղտնաբառ',
  generate: 'Գեներացնել',
  copied: 'Պատճենվեց',
  copy: 'Պատճենել',
  pwMin6Ph: 'Առնվազն 6 նիշ',
  repeatNewPw: 'Կրկնեք նոր գաղտնաբառը',
  pwTooShort: 'Գաղտնաբառը պետք է լինի առնվազն 6 նիշ',
  pwMismatch: 'Գաղտնաբառերը չեն համընկնում',
  pwChangeFailed: 'Չհաջողվեց փոխել գաղտնաբառը',
  pwChanged: 'Գաղտնաբառը փոխվեց',
  updatePw: 'Թարմացնել գաղտնաբառը',
  sessionsTitle: 'Ակտիվ սեսիաներ',
  sessionsDesc: 'Սարքեր, որոնցում մուտք է կատարվել։',
  logoutOthers: 'Դուրս գալ մյուսներից',
  noSessions: 'Ակտիվ սեսիաներ չկան։',
  currentSession: 'ընթացիկ',
  ipHidden: 'IP-ն թաքցված է',
  activity: 'ակտիվություն',
  endSession: 'Ավարտել սեսիան',
  unknownDevice: 'Անհայտ սարք',
  device: 'Սարք',
  activityTitle: 'Իմ դիմումները',
  activityDesc: 'Կայքի ձևերի միջոցով ուղարկված դիմումներ և հաղորդագրություններ։',
  searchActivity: 'Որոնում դիմումներում…',
  noActivity: 'Դիմումներ դեռ չկան։',
  settingsNotifTitle: 'Ծանուցումներ',
  settingsNotifDesc: 'Կառավարեք ձեր ստացած նամակները։',
  saving: 'Պահպանվում է…',
  serviceNotif: 'Սպասարկման ծանուցումներ',
  serviceNotifDesc: 'Կարևոր նամակներ ձեր հաշվի և դիմումների մասին։',
  marketingNotif: 'Նորություններ և ակցիաներ',
  marketingNotifDesc: 'Տեղեկագիր նորություններով և հատուկ առաջարկներով։',
  settingsSaved: 'Կարգավորումները պահպանվեցին',
  deleteTitle: 'Հաշվի ջնջում',
  deleteDesc: 'Հաշիվը և բոլոր հարակից տվյալները կջնջվեն անվերադարձ։',
  deleteAccount: 'Ջնջել հաշիվը',
  deleteConfirmPrefix: 'Հաստատելու համար մուտքագրեք',
  deleteWord: 'ՋՆՋԵԼ',
  deleteForever: 'Ջնջել ընդմիշտ',
  cancel: 'Չեղարկել',
  deleteFailed: 'Չհաջողվեց ջնջել հաշիվը',
};

export const SITE_ACCOUNT: Record<Locale, SiteAccountDict> = { ru, en, hy };

export function siteAccountDict(locale: Locale): SiteAccountDict {
  return SITE_ACCOUNT[locale];
}
