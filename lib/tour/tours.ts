import type { Locale } from '@/lib/seo';
import type { TourDef, TourId, TourStep } from '@/lib/tour/types';

// Localized step content + selectors for every tour. The engine (see
// components/tour/onboarding-tour.tsx) is text-agnostic; here we bind real DOM
// anchors ([data-tour="…"]) to localized copy. Adding a tour for another tool
// is just another entry in TOURS below.

export interface TourChrome {
  back: string; next: string; done: string; skip: string;
  step: string; // "{n} / {total}"
  clickHere: string;
  replay: string;
  soundOn: string; soundOff: string;
}

const CHROME: Record<Locale, TourChrome> = {
  ru: { back: 'Назад', next: 'Далее', done: 'Готово', skip: 'Пропустить', step: '{n} из {total}', clickHere: 'нажмите сюда', replay: 'Показать тур', soundOn: 'Звук вкл.', soundOff: 'Звук выкл.' },
  en: { back: 'Back', next: 'Next', done: 'Done', skip: 'Skip', step: '{n} of {total}', clickHere: 'click here', replay: 'Show tour', soundOn: 'Sound on', soundOff: 'Sound off' },
  hy: { back: 'Հետ', next: 'Հաջորդ', done: 'Պատրաստ է', skip: 'Բաց թողնել', step: '{n} / {total}', clickHere: 'սեղմեք այստեղ', replay: 'Ցույց տալ շրջայցը', soundOn: 'Ձայնը միացված', soundOff: 'Ձայնն անջատված' },
};

export function tourChrome(locale: Locale): TourChrome {
  return CHROME[locale] ?? CHROME.en;
}

// Helper: click a real element (used by onEnter to reveal a tab's content).
const click = (sel: string) => () => {
  if (typeof document === 'undefined') return;
  (document.querySelector(sel) as HTMLElement | null)?.click();
};


// ── site-content: create a course in the dashboard ──────────────────────────
function siteContentSteps(locale: Locale): TourStep[] {
  // The site panel groups tools into tabs; switch to the right one before each
  // step so its target (rendered only when active) exists to spotlight.
  const toCourses = click('[data-tab="courses"]');
  const toDocuments = click('[data-tab="documents"]');
  const ru: TourStep[] = [
    { title: '👋 Добро пожаловать!', body: 'Покажу за минуту, как наполнить площадку контентом для ваших клиентов — курсами, документами и материалами. Поехали!', placement: 'center', highlight: false },
    { target: '[data-tour="courses"]', title: '🎓 Раздел «Курсы»', body: 'Здесь вы создаёте курсы для участников. Каждый курс — это набор уроков с видео, текстом и вложениями.', placement: 'top', onEnter: toCourses },
    { target: '[data-tour="course-title"]', title: '✍️ Название курса', body: 'Впишите название курса — например «Введение в продукт». Ниже можно добавить короткое описание.', placement: 'bottom', pointer: true, onEnter: toCourses },
    { target: '[data-tour="course-add"]', title: '➕ Создать курс', body: 'Нажмите — курс появится в списке. Затем раскройте его и добавьте уроки: заголовок, текст, ссылку на видео и файл-вложение.', placement: 'top', pointer: true, onEnter: toCourses },
    { target: '[data-tour="documents"]', title: '📄 Документы', body: 'Загружайте файлы (PDF, видео, изображения) — участники увидят их в своём кабинете и на сайте. До 64 МБ на файл.', placement: 'top', onEnter: toDocuments },
    { title: '🚀 Отлично!', body: 'Контент готов. Теперь откройте конструктор (кнопка «Edit» у сайта) и добавьте блок «Курсы» на лендинг — покажу как в туре конструктора.', placement: 'center', highlight: false },
  ];
  const en: TourStep[] = [
    { title: '👋 Welcome!', body: 'In a minute I’ll show you how to fill your site with content for your clients — courses, documents and materials. Let’s go!', placement: 'center', highlight: false },
    { target: '[data-tour="courses"]', title: '🎓 Courses section', body: 'This is where you create courses for members. Each course is a set of lessons with video, text and attachments.', placement: 'top', onEnter: toCourses },
    { target: '[data-tour="course-title"]', title: '✍️ Course title', body: 'Type a course title — e.g. “Getting started”. You can add a short description below.', placement: 'bottom', pointer: true, onEnter: toCourses },
    { target: '[data-tour="course-add"]', title: '➕ Create course', body: 'Click and the course appears in the list. Then expand it and add lessons: title, text, a video link and a file attachment.', placement: 'top', pointer: true, onEnter: toCourses },
    { target: '[data-tour="documents"]', title: '📄 Documents', body: 'Upload files (PDF, video, images) — members see them in their cabinet and on the site. Up to 64 MB per file.', placement: 'top', onEnter: toDocuments },
    { title: '🚀 Great!', body: 'Content ready. Now open the builder (“Edit” on the site) and add a “Courses” block to the landing — I’ll show you in the builder tour.', placement: 'center', highlight: false },
  ];
  const hy: TourStep[] = [
    { title: '👋 Բարի գալուստ։', body: 'Մեկ րոպեում ցույց կտամ՝ ինչպես լցնել ձեր հարթակը բովանդակությամբ ձեր հաճախորդների համար՝ դասընթացներ, փաստաթղթեր և նյութեր։', placement: 'center', highlight: false },
    { target: '[data-tour="courses"]', title: '🎓 «Դասընթացներ» բաժին', body: 'Այստեղ դուք ստեղծում եք դասընթացներ անդամների համար։ Յուրաքանչյուր դասընթաց՝ դասերի հավաքածու է՝ վիդեոյով, տեքստով և կցորդներով։', placement: 'top', onEnter: toCourses },
    { target: '[data-tour="course-title"]', title: '✍️ Դասընթացի անվանում', body: 'Մուտքագրեք դասընթացի անվանումը։ Ներքևում կարող եք ավելացնել կարճ նկարագրություն։', placement: 'bottom', pointer: true, onEnter: toCourses },
    { target: '[data-tour="course-add"]', title: '➕ Ստեղծել դասընթաց', body: 'Սեղմեք՝ դասընթացը կհայտնվի ցանկում։ Ապա բացեք այն և ավելացրեք դասեր՝ վերնագիր, տեքստ, վիդեոյի հղում և կցորդ։', placement: 'top', pointer: true, onEnter: toCourses },
    { target: '[data-tour="documents"]', title: '📄 Փաստաթղթեր', body: 'Վերբեռնեք ֆայլեր (PDF, վիդեո, նկարներ)՝ անդամները կտեսնեն դրանք իրենց էջում և կայքում։ Մինչև 64 ՄԲ ֆայլը։', placement: 'top', onEnter: toDocuments },
    { title: '🚀 Հիանալի է։', body: 'Բովանդակությունը պատրաստ է։ Այժմ բացեք կառուցիչը («Edit») և ավելացրեք «Դասընթացներ» բլոկը լենդինգում։', placement: 'center', highlight: false },
  ];
  return locale === 'ru' ? ru : locale === 'hy' ? hy : en;
}


// ── studio-builder: place the Courses block + publish ───────────────────────
function studioBuilderSteps(locale: Locale): TourStep[] {
  const toBlocks = click('[data-tour="tab-blocks"]');
  const ru: TourStep[] = [
    { title: '🎬 Конструктор сайта', body: 'Это визуальный редактор вашего сайта. Соберём страницу из блоков и добавим на неё ваши курсы. Покажу за 30 секунд.', placement: 'center', highlight: false },
    { target: '[data-tour="tab-pages"]', title: '📄 Вкладка «Страницы»', body: 'Здесь вы выбираете и создаёте страницы сайта. Курсы можно положить на любую — например, на главную.', placement: 'bottom' },
    { target: '[data-tour="tab-blocks"]', title: '🧱 Вкладка «Блоки»', body: 'А тут — все элементы, из которых строится страница. Открываю её для вас…', placement: 'bottom', onEnter: toBlocks },
    { target: '[data-tour="palette-search"]', title: '🔎 Поиск блока', body: 'Впишите «курс» — и найдётся блок «Курсы (клиенты сайта)». Рядом есть «Документы» и «Материалы».', placement: 'bottom', pointer: true, onEnter: toBlocks },
    { target: '[data-tour="palette"]', title: '✨ Добавьте блок', body: 'Нажмите на блок — он встанет на страницу. Карточки курсов появятся автоматически из того, что вы создали в панели сайта.', placement: 'right', pointer: true, onEnter: toBlocks },
    { title: '🚀 Публикация', body: 'Готово! Вернитесь в «Мои сайты» и нажмите «Опубликовать». Одобренные участники увидят курсы на сайте и в своём кабинете. Успехов!', placement: 'center', highlight: false },
  ];
  const en: TourStep[] = [
    { title: '🎬 Site builder', body: 'This is the visual editor for your site. We’ll compose a page from blocks and add your courses to it. 30 seconds, let’s go.', placement: 'center', highlight: false },
    { target: '[data-tour="tab-pages"]', title: '📄 “Pages” tab', body: 'Here you pick and create the site’s pages. Courses can go on any page — the home page, for example.', placement: 'bottom' },
    { target: '[data-tour="tab-blocks"]', title: '🧱 “Blocks” tab', body: 'And here are all the elements a page is built from. Opening it for you…', placement: 'bottom', onEnter: toBlocks },
    { target: '[data-tour="palette-search"]', title: '🔎 Find a block', body: 'Type “course” to find the “Courses (site clients)” block. “Documents” and “Materials” are right next to it.', placement: 'bottom', pointer: true, onEnter: toBlocks },
    { target: '[data-tour="palette"]', title: '✨ Add the block', body: 'Click a block and it drops onto the page. Course cards appear automatically from what you created in the site panel.', placement: 'right', pointer: true, onEnter: toBlocks },
    { title: '🚀 Publish', body: 'Done! Go back to “My sites” and hit “Publish”. Approved members will see the courses on the site and in their cabinet. Enjoy!', placement: 'center', highlight: false },
  ];
  const hy: TourStep[] = [
    { title: '🎬 Կայքի կառուցիչ', body: 'Սա ձեր կայքի տեսողական խմբագրիչն է։ Կկազմենք էջ բլոկներից և կավելացնենք ձեր դասընթացները։', placement: 'center', highlight: false },
    { target: '[data-tour="tab-pages"]', title: '📄 «Էջեր» ներդիր', body: 'Այստեղ դուք ընտրում և ստեղծում եք կայքի էջերը։ Դասընթացները կարելի է դնել ցանկացած էջում։', placement: 'bottom' },
    { target: '[data-tour="tab-blocks"]', title: '🧱 «Բլոկներ» ներդիր', body: 'Իսկ այստեղ բոլոր տարրերն են, որոնցից կառուցվում է էջը։ Բացում եմ այն ձեզ համար…', placement: 'bottom', onEnter: toBlocks },
    { target: '[data-tour="palette-search"]', title: '🔎 Գտեք բլոկը', body: 'Մուտքագրեք «դասընթաց»՝ գտնելու «Դասընթացներ» բլոկը։ Կողքին կան «Փաստաթղթեր» և «Նյութեր»։', placement: 'bottom', pointer: true, onEnter: toBlocks },
    { target: '[data-tour="palette"]', title: '✨ Ավելացրեք բլոկը', body: 'Սեղմեք բլոկի վրա՝ այն կհայտնվի էջում։ Դասընթացների քարտերն ավտոմատ կհայտնվեն։', placement: 'right', pointer: true, onEnter: toBlocks },
    { title: '🚀 Հրապարակում', body: 'Պատրաստ է։ Վերադարձեք «Իմ կայքերը» և սեղմեք «Հրապարակել»։ Հաստատված անդամները կտեսնեն դասընթացները։', placement: 'center', highlight: false },
  ];
  return locale === 'ru' ? ru : locale === 'hy' ? hy : en;
}

export function getTour(id: TourId, locale: Locale): TourDef {
  const steps =
    id === 'studio-builder' ? studioBuilderSteps(locale)
    : id === 'dashboard-sites' ? dashboardSitesSteps(locale)
    : id === 'dashboard-overview' ? dashboardOverviewSteps(locale)
    : siteContentSteps(locale);
  return { id, steps };
}

// ── dashboard-overview: the very first screen — point to "My sites" ─────────
function dashboardOverviewSteps(locale: Locale): TourStep[] {
  const ru: TourStep[] = [
    { title: '👋 Привет!', body: 'Это ваш дашборд — общая картина по сайтам. За 20 секунд покажу, откуда начать работу с клиентами.', placement: 'center', highlight: false },
    { target: '[data-tour="nav-sites"]', title: '🌐 Откройте «Мои сайты»', body: 'Нажмите сюда. Именно в «Мои сайты» вы управляете сайтом и через кнопку «Настройки» создаёте курсы, документы и материалы для клиентов. Кликните — и я продолжу уже там.', placement: 'right', pointer: true },
  ];
  const en: TourStep[] = [
    { title: '👋 Hi there!', body: 'This is your dashboard — the overview of your sites. In 20 seconds I’ll show you where to start working with clients.', placement: 'center', highlight: false },
    { target: '[data-tour="nav-sites"]', title: '🌐 Open “My sites”', body: 'Click here. “My sites” is where you manage a site and — via its “Settings” button — create courses, documents and materials for clients. Click it and I’ll continue there.', placement: 'right', pointer: true },
  ];
  const hy: TourStep[] = [
    { title: '👋 Ողջո՜ւյն', body: 'Սա ձեր վահանակն է՝ ձեր կայքերի ընդհանուր պատկերը։ 20 վայրկյանում ցույց կտամ՝ որտեղից սկսել։', placement: 'center', highlight: false },
    { target: '[data-tour="nav-sites"]', title: '🌐 Բացեք «Իմ կայքերը»', body: 'Սեղմեք այստեղ։ «Իմ կայքերը» բաժնում դուք կառավարում եք կայքը և «Կարգավորումներ» կոճակով ստեղծում դասընթացներ, փաստաթղթեր ու նյութեր հաճախորդների համար։', placement: 'right', pointer: true },
  ];
  return locale === 'ru' ? ru : locale === 'hy' ? hy : en;
}

// ── dashboard-sites: the entry tour — where everything lives ────────────────
function dashboardSitesSteps(locale: Locale): TourStep[] {
  const ru: TourStep[] = [
    { title: '👋 Добро пожаловать!', body: 'Это ваша панель управления. Здесь живут ваши сайты. За минуту покажу, где создавать курсы, документы и материалы для клиентов.', placement: 'center', highlight: false },
    { target: '[data-tour="create-site"]', title: '➕ Создать сайт', body: 'Здесь создаётся новый сайт: впишите название и нажмите «Создать». Каждый сайт — это отдельная площадка со своими клиентами.', placement: 'bottom', pointer: true },
    { target: '[data-tour="site-card"]', title: '🗂️ Ваш сайт', body: 'Вот карточка сайта. Отсюда — четыре действия: редактировать, открыть, опубликовать и настройки.', placement: 'top' },
    { target: '[data-tour="site-settings"]', title: '⚙️ Настройки — здесь создаётся контент!', body: 'Самое важное: кнопка «Настройки» ведёт в панель, где вы создаёте КУРСЫ, загружаете ДОКУМЕНТЫ и пишете МАТЕРИАЛЫ для клиентов. Нажмите её, чтобы начать.', placement: 'bottom', pointer: true },
    { target: '[data-tour="site-edit"]', title: '✏️ Конструктор', body: 'Кнопка «Edit» открывает визуальный конструктор — там вы оформляете страницы и ставите блок «Курсы» на лендинг.', placement: 'bottom', pointer: true },
    { title: '🚀 Порядок действий', body: 'Настройки → создать курс/документ → Конструктор → добавить блок «Курсы» → Опубликовать. Клиенты увидят всё на сайте и в своём кабинете. Поехали!', placement: 'center', highlight: false },
  ];
  const en: TourStep[] = [
    { title: '👋 Welcome!', body: 'This is your dashboard. Your sites live here. In a minute I’ll show you where to create courses, documents and materials for your clients.', placement: 'center', highlight: false },
    { target: '[data-tour="create-site"]', title: '➕ Create a site', body: 'Create a new site here: type a name and hit “Create”. Each site is a separate space with its own clients.', placement: 'bottom', pointer: true },
    { target: '[data-tour="site-card"]', title: '🗂️ Your site', body: 'Here’s a site card. Four actions live here: edit, open, publish and settings.', placement: 'top' },
    { target: '[data-tour="site-settings"]', title: '⚙️ Settings — content lives here!', body: 'Most important: the “Settings” button opens the panel where you create COURSES, upload DOCUMENTS and write MATERIALS for clients. Click it to start.', placement: 'bottom', pointer: true },
    { target: '[data-tour="site-edit"]', title: '✏️ Builder', body: 'The “Edit” button opens the visual builder — that’s where you design pages and place the “Courses” block on the landing.', placement: 'bottom', pointer: true },
    { title: '🚀 The flow', body: 'Settings → create a course/document → Builder → add the “Courses” block → Publish. Clients see everything on the site and in their cabinet. Let’s go!', placement: 'center', highlight: false },
  ];
  const hy: TourStep[] = [
    { title: '👋 Բարի գալուստ։', body: 'Սա ձեր կառավարման վահանակն է։ Այստեղ են ձեր կայքերը։ Ցույց կտամ, թե որտեղ ստեղծել դասընթացներ, փաստաթղթեր և նյութեր հաճախորդների համար։', placement: 'center', highlight: false },
    { target: '[data-tour="create-site"]', title: '➕ Ստեղծել կայք', body: 'Այստեղ ստեղծվում է նոր կայք՝ մուտքագրեք անվանումը և սեղմեք «Ստեղծել»։ Յուրաքանչյուր կայք առանձին հարթակ է՝ իր հաճախորդներով։', placement: 'bottom', pointer: true },
    { target: '[data-tour="site-card"]', title: '🗂️ Ձեր կայքը', body: 'Ահա կայքի քարտը։ Այստեղ չորս գործողություն կա՝ խմբագրել, բացել, հրապարակել և կարգավորումներ։', placement: 'top' },
    { target: '[data-tour="site-settings"]', title: '⚙️ Կարգավորումներ — բովանդակությունն այստեղ է!', body: 'Ամենակարևորը՝ «Կարգավորումներ» կոճակը բացում է վահանակը, որտեղ դուք ստեղծում եք ԴԱՍԸՆԹԱՑՆԵՐ, վերբեռնում ՓԱՍՏԱԹՂԹԵՐ և գրում ՆՅՈՒԹԵՐ հաճախորդների համար։', placement: 'bottom', pointer: true },
    { target: '[data-tour="site-edit"]', title: '✏️ Կառուցիչ', body: '«Edit» կոճակը բացում է տեսողական կառուցիչը՝ այնտեղ դուք ձևավորում եք էջերը և տեղադրում «Դասընթացներ» բլոկը լենդինգում։', placement: 'bottom', pointer: true },
    { title: '🚀 Հերթականությունը', body: 'Կարգավորումներ → ստեղծել դասընթաց → Կառուցիչ → ավելացնել «Դասընթացներ» բլոկը → Հրապարակել։ Հաճախորդները կտեսնեն ամեն ինչ։', placement: 'center', highlight: false },
  ];
  return locale === 'ru' ? ru : locale === 'hy' ? hy : en;
}
