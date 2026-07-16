// Dictionary for the marketing/utility pages: presets index, themes gallery,
// web-vitals. Server-safe, domain-scoped (ru/en/hy).

import type { Locale } from '@/lib/seo';

export type PagesDict = {
  presets: {
    metaTitle: string;
    metaDesc: string;
    title: string;
    intro: string;
    previewOf: string; // {title}
    customTitle: string;
  };
  themes: {
    metaTitle: string;
    metaDesc: string;
    title: string;
    intro: string; // {label}
    activeOnSite: string;
    headings: string; // {font} {radius} {motion}
    sampleCard: string;
    button: string;
    triggersOn: string;
    defaultWhenNoMatch: string;
  };
  vitals: {
    metaTitle: string;
    metaDesc: string;
    title: string;
    intro: string;
    lcpTitle: string; lcpDesc: string;
    scoresTitle: string; good: string; medium: string; bad: string; pending: string; scoresDesc: string; // uses good/medium/bad
    prodDevTitle: string; prodDevDesc: string;
    hintLcp: string;
    hintInp: string;
    hintCls: string;
    hintFcp: string;
    hintTtfb: string;
  };
};

const ru: PagesDict = {
  presets: {
    metaTitle: 'Пресеты страниц — Кинематографический кит',
    metaDesc: 'Готовые шаблоны страниц, собранные из кинематографических блоков.',
    title: 'Пресеты страниц',
    intro: 'Шесть готовых лендингов — по одному под индустрию, каждый в своей теме и со своим характером. Ниже каждый показан вживую в масштабированном превью; открой любой, чтобы посмотреть в полный экран.',
    previewOf: 'Превью: {title}',
    customTitle: 'Хочешь свой пресет? Добавь запись в lib/presets.ts и локализованный контент в lib/preset-demo-dict.ts — страница /presets/[slug] соберётся сама.',
  },
  themes: {
    metaTitle: 'Темы / шаблоны — Кинематографический кит',
    metaDesc: 'Галерея дизайн-тем, которые движок подбирает под тему сайта.',
    title: 'Темы / шаблоны',
    intro: 'Движок автоматически подбирает тему под содержание сайта (палитра, шрифт заголовков, радиусы, характер анимаций). Ниже — превью в текущей схеме (светлой или тёмной — переключается вместе с сайтом) и ключевые слова, по которым тема выбирается. Сейчас на сайте активна тема «{label}» — она отмечена ниже.',
    activeOnSite: 'Активна на сайте',
    headings: 'Заголовки: {font} · радиус {radius} · движение {motion}',
    sampleCard: 'Пример карточки',
    button: 'Кнопка',
    triggersOn: 'Срабатывает на',
    defaultWhenNoMatch: 'по умолчанию (если ничего не совпало)',
  },
  vitals: {
    metaTitle: 'Web Vitals — Кинематографический кит',
    metaDesc: 'Живой дашборд Core Web Vitals (LCP, INP, CLS) этой страницы.',
    title: 'Web Vitals — вживую',
    intro: 'Те же метрики производительности, что собирает Cloudflare Web Analytics, — измеряются прямо в твоём браузере через next/web-vitals. Значения появляются по мере взаимодействия со страницей (INP — после первого клика/скролла). Пороги совпадают с Core Web Vitals.',
    lcpTitle: 'LCP · INP · CLS',
    lcpDesc: 'Три ключевые метрики Google/Cloudflare. Остальные (FCP, TTFB) — вспомогательные.',
    scoresTitle: 'Оценки',
    good: 'Хорошо',
    medium: 'Средне',
    bad: 'Плохо',
    pending: 'Ожидание…',
    scoresDesc: '{good} ≤ порога, {medium} — между, {bad} — выше верхнего порога.',
    prodDevTitle: 'Прод vs дев',
    prodDevDesc: 'В dev-режиме числа хуже из-за несжатых бандлов — сверяйся на проде.',
    hintLcp: 'Скорость отрисовки главного контента',
    hintInp: 'Отзывчивость на действия',
    hintCls: 'Стабильность вёрстки',
    hintFcp: 'Первая отрисовка',
    hintTtfb: 'Ответ сервера',
  },
};

const en: PagesDict = {
  presets: {
    metaTitle: 'Page presets — Builder Studio',
    metaDesc: 'Ready-made page templates assembled from cinematic blocks.',
    title: 'Page presets',
    intro: 'Six ready-made landings — one per industry, each in its own theme with its own character. Every preset below is shown live in a scaled preview; open any of them to view full screen.',
    previewOf: 'Preview: {title}',
    customTitle: 'Want your own preset? Add an entry to lib/presets.ts and localized content to lib/preset-demo-dict.ts — the /presets/[slug] page builds itself.',
  },
  themes: {
    metaTitle: 'Themes / templates — Builder Studio',
    metaDesc: 'A gallery of design themes the engine matches to the site topic.',
    title: 'Themes / templates',
    intro: 'The engine automatically matches a theme to the site content (palette, heading font, radii, motion character). Below are live previews in the current scheme (light or dark — they follow the site toggle) and the keywords each theme is selected by. The theme “{label}” is currently active on the site — it is marked below.',
    activeOnSite: 'Active on the site',
    headings: 'Headings: {font} · radius {radius} · motion {motion}',
    sampleCard: 'Sample card',
    button: 'Button',
    triggersOn: 'Triggers on',
    defaultWhenNoMatch: 'default (if nothing matched)',
  },
  vitals: {
    metaTitle: 'Web Vitals — Builder Studio',
    metaDesc: 'A live dashboard of Core Web Vitals (LCP, INP, CLS) for this page.',
    title: 'Web Vitals — live',
    intro: 'The same performance metrics Cloudflare Web Analytics collects — measured right in your browser via next/web-vitals. Values appear as you interact with the page (INP — after the first click/scroll). Thresholds match Core Web Vitals.',
    lcpTitle: 'LCP · INP · CLS',
    lcpDesc: 'The three key Google/Cloudflare metrics. The rest (FCP, TTFB) are auxiliary.',
    scoresTitle: 'Scores',
    good: 'Good',
    medium: 'Medium',
    bad: 'Poor',
    pending: 'Waiting…',
    scoresDesc: '{good} ≤ threshold, {medium} — in between, {bad} — above the upper threshold.',
    prodDevTitle: 'Prod vs dev',
    prodDevDesc: 'In dev mode the numbers are worse due to uncompressed bundles — verify on production.',
    hintLcp: 'How fast the main content paints',
    hintInp: 'Responsiveness to interactions',
    hintCls: 'Layout stability',
    hintFcp: 'First paint',
    hintTtfb: 'Server response time',
  },
};

const hy: PagesDict = {
  presets: {
    metaTitle: 'Էջերի նախակարգեր — Builder Studio',
    metaDesc: 'Պատրաստի էջերի ձևանմուշներ՝ հավաքված կինեմատոգրաֆիկ բլոկներից։',
    title: 'Էջերի նախակարգեր',
    intro: 'Վեց պատրաստի լենդինգ — յուրաքանչյուրն ինդուստրիայի համար, իր թեմայով և բնավորությամբ։ Ստորև յուրաքանչյուրը ցուցադրված է կենդանի՝ մասշտաբավորված նախադիտմամբ. բացեք ցանկացածը՝ ամբողջ էկրանով դիտելու համար։',
    previewOf: 'Նախադիտում՝ {title}',
    customTitle: 'Ուզո՞ւմ եք ձեր նախակարգը։ Ավելացրեք գրառում lib/presets.ts-ում և տեղայնացված բովանդակություն lib/preset-demo-dict.ts-ում — /presets/[slug] էջը կհավաքվի ինքնուրույն։',
  },
  themes: {
    metaTitle: 'Թեմաներ / ձևանմուշներ — Builder Studio',
    metaDesc: 'Դիզայն-թեմաների պատկերասրահ, որ շարժիչն ընտրում է կայքի թեմայի համար։',
    title: 'Թեմաներ / ձևանմուշներ',
    intro: 'Շարժիչն ավտոմատ ընտրում է թեմա՝ ըստ կայքի բովանդակության (գունապնակ, վերնագրերի տառատեսակ, շառավիղներ, անիմացիաների բնույթ)։ Ստորև՝ նախադիտումներ ընթացիկ սխեմայում (բաց կամ մուգ՝ փոխվում է կայքի հետ) և բանալի բառերը, որոնցով ընտրվում է թեման։ Այժմ կայքում ակտիվ է «{label}» թեման — այն նշված է ստորև։',
    activeOnSite: 'Ակտիվ է կայքում',
    headings: 'Վերնագրեր՝ {font} · շառավիղ {radius} · շարժում {motion}',
    sampleCard: 'Քարտի օրինակ',
    button: 'Կոճակ',
    triggersOn: 'Գործարկվում է',
    defaultWhenNoMatch: 'ըստ լռելյայնի (եթե ոչինչ չհամընկավ)',
  },
  vitals: {
    metaTitle: 'Web Vitals — Builder Studio',
    metaDesc: 'Այս էջի Core Web Vitals-ի (LCP, INP, CLS) կենդանի վահանակ։',
    title: 'Web Vitals — կենդանի',
    intro: 'Նույն արտադրողականության մետրիկները, որ հավաքում է Cloudflare Web Analytics-ը — չափվում են անմիջապես ձեր բրաուզերում next/web-vitals-ի միջոցով։ Արժեքները հայտնվում են էջի հետ փոխազդեցության ընթացքում (INP — առաջին սեղմումից/սքրոլից հետո)։ Շեմերը համընկնում են Core Web Vitals-ի հետ։',
    lcpTitle: 'LCP · INP · CLS',
    lcpDesc: 'Google/Cloudflare-ի երեք հիմնական մետրիկները։ Մնացածը (FCP, TTFB)՝ օժանդակ։',
    scoresTitle: 'Գնահատականներ',
    good: 'Լավ',
    medium: 'Միջին',
    bad: 'Վատ',
    pending: 'Սպասում…',
    scoresDesc: '{good} ≤ շեմի, {medium} — միջև, {bad} — վերին շեմից բարձր։',
    prodDevTitle: 'Պրոդ vs դեv',
    prodDevDesc: 'Dev-ռեժիմում թվերն ավելի վատ են չսեղմված բանդլների պատճառով — ստուգեք պրոդում։',
    hintLcp: 'Հիմնական բովանդակության ցուցադրման արագություն',
    hintInp: 'Արձագանք փոխազդեցություններին',
    hintCls: 'Դասավորության կայունություն',
    hintFcp: 'Առաջին ցուցադրում',
    hintTtfb: 'Սերվերի պատասխան',
  },
};

export const PAGES: Record<Locale, PagesDict> = { ru, en, hy };

export function pagesDict(locale: Locale): PagesDict {
  return PAGES[locale];
}
