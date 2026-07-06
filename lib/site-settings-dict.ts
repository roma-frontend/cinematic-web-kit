// Per-site settings UI dictionary (ru/en/hy): identity, custom domains + DNS,
// site end-users, form submissions, danger zone. Client-safe, domain-scoped.

import type { Locale } from '@/lib/seo';

export type SiteSettingsDict = {
  metaTitle: string;
  orgSectionTitle: string;
  orgSectionDesc: string;
  backToSites: string;
  openSite: string;
  saved: string;
  error: string;
  networkError: string;
  checkError: string;
  dnsNotPointing: string; // followed by details
  serverIp: string;
  // identity
  identityTitle: string;
  name: string;
  slugLabel: string;
  availableAt: string;
  and: string;
  save: string;
  // domains
  domainsTitle: string;
  domainsHint: string; // {host} placeholder
  cnameFor: string;
  aRecordFor: string;
  newDomainAria: string;
  attach: string;
  verified: string;
  awaitingDns: string;
  checkNow: string;
  check: string;
  detach: string;
  addDnsRecord: string;
  dnsName: string;
  dnsValue: string;
  copyValue: string;
  // site users
  clientsTitle: string;
  clientsHint: string;
  clientsEmpty: string;
  // submissions
  submissionsTitle: string;
  submissionsEmpty: string;
  // danger
  dangerTitle: string;
  dangerHint: string;
  deleteSite: string;
  deleteConfirmTitle: string; // {name}
  deleteConfirmDesc: string;
};

const ru: SiteSettingsDict = {
  metaTitle: 'Настройки сайта',
  orgSectionTitle: 'Организация: участники и материалы',
  orgSectionDesc: 'Одобряйте участников и публикуйте материалы, видимые только им.',
  backToSites: 'Мои сайты',
  openSite: 'Открыть сайт',
  saved: 'Сохранено.',
  error: 'Ошибка.',
  networkError: 'Сеть недоступна.',
  checkError: 'Ошибка проверки.',
  dnsNotPointing: 'DNS ещё не указывает на платформу',
  serverIp: 'IP вашего сервера',
  identityTitle: 'Основное',
  name: 'Название',
  slugLabel: 'Адрес (slug)',
  availableAt: 'Сайт доступен по',
  and: 'и',
  save: 'Сохранить',
  domainsTitle: 'Свои домены',
  domainsHint: 'Направьте домен на платформу: запись CNAME → {host} (для поддоменов) или A-запись → IP сервера, затем нажмите «Проверить».',
  cnameFor: 'для поддоменов',
  aRecordFor: 'IP сервера',
  newDomainAria: 'Новый домен',
  attach: 'Привязать',
  verified: 'подтверждён',
  awaitingDns: 'ждёт DNS · проверяем автоматически',
  checkNow: 'Проверить DNS сейчас',
  check: 'Проверить',
  detach: 'Отвязать домен',
  addDnsRecord: 'Добавьте у DNS-провайдера запись и подождите (обновление DNS занимает от минут до часов):',
  dnsName: 'имя',
  dnsValue: 'значение',
  copyValue: 'Скопировать значение',
  clientsTitle: 'Клиенты сайта',
  clientsHint: 'Пользователи, которые зарегистрировались на вашем опубликованном сайте (через блоки «Вход»/«Регистрация»). Это отдельная база — она не смешивается с аккаунтами платформы.',
  clientsEmpty: 'Пока никто не зарегистрировался. Добавьте на страницу блок «Регистрация (клиенты сайта)» в конструкторе.',
  submissionsTitle: 'Заявки с форм',
  submissionsEmpty: 'Пока пусто. Заявки с форм на опубликованном сайте будут появляться здесь.',
  dangerTitle: 'Опасная зона',
  dangerHint: 'Удаление сайта необратимо: страницы, домены и заявки будут стёрты.',
  deleteSite: 'Удалить сайт',
  deleteConfirmTitle: 'Удалить сайт «{name}»?',
  deleteConfirmDesc: 'Сайт будет удалён безвозвратно: страницы, домены и заявки будут потеряны.',
};

const en: SiteSettingsDict = {
  metaTitle: 'Site settings',
  orgSectionTitle: 'Organization: members and materials',
  orgSectionDesc: 'Approve members and publish materials visible only to them.',
  backToSites: 'My sites',
  openSite: 'Open site',
  saved: 'Saved.',
  error: 'Error.',
  networkError: 'Network unavailable.',
  checkError: 'Verification error.',
  dnsNotPointing: 'DNS doesn’t point to the platform yet',
  serverIp: 'your server IP',
  identityTitle: 'General',
  name: 'Name',
  slugLabel: 'Address (slug)',
  availableAt: 'The site is available at',
  and: 'and',
  save: 'Save',
  domainsTitle: 'Custom domains',
  domainsHint: 'Point your domain to the platform: a CNAME → {host} record (for subdomains) or an A record → server IP, then click “Check”.',
  cnameFor: 'for subdomains',
  aRecordFor: 'server IP',
  newDomainAria: 'New domain',
  attach: 'Attach',
  verified: 'verified',
  awaitingDns: 'awaiting DNS · checking automatically',
  checkNow: 'Check DNS now',
  check: 'Check',
  detach: 'Detach domain',
  addDnsRecord: 'Add a record at your DNS provider and wait (DNS propagation takes minutes to hours):',
  dnsName: 'name',
  dnsValue: 'value',
  copyValue: 'Copy value',
  clientsTitle: 'Site customers',
  clientsHint: 'Users who registered on your published site (via the Login/Register blocks). This is a separate database — it doesn’t mix with platform accounts.',
  clientsEmpty: 'No one has registered yet. Add a “Register (site customers)” block to a page in the builder.',
  submissionsTitle: 'Form submissions',
  submissionsEmpty: 'Empty so far. Submissions from forms on the published site will appear here.',
  dangerTitle: 'Danger zone',
  dangerHint: 'Deleting the site is irreversible: pages, domains and submissions will be erased.',
  deleteSite: 'Delete site',
  deleteConfirmTitle: 'Delete the “{name}” site?',
  deleteConfirmDesc: 'The site will be permanently deleted: pages, domains and submissions will be lost.',
};

const hy: SiteSettingsDict = {
  metaTitle: 'Կայքի կարգավորումներ',
  orgSectionTitle: 'Կազմակերպություն. մասնակիցներ և նյութեր',
  orgSectionDesc: 'Հաստատեք մասնակիցներին և հրապարակեք միայն նրանց տեսանելի նյութեր։',
  backToSites: 'Իմ կայքերը',
  openSite: 'Բացել կայքը',
  saved: 'Պահպանված է։',
  error: 'Սխալ։',
  networkError: 'Ցանցն անհասանելի է։',
  checkError: 'Ստուգման սխալ։',
  dnsNotPointing: 'DNS-ը դեռ չի ուղղորդում դեպի հարթակ',
  serverIp: 'ձեր սերվերի IP-ն',
  identityTitle: 'Հիմնական',
  name: 'Անվանում',
  slugLabel: 'Հասցե (slug)',
  availableAt: 'Կայքը հասանելի է',
  and: 'և',
  save: 'Պահպանել',
  domainsTitle: 'Սեփական տիրույթներ',
  domainsHint: 'Ուղղորդեք տիրույթը դեպի հարթակ՝ CNAME → {host} գրառում (ենթատիրույթների համար) կամ A-գրառում → սերվերի IP, ապա սեղմեք «Ստուգել»։',
  cnameFor: 'ենթատիրույթների համար',
  aRecordFor: 'սերվերի IP',
  newDomainAria: 'Նոր տիրույթ',
  attach: 'Կապել',
  verified: 'հաստատված',
  awaitingDns: 'սպասում է DNS · ստուգում ենք ավտոմատ',
  checkNow: 'Ստուգել DNS-ը հիմա',
  check: 'Ստուգել',
  detach: 'Անջատել տիրույթը',
  addDnsRecord: 'Ավելացրեք գրառում ձեր DNS-մատակարարի մոտ և սպասեք (DNS-ի թարմացումը տևում է րոպեներից մինչև ժամեր).',
  dnsName: 'անուն',
  dnsValue: 'արժեք',
  copyValue: 'Պատճենել արժեքը',
  clientsTitle: 'Կայքի հաճախորդներ',
  clientsHint: 'Օգտատերեր, ովքեր գրանցվել են ձեր հրապարակված կայքում («Մուտք»/«Գրանցում» բլոկների միջոցով)։ Սա առանձին բազա է — չի խառնվում հարթակի հաշիվների հետ։',
  clientsEmpty: 'Դեռ ոչ ոք չի գրանցվել։ Ավելացրեք էջին «Գրանցում (կայքի հաճախորդներ)» բլոկը կառուցիչում։',
  submissionsTitle: 'Ձևերի հայտեր',
  submissionsEmpty: 'Դեռ դատարկ է։ Հրապարակված կայքի ձևերի հայտերն այստեղ կհայտնվեն։',
  dangerTitle: 'Վտանգավոր գոտի',
  dangerHint: 'Կայքի ջնջումն անշրջելի է. էջերը, տիրույթները և հայտերը կջնջվեն։',
  deleteSite: 'Ջնջել կայքը',
  deleteConfirmTitle: '«{name}» կայքը ջնջե՞լ։',
  deleteConfirmDesc: 'Կայքը կջնջվի անվերադարձ. էջերը, տիրույթները և հայտերը կկորչեն։',
};

export const SITE_SETTINGS: Record<Locale, SiteSettingsDict> = { ru, en, hy };

export function siteSettingsDict(locale: Locale): SiteSettingsDict {
  return SITE_SETTINGS[locale];
}
