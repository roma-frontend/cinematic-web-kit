// Studio page dictionary (ru/en/hy). Domain-scoped, client-safe.

import type { Locale } from '@/lib/seo';

export type StudioDict = {
  blockLabels: Record<string, string>;
  tabs: { landing: string; generate: string; images: string; theme: string; content: string; layout: string; config: string };
  // header
  brand: string;
  headerSub: string;
  builderBtn: string;
  toHome: string;
  studioBadge: string;
  // messages
  error: string;
  saveError: string;
  // landing
  landingBuilderTitle: string;
  landingBuilderDesc: string;
  openLandingBuilder: string;
  quickEditHint: string;
  hero: string;
  badge: string;
  heading: string;
  subheading: string;
  btn1Label: string; btn1Href: string; btn2Label: string; btn2Href: string;
  noteUnderButtons: string;
  howItWorks: string;
  sectionTitle: string; sectionSubtitle: string;
  step: string; titleph: string; textPh: string;
  features: string;
  themesBlock: string;
  finalCta: string;
  saveLanding: string;
  landingSaved: string;
  cannotOpenBuilder: string;
  // generate
  briefLabel: string;
  briefPlaceholder: string;
  uploadMd: string;
  styleAuto: string;
  buildWholePage: string;
  onePrompt: string;
  planTitle: string; // {n}
  generatingSections: string;
  generateAll: string;
  afterReady: string;
  pipelineLogs: string;
  stateError: string; stateQueued: string;
  retryFailed: string; // {title} {n}
  promptTitle: string;
  copy: string;
  titlePh: string;
  createVideo: string; creatingVideo: string;
  needKey1: string; needKey2: string;
  genOptimizing: string;
  renderNote: string;
  doneClip: string;
  genFailed: string;
  emptyStream: string; streamNoResult: string;
  // images
  imgSectionTitle: string;
  imgFreeNote: string;
  imgPromptPh: string;
  imgGenerate: string; imgGenerating: string;
  imgGallery: string;
  imgEmpty: string;
  imgUseHint: string;
  imgFailed: string;
  imgDownload: string; imgDelete: string; imgCopied: string;
  // theme
  siteTheme: string;
  themeAuto: string;
  suggestByBrief: string;
  applyToSite: string;
  themePicked: string; // {label} {via}
  viaLlm: string; viaKeywords: string;
  themeSaved: string; // {theme}
  cannotPick: string;
  // content
  sectionContent: string;
  deleteSection: string;
  ctaLabelPh: string; ctaHrefPh: string;
  saveContent: string;
  contentSaved: string; // {n}
  noContent: string;
  // layout
  pageBuilder: string;
  up: string; down: string; remove: string;
  noBlocks: string;
  add: string; fromTheme: string; reset: string; save: string;
  resetToTheme: string; layoutSaved: string;
  imported: string; // {list}
  invalidJson: string;
  // config
  siteConfig: string;
  exportJson: string; importJson: string;
  // preview
  preview: string;
  open: string; refresh: string;
  resizeHint: string;
  previewTitle: string;
};

const ru: StudioDict = {
  blockLabels: {
    hero: 'Герой', split: 'Сплит (видео+текст)', cards: 'Карточки', mosaic: 'Мозаика',
    sticky: 'Sticky-история', background: 'Фон-секция', beams: 'Beams-баннер', marquee: 'Бегущая строка',
  },
  tabs: { landing: 'Лендинг', generate: 'Видео', images: 'Картинки', theme: 'Тема', content: 'Контент', layout: 'Композиция', config: 'Конфигурация' },
  brand: 'Студия',
  headerSub: 'Генерация видео и картинок · тема · композиция страницы',
  builderBtn: 'Конструктор сайта',
  toHome: 'На главную',
  studioBadge: 'Cinematic Studio',
  error: 'Ошибка',
  saveError: 'Ошибка сохранения',
  landingBuilderTitle: 'Конструктор лендинга',
  landingBuilderDesc: 'Отдельный конструктор только этого лендинга: секции, карточки, бейджи, header, footer, меню, варианты блоков, hover-эффекты, анимации, видео. «Сохранить» — и главная «/» сразу обновляется.',
  openLandingBuilder: 'Открыть конструктор лендинга',
  quickEditHint: 'Ниже — быстрое редактирование текстов (герой/секции/CTA). Для полной свободы используйте конструктор выше.',
  hero: 'Герой',
  badge: 'Бейдж',
  heading: 'Заголовок',
  subheading: 'Подзаголовок',
  btn1Label: 'Кнопка 1 — текст', btn1Href: 'Кнопка 1 — ссылка', btn2Label: 'Кнопка 2 — текст', btn2Href: 'Кнопка 2 — ссылка',
  noteUnderButtons: 'Подпись под кнопками',
  howItWorks: 'Как это работает',
  sectionTitle: 'Заголовок секции', sectionSubtitle: 'Подзаголовок',
  step: 'Шаг', titleph: 'Заголовок', textPh: 'Текст',
  features: 'Возможности',
  themesBlock: 'Блок тем',
  finalCta: 'Финальный призыв (CTA)',
  saveLanding: 'Сохранить лендинг',
  landingSaved: 'Лендинг сохранён',
  cannotOpenBuilder: 'Не удалось открыть конструктор',
  briefLabel: 'Бриф или .md',
  briefPlaceholder: 'Напр.: Кофейный бренд. Пар над свежим эспрессо, тёплый утренний свет. Секции: пуровер, латте-арт, обжарка зёрен.',
  uploadMd: 'Загрузить .md',
  styleAuto: 'Авто (по брифу)',
  buildWholePage: 'Собрать всю страницу',
  onePrompt: 'Один промпт',
  planTitle: 'План страницы — {n} секц.',
  generatingSections: 'Генерируем секции…',
  generateAll: 'Сгенерировать все секции',
  afterReady: 'После готовности — открыть главную →',
  pipelineLogs: 'Логи пайплайна',
  stateError: 'ошибка', stateQueued: 'в очереди',
  retryFailed: '[retry] «{title}»: попытка {n} не удалась, повтор…',
  promptTitle: 'Кинематографический промпт',
  copy: 'Копировать',
  titlePh: 'Заголовок',
  createVideo: 'Создать видео', creatingVideo: 'Создаём видео…',
  needKey1: 'Нужен', needKey2: 'в', 
  genOptimizing: 'Генерация и оптимизация…',
  renderNote: 'Видео-модели рендерят от 1 до нескольких минут — окно можно не закрывать.',
  doneClip: 'Готово — клип добавлен на сайт',
  genFailed: 'Не удалось сгенерировать',
  emptyStream: 'Пустой ответ сервера (нет потока)', streamNoResult: 'Поток завершился без результата',
  imgSectionTitle: 'Генератор картинок',
  imgFreeNote: 'Бесплатно — Pollinations.ai, API-ключ не нужен. Одна картинка рендерится 10–30 секунд.',
  imgPromptPh: 'Напр.: Чашка эспрессо на мраморном столе, пар, тёплый утренний свет',
  imgGenerate: 'Сгенерировать', imgGenerating: 'Генерируем…',
  imgGallery: 'Галерея картинок',
  imgEmpty: 'Пока нет картинок — опишите сцену выше и нажмите «Сгенерировать».',
  imgUseHint: 'Скопируйте URL и вставьте в блок «Картинка» в конструкторе — или используйте как фон секции.',
  imgFailed: 'Не удалось сгенерировать картинку',
  imgDownload: 'Скачать', imgDelete: 'Удалить', imgCopied: 'Скопировано',
  siteTheme: 'Тема сайта',
  themeAuto: 'Авто (по контенту)',
  suggestByBrief: 'Подобрать по брифу',
  applyToSite: 'Применить к сайту',
  themePicked: 'Подобрано: {label} ({via})',
  viaLlm: 'LLM', viaKeywords: 'по ключевым словам',
  themeSaved: 'Тема сайта сохранена: {theme}',
  cannotPick: 'Не удалось подобрать',
  sectionContent: 'Контент секций',
  deleteSection: 'Удалить секцию',
  ctaLabelPh: 'Текст кнопки (CTA)', ctaHrefPh: 'Ссылка кнопки (/...)',
  saveContent: 'Сохранить контент',
  contentSaved: 'Сохранено секций: {n}',
  noContent: 'Пока нет секций с контентом. Сгенерируй видео на вкладке «Генерация».',
  pageBuilder: 'Конструктор страницы',
  up: 'Вверх', down: 'Вниз', remove: 'Удалить',
  noBlocks: 'Нет блоков — добавьте ниже.',
  add: 'Добавить', fromTheme: 'Из темы', reset: 'Сброс', save: 'Сохранить',
  resetToTheme: 'Сброшено к теме', layoutSaved: 'Композиция сохранена',
  imported: 'Импортировано: {list} — перезагрузка…',
  invalidJson: 'Некорректный JSON-файл',
  siteConfig: 'Конфигурация сайта',
  exportJson: 'Экспорт JSON', importJson: 'Импорт JSON',
  preview: 'Предпросмотр — /',
  open: 'Открыть', refresh: 'Обновить',
  resizeHint: 'Потяни, чтобы изменить ширину панели',
  previewTitle: 'Предпросмотр сайта',
};

const en: StudioDict = {
  blockLabels: {
    hero: 'Hero', split: 'Split (video+text)', cards: 'Cards', mosaic: 'Mosaic',
    sticky: 'Sticky story', background: 'Background section', beams: 'Beams banner', marquee: 'Marquee',
  },
  tabs: { landing: 'Landing', generate: 'Video', images: 'Images', theme: 'Theme', content: 'Content', layout: 'Layout', config: 'Config' },
  brand: 'Studio',
  headerSub: 'Video & image generation · theme · page composition',
  builderBtn: 'Site builder',
  toHome: 'Home',
  studioBadge: 'Cinematic Studio',
  error: 'Error',
  saveError: 'Save error',
  landingBuilderTitle: 'Landing builder',
  landingBuilderDesc: 'A dedicated builder for this landing only: sections, cards, badges, header, footer, menu, block variants, hover effects, animations, video. Hit “Save” and the home page “/” updates instantly.',
  openLandingBuilder: 'Open landing builder',
  quickEditHint: 'Below is quick text editing (hero/sections/CTA). For full freedom, use the builder above.',
  hero: 'Hero',
  badge: 'Badge',
  heading: 'Heading',
  subheading: 'Subheading',
  btn1Label: 'Button 1 — text', btn1Href: 'Button 1 — link', btn2Label: 'Button 2 — text', btn2Href: 'Button 2 — link',
  noteUnderButtons: 'Note under buttons',
  howItWorks: 'How it works',
  sectionTitle: 'Section title', sectionSubtitle: 'Subtitle',
  step: 'Step', titleph: 'Title', textPh: 'Text',
  features: 'Features',
  themesBlock: 'Themes block',
  finalCta: 'Final call to action (CTA)',
  saveLanding: 'Save landing',
  landingSaved: 'Landing saved',
  cannotOpenBuilder: 'Could not open the builder',
  briefLabel: 'Brief or .md',
  briefPlaceholder: 'E.g.: Coffee brand. Steam over fresh espresso, warm morning light. Sections: pour-over, latte art, bean roasting.',
  uploadMd: 'Upload .md',
  styleAuto: 'Auto (from brief)',
  buildWholePage: 'Build whole page',
  onePrompt: 'Single prompt',
  planTitle: 'Page plan — {n} sections',
  generatingSections: 'Generating sections…',
  generateAll: 'Generate all sections',
  afterReady: 'When ready — open the home page →',
  pipelineLogs: 'Pipeline logs',
  stateError: 'error', stateQueued: 'queued',
  retryFailed: '[retry] “{title}”: attempt {n} failed, retrying…',
  promptTitle: 'Cinematic prompt',
  copy: 'Copy',
  titlePh: 'Title',
  createVideo: 'Create video', creatingVideo: 'Creating video…',
  needKey1: 'Needs', needKey2: 'in',
  genOptimizing: 'Generating and optimizing…',
  renderNote: 'Video models render from 1 to several minutes — you can keep the window open.',
  doneClip: 'Done — clip added to the site',
  genFailed: 'Generation failed',
  emptyStream: 'Empty server response (no stream)', streamNoResult: 'Stream ended without a result',
  imgSectionTitle: 'Image generator',
  imgFreeNote: 'Free — powered by Pollinations.ai, no API key needed. One image renders in 10–30 seconds.',
  imgPromptPh: 'E.g.: An espresso cup on a marble table, steam, warm morning light',
  imgGenerate: 'Generate', imgGenerating: 'Generating…',
  imgGallery: 'Image gallery',
  imgEmpty: 'No images yet — describe a scene above and hit “Generate”.',
  imgUseHint: 'Copy the URL and paste it into an “Image” block in the builder — or use it as a section background.',
  imgFailed: 'Image generation failed',
  imgDownload: 'Download', imgDelete: 'Delete', imgCopied: 'Copied',
  siteTheme: 'Site theme',
  themeAuto: 'Auto (from content)',
  suggestByBrief: 'Suggest from brief',
  applyToSite: 'Apply to site',
  themePicked: 'Picked: {label} ({via})',
  viaLlm: 'LLM', viaKeywords: 'by keywords',
  themeSaved: 'Site theme saved: {theme}',
  cannotPick: 'Could not pick',
  sectionContent: 'Section content',
  deleteSection: 'Delete section',
  ctaLabelPh: 'Button text (CTA)', ctaHrefPh: 'Button link (/...)',
  saveContent: 'Save content',
  contentSaved: 'Sections saved: {n}',
  noContent: 'No content sections yet. Generate a video on the “Generate” tab.',
  pageBuilder: 'Page builder',
  up: 'Up', down: 'Down', remove: 'Remove',
  noBlocks: 'No blocks — add one below.',
  add: 'Add', fromTheme: 'From theme', reset: 'Reset', save: 'Save',
  resetToTheme: 'Reset to theme', layoutSaved: 'Layout saved',
  imported: 'Imported: {list} — reloading…',
  invalidJson: 'Invalid JSON file',
  siteConfig: 'Site configuration',
  exportJson: 'Export JSON', importJson: 'Import JSON',
  preview: 'Preview — /',
  open: 'Open', refresh: 'Refresh',
  resizeHint: 'Drag to resize the panel',
  previewTitle: 'Site preview',
};

const hy: StudioDict = {
  blockLabels: {
    hero: 'Հերոս', split: 'Սփլիթ (վիդեո+տեքստ)', cards: 'Քարտեր', mosaic: 'Խճանկար',
    sticky: 'Sticky-պատմություն', background: 'Ֆոն-բաժին', beams: 'Beams-բաններ', marquee: 'Վազող տող',
  },
  tabs: { landing: 'Լենդինգ', generate: 'Վիդեո', images: 'Նկարներ', theme: 'Թեմա', content: 'Բովանդակություն', layout: 'Կոմպոզիցիա', config: 'Կոնֆիգուրացիա' },
  brand: 'Ստուդիա',
  headerSub: 'Վիդեոյի և նկարների գեներացիա · թեմա · էջի կոմպոզիցիա',
  builderBtn: 'Կայքի կոնստրուկտոր',
  toHome: 'Գլխավոր',
  studioBadge: 'Cinematic Studio',
  error: 'Սխալ',
  saveError: 'Պահպանման սխալ',
  landingBuilderTitle: 'Լենդինգի կոնստրուկտոր',
  landingBuilderDesc: 'Առանձին կոնստրուկտոր միայն այս լենդինգի համար՝ բաժիններ, քարտեր, բեյջեր, header, footer, մենյու, բլոկների տարբերակներ, hover-էֆեկտներ, անիմացիաներ, վիդեո։ «Պահպանել» — և գլխավոր «/» էջն անմիջապես թարմացվում է։',
  openLandingBuilder: 'Բացել լենդինգի կոնստրուկտորը',
  quickEditHint: 'Ներքևում՝ տեքստերի արագ խմբագրում (հերոս/բաժիններ/CTA)։ Ամբողջական ազատության համար օգտագործեք վերևի կոնստրուկտորը։',
  hero: 'Հերոս',
  badge: 'Բեյջ',
  heading: 'Վերնագիր',
  subheading: 'Ենթավերնագիր',
  btn1Label: 'Կոճակ 1 — տեքստ', btn1Href: 'Կոճակ 1 — հղում', btn2Label: 'Կոճակ 2 — տեքստ', btn2Href: 'Կոճակ 2 — հղում',
  noteUnderButtons: 'Ստորագրություն կոճակների տակ',
  howItWorks: 'Ինչպես է աշխատում',
  sectionTitle: 'Բաժնի վերնագիր', sectionSubtitle: 'Ենթավերնագիր',
  step: 'Քայլ', titleph: 'Վերնագիր', textPh: 'Տեքստ',
  features: 'Հնարավորություններ',
  themesBlock: 'Թեմաների բլոկ',
  finalCta: 'Վերջնական կոչ (CTA)',
  saveLanding: 'Պահպանել լենդինգը',
  landingSaved: 'Լենդինգը պահպանված է',
  cannotOpenBuilder: 'Չհաջողվեց բացել կոնստրուկտորը',
  briefLabel: 'Բրիֆ կամ .md',
  briefPlaceholder: 'Օր.՝ Սուրճի բրենդ։ Գոլորշի թարմ էսպրեսոյի վրա, տաք առավոտյան լույս։ Բաժիններ՝ pour-over, լատտե-արտ, հատիկների բոված։',
  uploadMd: 'Բեռնել .md',
  styleAuto: 'Ավտո (ըստ բրիֆի)',
  buildWholePage: 'Հավաքել ամբողջ էջը',
  onePrompt: 'Մեկ պրոմպտ',
  planTitle: 'Էջի պլան — {n} բաժին',
  generatingSections: 'Գեներացնում ենք բաժինները…',
  generateAll: 'Գեներացնել բոլոր բաժինները',
  afterReady: 'Պատրաստ լինելուց հետո — բացել գլխավորը →',
  pipelineLogs: 'Փայփլայնի լոգեր',
  stateError: 'սխալ', stateQueued: 'հերթում',
  retryFailed: '[retry] «{title}»՝ փորձ {n}-ը ձախողվեց, կրկնում…',
  promptTitle: 'Կինեմատոգրաֆիկ պրոմպտ',
  copy: 'Պատճենել',
  titlePh: 'Վերնագիր',
  createVideo: 'Ստեղծել վիդեո', creatingVideo: 'Ստեղծում ենք վիդեո…',
  needKey1: 'Անհրաժեշտ է', needKey2: '',
  genOptimizing: 'Գեներացիա և օպտիմիզացիա…',
  renderNote: 'Վիդեո-մոդելները ռենդերում են 1-ից մի քանի րոպե — պատուհանը կարող եք չփակել։',
  doneClip: 'Պատրաստ է — կլիպն ավելացվել է կայքում',
  genFailed: 'Չհաջողվեց գեներացնել',
  emptyStream: 'Սերվերի դատարկ պատասխան (հոսք չկա)', streamNoResult: 'Հոսքն ավարտվեց առանց արդյունքի',
  imgSectionTitle: 'Նկարների գեներատոր',
  imgFreeNote: 'Անվճար — Pollinations.ai, API-բանալի պետք չէ։ Մեկ նկարը ռենդերվում է 10–30 վայրկյանում։',
  imgPromptPh: 'Օր.՝ Էսպրեսոյի բաժակ մարմարե սեղանին, գոլորշի, տաք առավոտյան լույս',
  imgGenerate: 'Գեներացնել', imgGenerating: 'Գեներացնում ենք…',
  imgGallery: 'Նկարների պատկերասրահ',
  imgEmpty: 'Դեռ նկարներ չկան — նկարագրեք տեսարանը վերևում և սեղմեք «Գեներացնել»։',
  imgUseHint: 'Պատճենեք URL-ը և տեղադրեք կոնստրուկտորի «Նկար» բլոկում — կամ օգտագործեք որպես բաժնի ֆոն։',
  imgFailed: 'Չհաջողվեց գեներացնել նկարը',
  imgDownload: 'Ներբեռնել', imgDelete: 'Ջնջել', imgCopied: 'Պատճենված է',
  siteTheme: 'Կայքի թեմա',
  themeAuto: 'Ավտո (ըստ բովանդակության)',
  suggestByBrief: 'Ընտրել ըստ բրիֆի',
  applyToSite: 'Կիրառել կայքում',
  themePicked: 'Ընտրված է՝ {label} ({via})',
  viaLlm: 'LLM', viaKeywords: 'ըստ բանալի բառերի',
  themeSaved: 'Կայքի թեման պահպանված է՝ {theme}',
  cannotPick: 'Չհաջողվեց ընտրել',
  sectionContent: 'Բաժինների բովանդակություն',
  deleteSection: 'Ջնջել բաժինը',
  ctaLabelPh: 'Կոճակի տեքստ (CTA)', ctaHrefPh: 'Կոճակի հղում (/...)',
  saveContent: 'Պահպանել բովանդակությունը',
  contentSaved: 'Պահպանված բաժիններ՝ {n}',
  noContent: 'Դեռ բովանդակությամբ բաժիններ չկան։ Գեներացրեք վիդեո «Գեներացիա» ներդիրում։',
  pageBuilder: 'Էջի կոնստրուկտոր',
  up: 'Վեր', down: 'Վար', remove: 'Ջնջել',
  noBlocks: 'Բլոկներ չկան — ավելացրեք ներքևում։',
  add: 'Ավելացնել', fromTheme: 'Թեմայից', reset: 'Վերակայել', save: 'Պահպանել',
  resetToTheme: 'Վերակայված է թեմային', layoutSaved: 'Կոմպոզիցիան պահպանված է',
  imported: 'Ներմուծված է՝ {list} — վերաբեռնում…',
  invalidJson: 'Սխալ JSON-ֆայլ',
  siteConfig: 'Կայքի կոնֆիգուրացիա',
  exportJson: 'Արտահանել JSON', importJson: 'Ներմուծել JSON',
  preview: 'Նախադիտում — /',
  open: 'Բացել', refresh: 'Թարմացնել',
  resizeHint: 'Քաշեք՝ վահանակի լայնությունը փոխելու համար',
  previewTitle: 'Կայքի նախադիտում',
};

export const STUDIO: Record<Locale, StudioDict> = { ru, en, hy };

export function studioDict(locale: Locale): StudioDict {
  return STUDIO[locale];
}
