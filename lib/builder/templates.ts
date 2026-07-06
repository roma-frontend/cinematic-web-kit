import { makeNode, newId, type BuilderNode, type BuilderPage, type NodeType } from './types';

// Ready-made, fully editable page templates. Each build() returns a fresh
// BuilderPage (with new node ids) that the editor inserts as a new page.

const mk = (type: NodeType, props: Record<string, string> = {}, children?: BuilderNode[]): BuilderNode => {
  const node = makeNode(type);
  node.props = { ...node.props, ...props };
  if (children) node.children = children;
  return node;
};

const card = (title: string, body: string, level = '3') =>
  mk('card', { padding: 'md', cardVariant: 'elevated', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
    mk('heading', { text: title, level, align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true' }),
  ]);

// Bold, high-impact hero on a custom accent-colored background.
const heroAccent = (title: string, sub: string, cta1: string, cta2: string, hex: string): BuilderNode =>
  mk('section', { padding: 'lg', width: 'normal', bgColor: hex }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '1', align: 'center', textColor: '#ffffff', fontSize: '4xl', fontWeight: 'bold', animate: 'slide-up' }),
      mk('text', { text: sub, align: 'center', size: 'lg', textColor: '#ffffff' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
        mk('button', { text: cta1, href: '/site/contact', size: 'lg', align: 'center', type: 'link', bgColor: '#ffffff', textColor: hex, radius: 'lg', hover: 'pulse' }),
        mk('button', { text: cta2, href: '#', variant: 'outline', size: 'lg', align: 'center', type: 'link', textColor: '#ffffff', borderColor: '#ffffff', borderWidth: '1', hover: 'lift' }),
      ]),
    ]),
  ]);

export interface TemplateDef {
  id: string;
  label: string;
  description: string;
  suggestedPath: string;
  themeId?: string;
  asideVariant?: string;
  /** Site chrome that matches the template's look — applied together with the
   *  theme when the landing is chosen, so header/footer are on-brand too. */
  headerVariant?: string;
  headerBehavior?: string;
  footerVariant?: string;
  /** Chrome button styling in the landing's design language (see
   *  lib/builder/chrome-buttons.ts). 'lg' rounding follows the theme radius. */
  authLoginVariant?: string;
  authCtaVariant?: string;
  authBtnSize?: string;
  authBtnRounded?: string;
  footerBtnVariant?: string;
  navStyle?: string;
  /** Label of the header CTA button (headerVariant 'cta'); href stays a page pick. */
  headerCtaText?: string;
  /** Optional matching sub-pages (about/portfolio/contact) in the same design
   *  language — used to scaffold a whole cohesive site when the landing is
   *  chosen. Attached to every LANDINGS entry via its style family. */
  subpages?: () => BuilderPage[];
  build: () => BuilderPage;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'landing',
    label: 'Лендинг (SaaS)',
    description: 'Hero, преимущества, тарифы, отзыв, FAQ и форма.',
    suggestedPath: '',
    build: () => ({
      id: newId('page'),
      path: '',
      title: 'Главная',
      description: 'Современный лендинг: возможности, тарифы и форма заявки.',
      blocks: [
        mk('section', { padding: 'lg', bg: 'primary', width: 'normal' }, [
          mk('stack', { gap: 'md', align: 'center' }, [
            mk('heading', { text: 'Запускайте быстрее с нашим продуктом', level: '1', align: 'center' }),
            mk('text', { text: 'Платформа, которая помогает командам расти. Без кода и с полным адаптивом.', align: 'center', muted: 'false', size: 'lg' }),
            mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
              mk('button', { text: 'Начать бесплатно', href: '/site/contact', variant: 'default', size: 'lg', align: 'center' }),
              mk('button', { text: 'Смотреть демо', href: '#', variant: 'outline', size: 'lg', align: 'center' }),
            ]),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('heading', { text: 'Возможности', level: '2', align: 'center' }),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '3' }, [
            card('Скорость', 'Мгновенный запуск и молниеносная загрузка страниц.'),
            card('Гибкость', 'Собирайте что угодно из блоков и секций.'),
            card('Аналитика', 'Понимайте пользователей с помощью встроенных метрик.'),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
          mk('heading', { text: 'Тарифы', level: '2', align: 'center' }),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '3' }, [
            mk('pricing', { plan: 'Start', price: '0₽', period: '', features: '1 проект\nБазовые блоки\nСообщество', cta: 'Начать', href: '/site/contact', featured: 'false' }),
            mk('pricing', { plan: 'Pro', price: '990₽', period: '/мес', features: 'Безлимит проектов\nВсе блоки\nПриоритет', cta: 'Выбрать', href: '/site/contact', featured: 'true' }),
            mk('pricing', { plan: 'Team', price: '2990₽', period: '/мес', features: 'Всё из Pro\nКоманда\nSLA', cta: 'Связаться', href: '/site/contact', featured: 'false' }),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
          mk('testimonial', { quote: 'Собрали и запустили сайт за один вечер. Невероятно удобно!', author: 'Анна Петрова', role: 'CEO, Acme' }),
        ]),
        mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
          mk('heading', { text: 'Частые вопросы', level: '2', align: 'left' }),
          mk('spacer', { height: 'sm' }),
          mk('faq', { items: 'Нужна ли карта?::Нет, бесплатный тариф без карты.\nМогу отменить?::Да, в любой момент.', align: 'left' }),
        ]),
      ],
    }),
  },
  {
    id: 'about',
    label: 'О нас',
    description: 'Заголовок, миссия, команда и цифры.',
    suggestedPath: 'about',
    build: () => ({
      id: newId('page'),
      path: 'about',
      title: 'О нас',
      description: 'Кто мы, наша миссия и команда.',
      blocks: [
        pageHeader('О компании', 'Мы создаём инструменты, которые делают веб доступным каждому. Наша миссия — убрать барьеры между идеей и запуском.'),
        statsRow([['10K+', 'пользователей'], ['50+', 'стран'], ['99.9%', 'аптайм']], 'muted'),
        bentoFeatures('Наша команда', [['Иван Смирнов', 'Основатель и CEO'], ['Мария Кузнецова', 'Дизайн и продукт'], ['Пётр Волков', 'Технологии']]),
        kitCta('clean', 'Хотите работать с нами?', 'Расскажите о задаче — предложим решение.', 'Связаться'),
      ],
    }),
  },
  {
    id: 'pricing',
    label: 'Тарифы',
    description: 'Три тарифа и блок FAQ.',
    suggestedPath: 'pricing',
    build: () => ({
      id: newId('page'),
      path: 'pricing',
      title: 'Тарифы',
      description: 'Прозрачные тарифы для команд любого размера.',
      blocks: [
        pageHeader('Простые и честные цены', 'Выбирайте план под свои задачи. Меняйте в любой момент.'),
        pricingSection('none'),
        faqSection('bordered', 'muted'),
        kitCta('clean', 'Остались вопросы?', 'Напишите нам — поможем выбрать тариф.', 'Связаться'),
      ],
    }),
  },
  {
    id: 'services',
    label: 'Услуги',
    description: 'Сетка услуг и вкладки с деталями.',
    suggestedPath: 'services',
    build: () => ({
      id: newId('page'),
      path: 'services',
      title: 'Услуги',
      description: 'Что мы предлагаем и как работаем.',
      blocks: [
        pageHeader('Наши услуги', 'Полный цикл — от идеи до запуска и поддержки.'),
        bentoFeatures('Что мы делаем', [['Дизайн', 'UI/UX, брендинг и прототипы.'], ['Разработка', 'Сайты и приложения под ключ.'], ['Маркетинг', 'Продвижение и аналитика.']]),
        mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
          mk('heading', { text: 'Как мы работаем', level: '2', align: 'center' }),
          mk('spacer', { height: 'sm' }),
          mk('tabs', { items: 'Бриф::Изучаем задачу и цели.\nДизайн::Готовим макеты и согласуем.\nЗапуск::Собираем, тестируем и публикуем.' }),
        ]),
        kitCta('clean', 'Готовы начать проект?', 'Обсудим задачу и предложим решение.', 'Оставить заявку'),
      ],
    }),
  },
  {
    id: 'contact',
    label: 'Контакты',
    description: 'Форма обратной связи и соцсети.',
    suggestedPath: 'contact',
    build: () => ({
      id: newId('page'),
      path: 'contact',
      title: 'Контакты',
      description: 'Свяжитесь с нами — форма и соцсети.',
      blocks: [
        pageHeader('Свяжитесь с нами', 'Оставьте заявку — ответим в течение дня.'),
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('grid', { gap: 'lg', columns: '2' }, [
            mk('stack', { gap: 'md', align: 'start' }, [
              mk('heading', { text: 'Напишите нам', level: '2', align: 'left' }),
              mk('text', { text: 'Расскажите о задаче — предложим решение и сроки.', align: 'left', size: 'lg', muted: 'true' }),
              mk('list', { items: 'Бесплатная консультация\nОтвет в течение дня\nБез спама', listVariant: 'check' }),
              mk('socials', { links: 'Telegram|https://t.me\nEmail|mailto:hi@example.com', align: 'left', socialVariant: 'pills' }),
            ]),
            mk('card', { cardVariant: 'glass', padding: 'lg', gap: 'sm', radius: 'xl' }, [
              mk('form', { formId: 'contact', submitText: 'Отправить', successMsg: 'Спасибо! Мы свяжемся с вами.' }, [
                mk('input', { name: 'name', label: 'Имя', placeholder: 'Как вас зовут?', type: 'text' }),
                mk('input', { name: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' }),
                mk('textarea', { name: 'message', label: 'Сообщение', placeholder: 'Расскажите о задаче…' }),
              ]),
            ]),
          ]),
        ]),
      ],
    }),
  },
  {
    id: 'portfolio',
    label: 'Портфолио',
    description: 'Галерея работ и призыв к действию.',
    suggestedPath: 'portfolio',
    build: () => ({
      id: newId('page'),
      path: 'portfolio',
      title: 'Портфолио',
      description: 'Избранные проекты и кейсы.',
      blocks: [
        pageHeader('Наши работы', 'Избранные проекты и кейсы, которыми мы гордимся.'),
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('grid', { gap: 'md', columns: '2', stagger: 'true' }, [
            caseTile('БРЕНДИНГ', 'Aurora — финтех нового поколения'),
            caseTile('ВЕБ-ДИЗАЙН', 'Nova — платформа для стартапов'),
            caseTile('КАМПАНИЯ', 'Bloom — запуск косметики'),
            caseTile('MOTION', 'Pulse — музыкальный фестиваль'),
          ]),
        ]),
        kitCta('clean', 'Хотите так же?', 'Обсудим ваш проект и предложим решение.', 'Обсудить проект'),
      ],
    }),
  },
  {
    id: 'dashboard',
    label: 'Дашборд (с сайдбаром)',
    description: 'Страница с боковой панелью, метрики и карточки.',
    suggestedPath: 'dashboard',
    asideVariant: 'left',
    build: () => ({
      id: newId('page'),
      path: 'dashboard',
      title: 'Дашборд',
      description: 'Панель управления с метриками.',
      blocks: [
        mk('section', { padding: 'md', bg: 'none', width: 'wide' }, [
          mk('heading', { text: 'Обзор', level: '1', align: 'left' }),
          mk('spacer', { height: 'sm' }),
          mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, [
            ['Выручка', '₽1.2M'],
            ['Пользователи', '8 340'],
            ['Конверсия', '4.7%'],
          ].map(([h, n]) =>
            mk('card', { cardVariant: 'elevated', padding: 'md', gap: 'sm' }, [
              mk('text', { text: h, align: 'left', muted: 'true' }),
              mk('heading', { text: n, level: '2', align: 'left' }),
            ]),
          )),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '2' }, [
            mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm' }, [mk('heading', { text: 'Активность', level: '3', align: 'left' }), mk('text', { text: 'График активности за период.', align: 'left', muted: 'true' })]),
            mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm' }, [mk('heading', { text: 'Последние заказы', level: '3', align: 'left' }), mk('list', { items: 'Заказ #1024 — оплачен\nЗаказ #1025 — в работе\nЗаказ #1026 — новый', listVariant: 'check' })]),
          ]),
        ]),
      ],
    }),
  },
  {
    id: 'docs',
    label: 'Док-сайт (с сайдбаром)',
    description: 'Документация с навигацией сбоку.',
    suggestedPath: 'docs',
    asideVariant: 'left',
    build: () => ({
      id: newId('page'),
      path: 'docs',
      title: 'Документация',
      description: 'Раздел документации.',
      blocks: [
        mk('section', { padding: 'md', bg: 'none', width: 'normal' }, [
          mk('heading', { text: 'Введение', level: '1', align: 'left' }),
          mk('text', { text: 'Добро пожаловать в документацию. Здесь вы найдёте всё для быстрого старта.', align: 'left', muted: 'false', size: 'lg' }),
          mk('spacer', { height: 'md' }),
          mk('heading', { text: 'Установка', level: '2', align: 'left' }),
          mk('list', { items: 'Создайте аккаунт\nПодключите проект\nЗапустите первую сборку', listVariant: 'numbered' }),
          mk('spacer', { height: 'md' }),
          mk('heading', { text: 'Часто задаваемые вопросы', level: '2', align: 'left' }),
          mk('faq', { items: 'Как начать?::Следуйте разделу «Установка».\nЕсть ли API?::Да, полноценный REST API.', align: 'left', faqVariant: 'separated' }),
        ]),
      ],
    }),
  },
];



// ---- section helpers for full landing pages ----
const heroCenter = (title: string, sub: string, cta1: string, cta2: string, bg = 'primary'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'normal' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '1', align: 'center', animate: 'slide-up' }),
      mk('text', { text: sub, align: 'center', muted: 'false', size: 'lg', animate: 'fade' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
        mk('button', { text: cta1, href: '/site/contact', variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
        mk('button', { text: cta2, href: '#', variant: 'outline', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
      ]),
    ]),
  ]);

const featureGrid = (title: string, cols: string, items: [string, string][], bg = 'none'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'wide' }, [
    mk('heading', { text: title, level: '2', align: 'center', animate: 'fade' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: cols, stagger: 'true' }, items.map(([h, t]) => card(h, t))),
  ]);

const statsRow = (items: [string, string][], bg = 'muted'): BuilderNode =>
  mk('section', { padding: 'md', bg, width: 'wide' }, [
    mk('grid', { gap: 'md', columns: String(items.length), stagger: 'true' }, items.map(([n, l]) =>
      mk('counter', { value: n, label: l, align: 'center' }),
    )),
  ]);

const pricingSection = (bg = 'none'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'wide' }, [
    mk('heading', { text: 'Тарифы', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, [
      mk('pricing', { plan: 'Start', price: '0₽', period: '', features: 'Базовый набор\nДо 1 проекта\nСообщество', cta: 'Начать', href: '/site/contact', featured: 'false', priceVariant: 'outline' }),
      mk('pricing', { plan: 'Pro', price: '990₽', period: '/мес', features: 'Всё в Start\nБез ограничений\nПоддержка 24/7', cta: 'Выбрать', href: '/site/contact', featured: 'true', priceVariant: 'card' }),
      mk('pricing', { plan: 'Team', price: '2990₽', period: '/мес', features: 'Всё в Pro\nКоманда\nSLA', cta: 'Связаться', href: '/site/contact', featured: 'false', priceVariant: 'outline' }),
    ]),
  ]);

const testimonialsSection = (variant: string, bg = 'muted'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'wide' }, [
    mk('heading', { text: 'Нам доверяют', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, [
      mk('testimonial', { quote: 'Лучшее решение на рынке. Рекомендую!', author: 'Анна П.', role: 'CEO', quoteVariant: variant }),
      mk('testimonial', { quote: 'Внедрили за день, результат сразу.', author: 'Иван С.', role: 'CTO', quoteVariant: variant }),
      mk('testimonial', { quote: 'Поддержка отвечает мгновенно.', author: 'Мария К.', role: 'PM', quoteVariant: variant }),
    ]),
  ]);

const faqSection = (variant: string, bg = 'none'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'normal' }, [
    mk('heading', { text: 'Частые вопросы', level: '2', align: 'left' }),
    mk('spacer', { height: 'sm' }),
    mk('faq', { items: 'Сколько стоит?::Есть бесплатный тариф и платные планы.\nМожно отменить?::Да, в любой момент.\nНужен ли код?::Нет, всё визуально.', align: 'left', faqVariant: variant }),
  ]);

const ctaSection = (title: string, cta: string, bg = 'card'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'normal' }, [
    mk('stack', { gap: 'sm', align: 'center' }, [
      mk('heading', { text: title, level: '2', align: 'center' }),
      mk('button', { text: cta, href: '/site/contact', variant: 'default', size: 'lg', align: 'center', type: 'link' }),
    ]),
  ]);

const gallerySection = (title: string): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: title, level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, [1, 2, 3, 4, 5, 6].map((i) => mk('image', { src: '', alt: `Работа ${i}`, rounded: 'lg', ratio: '4/3' }))),
  ]);

// Minimal first page for a freshly created tenant site: enough to publish
// right away — hero with the brand name, three feature cards and a lead form.
export const starterPage = (brand: string): BuilderPage => ({
  id: newId('page'),
  path: '',
  title: 'Главная',
  description: `${brand} — официальный сайт.`,
  blocks: [
    mk('section', { padding: 'lg', bg: 'primary', width: 'normal' }, [
      mk('stack', { gap: 'md', align: 'center' }, [
        mk('heading', { text: brand, level: '1', align: 'center', animate: 'slide-up' }),
        mk('text', { text: 'Добро пожаловать! Эта страница создана автоматически — откройте конструктор и соберите сайт из готовых секций и лендингов.', align: 'center', size: 'lg' }),
      ]),
    ]),
    mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
      mk('grid', { columns: '3', gap: 'md', stagger: 'true' }, [
        card('Быстрый старт', 'Замените этот текст на описание вашего продукта или услуги.'),
        card('Готовые секции', 'Добавляйте тарифы, отзывы, FAQ и галереи в пару кликов.'),
        card('Свой домен', 'Привяжите собственный домен в настройках сайта.'),
      ]),
    ]),
    mk('section', { padding: 'lg', bg: 'muted', width: 'narrow' }, [
      mk('stack', { gap: 'md', align: 'stretch' }, [
        mk('heading', { text: 'Оставьте заявку', level: '2', align: 'center' }),
        mk('form', { formId: 'contact', submitText: 'Отправить', successMsg: 'Спасибо! Мы свяжемся с вами.' }, [
          mk('input', { name: 'name', label: 'Имя', placeholder: 'Ваше имя', type: 'text', required: 'true' }),
          mk('input', { name: 'phone', label: 'Телефон', placeholder: '+7 900 000-00-00', type: 'tel', required: 'true' }),
          mk('textarea', { name: 'message', label: 'Сообщение', placeholder: 'Чем можем помочь?' }),
        ]),
      ]),
    ]),
  ],
});

// Unique marker text of the auto-generated starter home page — lets the builder
// detect an untouched home and replace it in place when a landing is applied.
export const STARTER_MARKER = 'Эта страница создана автоматически';

/** True when a page is still the untouched auto-generated starter (by marker). */
export function isPristineStarter(page: BuilderPage): boolean {
  try {
    return JSON.stringify(page.blocks).includes(STARTER_MARKER);
  } catch {
    return false;
  }
}

const landingPage = (title: string, blocks: BuilderNode[], description: string): BuilderPage => ({
  id: newId('page'),
  path: '',
  title,
  description,
  blocks,
});

// ---- 10 ready-made landing pages (each with a fitting theme) ----
export const LANDINGS: TemplateDef[] = [
  {
    id: 'l-saas', label: 'SaaS-платформа', description: 'Продукт, возможности, тарифы, отзывы, FAQ.', suggestedPath: '', themeId: 'tech-saas', headerVariant: 'split', headerBehavior: 'solid', footerVariant: 'columns',
    authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'lg',
    build: () => landingPage('SaaS-платформа', [
      heroAccent('Автоматизируйте бизнес за минуты', 'Мощная платформа без кода — запускайте процессы и растите быстрее.', 'Начать бесплатно', 'Смотреть демо', '#4f46e5'),
      logosSection(),
      statsRow([['10K+', 'команд'], ['99.9%', 'аптайм'], ['4.9★', 'рейтинг']]),
      featureGrid('Возможности', '3', [['Автоматизация', 'Настройте сценарии за пару кликов.'], ['Интеграции', 'Подключайте любимые сервисы.'], ['Аналитика', 'Дашборды в реальном времени.']]),
      stepsSection(),
      pricingSection('muted'),
      testimonialsSection('card'),
      faqSection('bordered'),
      ctaSection('Готовы попробовать?', 'Создать аккаунт'),
    ], 'SaaS-лендинг: возможности, тарифы, отзывы.'),
  },
  {
    id: 'l-agency', label: 'Агентство', description: 'Услуги, кейсы, процесс, призыв.', suggestedPath: '', themeId: 'modern-clean', headerVariant: 'minimal', headerBehavior: 'solid', footerVariant: 'centered',
    authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'sm', authBtnRounded: 'full',
    build: () => landingPage('Digital-агентство', [
      heroSplit('Создаём цифровые продукты, которые продают', 'Дизайн, разработка и маркетинг под ключ для вашего бренда.', 'Обсудить проект'),
      featureGrid('Услуги', '3', [['Брендинг', 'Логотип, стиль, гайдлайны.'], ['Веб-разработка', 'Сайты и приложения.'], ['Маркетинг', 'Реклама и аналитика.']]),
      gallerySection('Избранные работы'),
      teamSection(),
      testimonialsSection('quote', 'muted'),
      ctaSection('Начнём ваш проект?', 'Оставить заявку'),
    ], 'Лендинг digital-агентства.'),
  },
  {
    id: 'l-startup', label: 'Стартап', description: 'Смелый неоновый лендинг для запуска.', suggestedPath: '', themeId: 'neon-night', headerVariant: 'cta', headerBehavior: 'transparent', footerVariant: 'columns',
    authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'lg', headerCtaText: 'Присоединиться',
    build: () => landingPage('Стартап', [
      heroAccent('Будущее уже здесь', 'Инновационный продукт, который меняет правила игры.', 'Присоединиться', 'Узнать больше', '#7c3aed'),
      featureGrid('Почему мы', '3', [['Быстро', 'Молниеносная скорость.'], ['Умно', 'ИИ под капотом.'], ['Безопасно', 'Данные под защитой.']]),
      statsRow([['1M+', 'скачиваний'], ['150', 'стран'], ['24/7', 'поддержка']], 'none'),
      stepsSection(),
      faqSection('separated', 'muted'),
      ctaSection('Успей первым', 'Получить доступ'),
    ], 'Неоновый лендинг стартапа.'),
  },
  {
    id: 'l-coffee', label: 'Кофейня', description: 'Тёплый редакторский стиль, меню и атмосфера.', suggestedPath: '', themeId: 'editorial-coffee', headerVariant: 'centered', headerBehavior: 'solid', footerVariant: 'centered',
    authLoginVariant: 'link', authCtaVariant: 'default', authBtnSize: 'sm', authBtnRounded: 'full', navStyle: 'underline',
    build: () => landingPage('Кофейня', [
      heroAccent('Просыпайся медленно', 'Обжарка на месте, зёрна со всего мира и уютная атмосфера.', 'Забронировать стол', 'Меню', '#b45309'),
      statsRow([['12', 'лет'], ['25', 'сортов'], ['300K', 'чашек']], 'none'),
      featureGrid('Наше меню', '3', [['Эспрессо', 'Классика в идеальном балансе.'], ['Пуровер', 'Раскрываем вкус зерна.'], ['Латте', 'Нежная молочная пенка.']], 'none'),
      gallerySection('Атмосфера'),
      testimonialsSection('minimal', 'muted'),
      ctaSection('Ждём вас в гости', 'Как нас найти'),
    ], 'Лендинг кофейни.'),
  },
  {
    id: 'l-fitness', label: 'Фитнес-клуб', description: 'Динамичный спортивный лендинг.', suggestedPath: '', themeId: 'sport-dynamic', headerVariant: 'cta', headerBehavior: 'solid', footerVariant: 'columns',
    authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'lg', authBtnRounded: 'lg', navStyle: 'uppercase', headerCtaText: 'Пробная тренировка',
    build: () => landingPage('Фитнес-клуб', [
      heroAccent('Стань сильнее каждый день', 'Современный зал, тренеры-профессионалы и программы под любые цели.', 'Пробная тренировка', 'Расписание', '#dc2626'),
      featureGrid('Направления', '3', [['Силовые', 'Свободные веса и тренажёры.'], ['Кардио', 'Выносливость и жиросжигание.'], ['Групповые', 'Йога, бокс, кроссфит.']]),
      statsRow([['5000+', 'участников'], ['30', 'тренеров'], ['15', 'залов']]),
      stepsSection(),
      pricingSection('none'),
      ctaSection('Первая тренировка бесплатно', 'Записаться'),
    ], 'Спортивный лендинг фитнес-клуба.'),
  },
  {
    id: 'l-course', label: 'Онлайн-курс', description: 'Образовательный лендинг с программой.', suggestedPath: '', themeId: 'modern-clean', headerVariant: 'split', headerBehavior: 'solid', footerVariant: 'newsletter',
    authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'lg', footerBtnVariant: 'default',
    build: () => landingPage('Онлайн-курс', [
      heroSplit('Освойте профессию с нуля', 'Практический курс с наставником и реальными проектами в портфолио.', 'Записаться на курс'),
      featureGrid('Чему вы научитесь', '3', [['Основы', 'Прочный фундамент с нуля.'], ['Практика', 'Реальные задачи и проекты.'], ['Карьера', 'Помощь с трудоустройством.']]),
      statsRow([['2000+', 'выпускников'], ['92%', 'трудоустройство'], ['4.8★', 'оценка']], 'muted'),
      timelineSection(),
      faqSection('card', 'none'),
      ctaSection('Старт ближайшего потока', 'Оставить заявку'),
    ], 'Лендинг онлайн-курса.'),
  },
  {
    id: 'l-app', label: 'Мобильное приложение', description: 'Промо приложения с фичами и отзывами.', suggestedPath: '', themeId: 'tech-saas', headerVariant: 'split', headerBehavior: 'solid', footerVariant: 'columns',
    authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'full',
    build: () => landingPage('Мобильное приложение', [
      heroImage('Ваш помощник в кармане', 'Всё, что нужно, в одном приложении. Скачайте бесплатно.', 'Скачать'),
      statsRow([['1M+', 'загрузок'], ['4.8★', 'в сторах'], ['180', 'стран']]),
      featureGrid('Фишки приложения', '3', [['Синхронизация', 'Данные на всех устройствах.'], ['Офлайн', 'Работает без интернета.'], ['Уведомления', 'Ничего не пропустите.']]),
      gallerySection('Скриншоты'),
      testimonialsSection('card', 'muted'),
      faqSection('bordered'),
      ctaSection('Установите прямо сейчас', 'Скачать бесплатно'),
    ], 'Лендинг мобильного приложения.'),
  },
  {
    id: 'l-restaurant', label: 'Ресторан', description: 'Премиальный тёмный лендинг ресторана.', suggestedPath: '', themeId: 'luxury-dark', headerVariant: 'centered', headerBehavior: 'transparent', footerVariant: 'centered',
    authLoginVariant: 'link', authCtaVariant: 'outline', authBtnSize: 'md', authBtnRounded: 'md', navStyle: 'underline',
    build: () => landingPage('Ресторан', [
      heroImage('Высокая кухня и безупречный сервис', 'Авторское меню от шефа в атмосфере изысканности.', 'Забронировать'),
      featureGrid('Наши блюда', '3', [['Закуски', 'Тонкие сочетания вкусов.'], ['Основные', 'Авторская подача.'], ['Десерты', 'Произведения искусства.']], 'none'),
      statsRow([['15', 'лет'], ['120', 'блюд'], ['50K+', 'гостей']], 'none'),
      gallerySection('Интерьер и блюда'),
      testimonialsSection('centered', 'muted'),
      ctaSection('Забронируйте столик', 'Резерв стола'),
    ], 'Премиальный лендинг ресторана.'),
  },
  {
    id: 'l-portfolio', label: 'Портфолио / креатив', description: 'Минималистичный лендинг для специалиста.', suggestedPath: '', themeId: 'luxury-dark', headerVariant: 'minimal', headerBehavior: 'transparent', footerVariant: 'centered',
    authLoginVariant: 'ghost', authCtaVariant: 'outline', authBtnSize: 'sm', authBtnRounded: 'full', navStyle: 'underline',
    build: () => landingPage('Портфолио', [
      heroImage('Привет, я дизайнер', 'Создаю визуальные истории для брендов и продуктов.', 'Связаться'),
      statsRow([['120', 'проектов'], ['8', 'лет опыта'], ['40', 'клиентов']], 'none'),
      gallerySection('Избранные проекты'),
      featureGrid('Что я делаю', '3', [['UI/UX', 'Интерфейсы и прототипы.'], ['Брендинг', 'Айдентика и стиль.'], ['Иллюстрации', 'Уникальная графика.']], 'muted'),
      testimonialsSection('minimal', 'none'),
      ctaSection('Обсудим сотрудничество?', 'Написать мне'),
    ], 'Лендинг-портфолио.'),
  },
  {
    id: 'l-eco', label: 'Эко-продукт', description: 'Свежий природный лендинг для бренда.', suggestedPath: '', themeId: 'nature-fresh', headerVariant: 'centered', headerBehavior: 'solid', footerVariant: 'newsletter',
    authLoginVariant: 'secondary', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'full', footerBtnVariant: 'default',
    build: () => landingPage('Эко-продукт', [
      heroAccent('Забота о планете начинается с вас', 'Натуральные продукты без вреда для природы.', 'В магазин', 'О нас', '#16a34a'),
      featureGrid('Наши ценности', '3', [['Натурально', '100% органические компоненты.'], ['Этично', 'Без тестов на животных.'], ['Экологично', 'Перерабатываемая упаковка.']]),
      statsRow([['50K+', 'клиентов'], ['0%', 'пластика'], ['100%', 'натурально']], 'muted'),
      stepsSection(),
      gallerySection('Наши продукты'),
      testimonialsSection('minimal', 'none'),
      ctaSection('Присоединяйтесь к движению', 'Начать покупки'),
    ], 'Эко-лендинг натурального бренда.'),
  },
  {
    id: 'l-ai', label: 'AI-стартап', description: 'Асимметричный hero с макетом дашборда и зигзаг-секциями.', suggestedPath: '', themeId: 'neon-night', headerVariant: 'split', headerBehavior: 'transparent', footerVariant: 'columns',
    authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'lg',
    build: () => landingPage('AI-платформа', aiLanding(), 'AI-лендинг: дашборд, возможности, метрики, отзывы.'),
  },
  {
    id: 'l-studio', label: 'Креативная студия', description: 'Редакторский стиль: крупная типографика и нумерованный индекс услуг.', suggestedPath: '', themeId: 'luxury-dark', headerVariant: 'minimal', headerBehavior: 'transparent', footerVariant: 'centered',
    authLoginVariant: 'link', authCtaVariant: 'outline', authBtnSize: 'sm', authBtnRounded: 'full', navStyle: 'underline',
    build: () => landingPage('Креативная студия', studioLanding(), 'Лендинг креативной студии в редакторском стиле.'),
  },
  {
    id: 'l-launch', label: 'Запуск продукта', description: 'Центрированный hero и бенто-сетка тайлов разного веса.', suggestedPath: '', themeId: 'tech-saas', headerVariant: 'cta', headerBehavior: 'solid', footerVariant: 'newsletter',
    authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'full', footerBtnVariant: 'default', headerCtaText: 'Получить доступ',
    build: () => landingPage('Запуск продукта', launchLanding(), 'Лендинг раннего доступа с бенто-сеткой.'),
  },
  {
    id: 'l-event', label: 'Конференция / событие', description: 'Постер-афиша: крупная дата, расписание, спикеры, билеты.', suggestedPath: '', themeId: 'sport-dynamic', headerVariant: 'cta', headerBehavior: 'solid', footerVariant: 'columns',
    authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'lg', authBtnRounded: 'lg', navStyle: 'uppercase', headerCtaText: 'Билеты',
    build: () => landingPage('Конференция', eventLanding(), 'Лендинг конференции: расписание, спикеры, билеты.'),
  },
  {
    id: 'l-web3', label: 'Web3 / крипто', description: 'Неоновые glass-панели 2×2, полоса метрик и шаги.', suggestedPath: '', themeId: 'neon-night', headerVariant: 'split', headerBehavior: 'transparent', footerVariant: 'columns',
    authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'md',
    build: () => landingPage('Web3-продукт', web3Landing(), 'Неоновый Web3/крипто-лендинг с glass-панелями.'),
  },
  {
    id: 'l-beauty', label: 'Бьюти / студия красоты', description: 'Тёплый сплит-hero, прайс-карточки услуг и бронирование.', suggestedPath: '', themeId: 'editorial-coffee', headerVariant: 'centered', headerBehavior: 'solid', footerVariant: 'centered',
    authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'sm', authBtnRounded: 'full', navStyle: 'underline',
    build: () => landingPage('Студия красоты', beautyLanding(), 'Лендинг студии красоты с прайсом и записью.'),
  },
];



// ---- hero variants ----
const heroSplit = (title = 'Растите быстрее с нами', sub = 'Понятное решение для вашего бизнеса. Запуск за считанные минуты.', cta = 'Начать'): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('grid', { gap: 'lg', columns: '2' }, [
      mk('stack', { gap: 'md', align: 'start' }, [
        mk('heading', { text: title, level: '1', align: 'left', animate: 'slide-up' }),
        mk('text', { text: sub, align: 'left', muted: 'true', size: 'lg', animate: 'fade' }),
        mk('row', { gap: 'sm', align: 'center', justify: 'start', wrap: 'wrap' }, [
          mk('button', { text: cta, href: '/site/contact', variant: 'default', size: 'lg', align: 'left', type: 'link', hover: 'lift' }),
          mk('button', { text: 'Подробнее', href: '#', variant: 'outline', size: 'lg', align: 'left', type: 'link', hover: 'lift' }),
        ]),
      ]),
      mk('image', { src: '', alt: 'Иллюстрация', rounded: 'xl', ratio: '4/3', animate: 'zoom', shadow: 'xl' }),
    ]),
  ]);

const heroImage = (title = 'Заголовок поверх изображения', sub = 'Короткое описание вашего продукта или услуги.', cta = 'Хочу так же'): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('image', { src: '', alt: 'Обложка', rounded: 'xl', ratio: '21/9', animate: 'fade', shadow: 'xl' }),
      mk('heading', { text: title, level: '1', align: 'center', animate: 'slide-up' }),
      mk('text', { text: sub, align: 'center', muted: 'true', size: 'lg' }),
      mk('button', { text: cta, href: '/site/contact', variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
    ]),
  ]);

const contactSection = (): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'muted', width: 'narrow' }, [
    mk('heading', { text: 'Свяжитесь с нами', level: '2', align: 'left' }),
    mk('spacer', { height: 'sm' }),
    mk('form', { formId: 'contact', submitText: 'Отправить', successMsg: 'Спасибо! Мы свяжемся с вами.' }, [
      mk('input', { name: 'name', label: 'Имя', placeholder: 'Ваше имя', type: 'text' }),
      mk('input', { name: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' }),
      mk('textarea', { name: 'message', label: 'Сообщение', placeholder: 'Ваше сообщение…' }),
    ]),
  ]);

const heroGradient = (): BuilderNode => heroCenter('Заголовок на градиенте', 'Яркий hero с плавным градиентным фоном.', 'Начать', 'Подробнее', 'gradient');

const heroVideo = (): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'normal', bgVideo: '' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: 'Заголовок поверх видео', level: '1', align: 'center', animate: 'slide-up' }),
      mk('text', { text: 'Добавьте URL фонового видео (.mp4) в свойствах секции.', align: 'center', size: 'lg' }),
      mk('button', { text: 'Смотреть', href: '/site/contact', variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
    ]),
  ]);

const heroForm = (): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('grid', { gap: 'lg', columns: '2' }, [
      mk('stack', { gap: 'md', align: 'start' }, [
        mk('heading', { text: 'Оставьте заявку — перезвоним', level: '1', align: 'left', animate: 'slide-up' }),
        mk('text', { text: 'Заполните форму, и мы свяжемся с вами в течение часа.', align: 'left', muted: 'true', size: 'lg' }),
        mk('list', { items: 'Бесплатная консультация\nИндивидуальное предложение\nБез спама', listVariant: 'check' }),
      ]),
      mk('card', { cardVariant: 'elevated', padding: 'lg', gap: 'sm' }, [
        mk('form', { formId: 'lead', submitText: 'Отправить заявку', successMsg: 'Спасибо! Скоро свяжемся.' }, [
          mk('input', { name: 'name', label: 'Имя', placeholder: 'Ваше имя', type: 'text' }),
          mk('input', { name: 'phone', label: 'Телефон', placeholder: '+7…', type: 'tel' }),
        ]),
      ]),
    ]),
  ]);

const logosSection = (): BuilderNode =>
  mk('section', { padding: 'md', bg: 'muted', width: 'wide' }, [
    mk('text', { text: 'Нам доверяют', align: 'center', muted: 'true' }),
    mk('spacer', { height: 'sm' }),
    mk('grid', { gap: 'md', columns: '4' }, ['LOGO', 'BRAND', 'ACME', 'NOVA'].map((n) =>
      mk('card', { cardVariant: 'soft', padding: 'md', gap: 'none' }, [mk('heading', { text: n, level: '3', align: 'center', textColor: 'muted' })]),
    )),
  ]);

const stepsSection = (): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Как это работает', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, ([
      ['01', 'Оставьте заявку', 'Заполните короткую форму на сайте.'],
      ['02', 'Обсудим детали', 'Свяжемся и уточним ваши задачи.'],
      ['03', 'Запускаем', 'Приступаем к работе и показываем результат.'],
    ] as [string, string, string][]).map(([n, h, t]) =>
      mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm', animate: 'slide-up' }, [
        mk('heading', { text: n, level: '1', align: 'left', textColor: 'primary' }),
        mk('heading', { text: h, level: '3', align: 'left' }),
        mk('text', { text: t, align: 'left', muted: 'true' }),
      ]),
    )),
  ]);

const teamSection = (): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Наша команда', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, ([
      ['Иван Смирнов', 'Основатель'],
      ['Мария Кузнецова', 'Дизайн'],
      ['Пётр Волков', 'Разработка'],
    ] as [string, string][]).map(([name, role]) =>
      mk('card', { cardVariant: 'plain', padding: 'sm', gap: 'sm', animate: 'fade' }, [
        mk('image', { src: '', alt: name, rounded: 'full', ratio: '1/1' }),
        mk('heading', { text: name, level: '3', align: 'center' }),
        mk('text', { text: role, align: 'center', muted: 'true' }),
      ]),
    )),
  ]);

const timelineSection = (): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
    mk('heading', { text: 'Наш путь', level: '2', align: 'left' }),
    mk('spacer', { height: 'md' }),
    mk('stack', { gap: 'md', align: 'stretch' }, ([
      ['2021', 'Запуск проекта и первая версия продукта.'],
      ['2023', 'Тысячи пользователей и новые возможности.'],
      ['2025', 'Лидеры рынка и международная команда.'],
    ] as [string, string][]).map(([year, text]) =>
      mk('row', { gap: 'md', align: 'start', justify: 'start', wrap: 'nowrap' }, [
        mk('heading', { text: year, level: '3', align: 'left', textColor: 'primary' }),
        mk('text', { text, align: 'left', muted: 'true' }),
      ]),
    )),
  ]);

// ---- «wow» section helpers: full-screen gradient heroes, glass/glow cards,
// bento grids and bold gradient CTAs. All use only renderer-supported props
// (bg:'gradient', minH:'screen', animate, hover:'glow', loop:'float', radius,
// custom bg/textColor), so they render correctly and stay fully editable. ----

// Full-bleed gradient hero: floating eyebrow pill, oversized headline, dual CTA.
const heroSpotlight = (badge: string, title: string, sub: string, cta1: string, cta2: string): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'gradient', width: 'normal', minH: 'screen' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('text', { text: badge, align: 'center', size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', loop: 'float' }),
      mk('heading', { text: title, level: '1', align: 'center', fontSize: '4xl', fontWeight: 'bold', animate: 'slide-up' }),
      mk('text', { text: sub, align: 'center', size: 'lg', animate: 'fade', lineHeight: 'relaxed' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
        mk('button', { text: cta1, href: '/site/contact', size: 'lg', align: 'center', type: 'link', bgColor: '#ffffff', textColor: 'primary', radius: 'full', hover: 'glow' }),
        mk('button', { text: cta2, href: '#', variant: 'outline', size: 'lg', align: 'center', type: 'link', textColor: '#ffffff', borderColor: '#ffffff', borderWidth: '1', radius: 'full', hover: 'lift' }),
      ]),
    ]),
  ]);

// Elevated card with soft glow on hover + scroll-in animation.
const glowCard = (title: string, body: string): BuilderNode =>
  mk('card', { padding: 'lg', cardVariant: 'elevated', gap: 'sm', radius: 'xl', animate: 'slide-up', hover: 'glow' }, [
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true', lineHeight: 'relaxed' }),
  ]);

// Bento-style feature grid: staggered reveal + glow cards.
const bentoFeatures = (title: string, items: [string, string][], bg = 'none'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'wide' }, [
    mk('heading', { text: title, level: '2', align: 'center', animate: 'fade' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: items.length % 4 === 0 ? '4' : '3', stagger: 'true' }, items.map(([h, t]) => glowCard(h, t))),
  ]);

// Bold full-width gradient call-to-action band.
const bigCta = (title: string, sub: string, cta: string): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'gradient', width: 'normal', minH: 'half' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '2', align: 'center', fontSize: '3xl', fontWeight: 'bold', animate: 'slide-up' }),
      mk('text', { text: sub, align: 'center', size: 'lg', lineHeight: 'relaxed' }),
      mk('button', { text: cta, href: '/site/contact', size: 'lg', align: 'center', type: 'link', bgColor: '#ffffff', textColor: 'primary', radius: 'full', hover: 'glow', loop: 'pulse', shimmer: 'true' }),
    ]),
  ]);

// ---- bespoke atoms shared by the unique landings below ----
// Buttons for clean (aurora / non-gradient) backgrounds.
const pBtn = (text: string): BuilderNode =>
  mk('button', { text, href: '/site/contact', size: 'lg', align: 'center', type: 'link', radius: 'full', hover: 'glow', shimmer: 'true' });
const gBtn = (text: string): BuilderNode =>
  mk('button', { text, href: '#', variant: 'outline', size: 'lg', align: 'center', type: 'link', radius: 'full', hover: 'lift' });
const chip = (text: string): BuilderNode =>
  mk('card', { cardVariant: 'soft', padding: 'sm', gap: 'none', radius: 'full' }, [
    mk('text', { text, align: 'center', size: 'sm', fontWeight: 'semibold', letterSpacing: 'wide' }),
  ]);
const chipCenter = (text: string): BuilderNode =>
  mk('row', { gap: 'none', align: 'center', justify: 'center', wrap: 'wrap' }, [chip(text)]);
const miniStat = (value: string, label: string): BuilderNode =>
  mk('card', { cardVariant: 'soft', padding: 'sm', gap: 'none', radius: 'lg' }, [mk('counter', { value, label, align: 'left' })]);
// Shared premium page header — same visual language as the landing heroes
// (dot pattern + gradient headline), so sub-pages added after a landing feel
// like part of the same site. Colors come from the doc theme automatically.
const pageHeader = (title: string, sub: string): BuilderNode =>
  mk('section', { padding: 'lg', bg: 'none', fx: 'dots', width: 'normal', minH: 'half' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '1', align: 'center', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', lineHeight: 'tight', animate: 'slide-up' }),
      mk('text', { text: sub, align: 'center', size: 'lg', lineHeight: 'relaxed', muted: 'true' }),
    ]),
  ]);

// === 1. AI — asymmetric hero (dashboard mock) + zig-zag alternating rows ===
const aiRow = (num: string, title: string, body: string, bullets: string, flip: boolean): BuilderNode => {
  const text = mk('stack', { gap: 'sm', align: 'start' }, [
    mk('heading', { text: num, level: '1', align: 'left', textColor: 'primary', fontSize: '3xl', fontWeight: 'bold' }),
    mk('heading', { text: title, level: '2', align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true', lineHeight: 'relaxed' }),
    mk('list', { items: bullets, listVariant: 'arrow' }),
  ]);
  const visual = mk('card', { cardVariant: 'soft', padding: 'lg', gap: 'sm', radius: 'xl', hover: 'lift' }, [
    mk('heading', { text: num, level: '1', align: 'center', textColor: 'primary', fontSize: '4xl', fontWeight: 'bold' }),
    mk('text', { text: title, align: 'center', muted: 'true' }),
  ]);
  return mk('section', { padding: 'lg', bg: flip ? 'muted' : 'none', width: 'wide' }, [
    mk('grid', { gap: 'lg', columns: '2', stagger: 'true' }, flip ? [visual, text] : [text, visual]),
  ]);
};
const aiLanding = (): BuilderNode[] => [
  mk('section', { padding: 'lg', bg: 'none', fx: 'aurora', width: 'wide', minH: 'screen' }, [
    mk('grid', { gap: 'lg', columns: '2' }, [
      mk('stack', { gap: 'md', align: 'start' }, [
        mk('text', { text: '✦ AI-ПЛАТФОРМА НОВОГО ПОКОЛЕНИЯ', size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', loop: 'float' }),
        mk('heading', { text: 'Автоматизируйте рутину силой ИИ', level: '1', align: 'left', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', lineHeight: 'tight', animate: 'slide-up' }),
        mk('text', { text: 'Умный ассистент берёт задачи на себя и ускоряет команду в разы — без кода и сложных настроек.', align: 'left', size: 'lg', lineHeight: 'relaxed', animate: 'fade' }),
        mk('row', { gap: 'sm', align: 'center', justify: 'start', wrap: 'wrap' }, [pBtn('Попробовать бесплатно'), gBtn('Смотреть демо')]),
        mk('row', { gap: 'md', align: 'center', justify: 'start', wrap: 'wrap' }, [
          mk('text', { text: '★★★★★  4.9 / 5', size: 'sm', fontWeight: 'semibold' }),
          mk('text', { text: '2M+ запросов в день', size: 'sm', muted: 'true' }),
        ]),
      ]),
      mk('card', { cardVariant: 'glass', padding: 'lg', gap: 'md', radius: 'xl', animate: 'zoom' }, [
        mk('row', { gap: 'sm', align: 'center', justify: 'between', wrap: 'nowrap' }, [
          mk('heading', { text: 'Панель управления', level: '3', align: 'left' }),
          mk('text', { text: '● online', size: 'sm', textColor: 'primary' }),
        ]),
        mk('grid', { gap: 'sm', columns: '2' }, [miniStat('1 204', 'задач автоматизировано'), miniStat('98%', 'точность ответов'), miniStat('3.2с', 'среднее время'), miniStat('+27%', 'к продуктивности')]),
        mk('list', { items: 'Обработка входящих заявок\nГенерация ответов и текстов\nАналитика в реальном времени', listVariant: 'check' }),
      ]),
    ]),
  ]),
  logosSection(),
  aiRow('01', 'Генеративный движок', 'Тексты, код и изображения по одному запросу. Модель понимает контекст вашего бизнеса.', 'Черновики за секунды\nТон под ваш бренд\nПоддержка 30+ языков', false),
  aiRow('02', 'Сценарии без кода', 'Соберите автоматизацию из блоков: триггеры, условия и действия — визуально.', 'Триггеры по событиям\nВетвление и условия\nИнтеграции в один клик', true),
  aiRow('03', 'Аналитика и прогнозы', 'Живые дашборды и предсказания на основе ваших данных.', 'Метрики в реальном времени\nПрогноз спроса\nЭкспорт отчётов', false),
  mk('section', { padding: 'lg', bg: 'primary', width: 'wide' }, [
    mk('row', { gap: 'lg', align: 'center', justify: 'between', wrap: 'wrap' }, [
      mk('counter', { value: '2M+', label: 'запросов в день', align: 'center' }),
      mk('counter', { value: '99.9%', label: 'аптайм', align: 'center' }),
      mk('counter', { value: '150', label: 'стран', align: 'center' }),
      mk('counter', { value: '4.9★', label: 'оценка', align: 'center' }),
    ]),
  ]),
  testimonialsSection('card'),
  bigCta('Готовы ускориться с ИИ?', 'Первые 14 дней бесплатно, без карты.', 'Создать аккаунт'),
];

// === 2. Studio — editorial: oversized left type + numbered service index ===
const svcIndex = (num: string, title: string, body: string): BuilderNode =>
  mk('card', { cardVariant: 'plain', padding: 'sm', gap: 'sm', hover: 'lift' }, [
    mk('row', { gap: 'md', align: 'start', justify: 'start', wrap: 'nowrap' }, [
      mk('heading', { text: num, level: '2', align: 'left', textColor: 'muted' }),
      mk('stack', { gap: 'none', align: 'start' }, [
        mk('heading', { text: title, level: '3', align: 'left' }),
        mk('text', { text: body, align: 'left', muted: 'true' }),
      ]),
    ]),
    mk('divider', {}),
  ]);
const caseTile = (cat: string, title: string): BuilderNode =>
  mk('card', { cardVariant: 'elevated', padding: 'lg', gap: 'sm', radius: 'xl', hover: 'glow', animate: 'slide-up' }, [
    mk('text', { text: cat, size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', textColor: 'primary' }),
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: 'Смотреть кейс →', align: 'left', muted: 'true', size: 'sm' }),
  ]);
const studioLanding = (): BuilderNode[] => [
  mk('section', { padding: 'lg', bg: 'none', fx: 'dots', width: 'wide', minH: 'half' }, [
    mk('stack', { gap: 'md', align: 'start' }, [
      mk('text', { text: 'СТУДИЯ ДИЗАЙНА И БРЕНДИНГА · EST. 2016', size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', muted: 'true' }),
      mk('heading', { text: 'Создаём бренды, которые невозможно забыть', level: '1', align: 'left', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', lineHeight: 'tight', animate: 'slide-up' }),
      mk('text', { text: 'Айдентика, digital и кампании для амбициозных компаний по всему миру.', align: 'left', size: 'lg', lineHeight: 'relaxed' }),
      mk('button', { text: 'Смотреть портфолио →', href: '#', variant: 'link', size: 'lg', align: 'left', type: 'link', hover: 'bright' }),
    ]),
  ]),
  mk('section', { padding: 'sm', bg: 'none', width: 'wide' }, [mk('divider', {})]),
  mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
    mk('heading', { text: 'Что мы делаем', level: '2', align: 'left' }),
    mk('spacer', { height: 'md' }),
    mk('stack', { gap: 'md', align: 'stretch' }, [
      svcIndex('01', 'Брендинг', 'Логотип, фирменный стиль, гайдлайны и tone of voice.'),
      svcIndex('02', 'Веб-дизайн', 'Сайты, лендинги и продуктовые интерфейсы.'),
      svcIndex('03', 'Motion & 3D', 'Анимация, ролики и трёхмерная графика.'),
      svcIndex('04', 'Стратегия', 'Позиционирование, исследования и запуск.'),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
    mk('heading', { text: 'Избранные проекты', level: '2', align: 'left' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '2', stagger: 'true' }, [
      caseTile('БРЕНДИНГ', 'Aurora — финтех нового поколения'),
      caseTile('ВЕБ-ДИЗАЙН', 'Nova — платформа для стартапов'),
      caseTile('КАМПАНИЯ', 'Bloom — запуск косметики'),
      caseTile('MOTION', 'Pulse — музыкальный фестиваль'),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
    mk('testimonial', { quote: 'Студия переосмыслила наш бренд полностью. Продажи выросли на 40% за квартал.', author: 'Елена Морозова', role: 'CMO, Aurora', quoteVariant: 'centered' }),
  ]),
  teamSection(),
  kitCta('editorial', 'Расскажите о вашем проекте', 'Ответим в течение дня и предложим решение.', 'Оставить заявку'),
];

// === 3. Launch — centered spotlight + bento tiles of varied emphasis ===
const launchLanding = (): BuilderNode[] => [
  mk('section', { padding: 'lg', bg: 'none', fx: 'aurora', width: 'normal', minH: 'half' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      chipCenter('🚀 СКОРО ЗАПУСК'),
      mk('heading', { text: 'Первыми получите ранний доступ', level: '1', align: 'center', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', animate: 'slide-up' }),
      mk('text', { text: 'Оставьте заявку — откроем доступ до публичного старта и дадим спец-условия навсегда.', align: 'center', size: 'lg', lineHeight: 'relaxed' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [pBtn('Получить ранний доступ'), gBtn('Как это работает')]),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Почему стоит попробовать', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '2', stagger: 'true' }, [
      mk('card', { cardVariant: 'glass', padding: 'lg', gap: 'md', radius: 'xl', hover: 'glow' }, [
        mk('heading', { text: '✦ Всё в одном', level: '3', align: 'left' }),
        mk('text', { text: 'Замените десяток инструментов одной платформой.', align: 'left', muted: 'true', lineHeight: 'relaxed' }),
        mk('list', { items: 'Задачи и проекты\nДокументы и вики\nАвтоматизации\nАналитика', listVariant: 'check' }),
      ]),
      mk('stack', { gap: 'md', align: 'stretch' }, [
        glowCard('Молниеносно', 'Запуск за минуты — без обучения.'),
        glowCard('Безопасно', 'Шифрование и гибкий контроль доступа.'),
      ]),
    ]),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, [
      glowCard('Интеграции', '200+ сервисов из коробки.'),
      glowCard('Мобайл', 'Приложения iOS и Android.'),
      glowCard('Поддержка', 'Живые люди на связи 24/7.'),
    ]),
  ]),
  pricingSection('muted'),
  faqSection('bordered'),
  bigCta('Успейте в ранний доступ', 'Количество мест ограничено.', 'Забронировать место'),
];

// === 4. Event — poster: giant date, schedule, speaker circles, tickets ===
const slot = (time: string, title: string): BuilderNode =>
  mk('card', { cardVariant: 'plain', padding: 'sm', gap: 'sm' }, [
    mk('row', { gap: 'md', align: 'center', justify: 'start', wrap: 'nowrap' }, [
      mk('heading', { text: time, level: '3', align: 'left', textColor: 'primary' }),
      mk('text', { text: title, align: 'left' }),
    ]),
    mk('divider', {}),
  ]);
const speaker = (name: string, role: string): BuilderNode =>
  mk('stack', { gap: 'sm', align: 'center' }, [
    mk('image', { src: '', alt: name, rounded: 'full', ratio: '1/1' }),
    mk('heading', { text: name, level: '3', align: 'center' }),
    mk('text', { text: role, align: 'center', muted: 'true', size: 'sm' }),
  ]);
const eventLanding = (): BuilderNode[] => [
  mk('section', { padding: 'lg', bg: 'none', fx: 'aurora', width: 'normal', minH: 'screen' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('text', { text: 'МОСКВА · ONLINE & OFFLINE', size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', muted: 'true' }),
      mk('heading', { text: '12–13 ОКТЯБРЯ', level: '1', align: 'center', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', letterSpacing: 'wide', loop: 'float' }),
      mk('heading', { text: 'TECH SUMMIT 2026', level: '2', align: 'center', fontSize: '2xl', fontWeight: 'semibold' }),
      mk('text', { text: 'Два дня докладов, воркшопов и нетворкинга с лидерами индустрии.', align: 'center', size: 'lg', muted: 'true' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [pBtn('Купить билет'), gBtn('Программа')]),
    ]),
  ]),
  mk('section', { padding: 'md', bg: 'none', width: 'wide' }, [
    mk('row', { gap: 'lg', align: 'center', justify: 'between', wrap: 'wrap' }, [
      mk('counter', { value: '40+', label: 'спикеров', align: 'center' }),
      mk('counter', { value: '2000', label: 'участников', align: 'center' }),
      mk('counter', { value: '20', label: 'воркшопов', align: 'center' }),
      mk('counter', { value: '2', label: 'дня', align: 'center' }),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
    mk('heading', { text: 'Программа · День 1', level: '2', align: 'left' }),
    mk('spacer', { height: 'md' }),
    mk('stack', { gap: 'sm', align: 'stretch' }, [
      slot('09:00', 'Регистрация и приветственный кофе'),
      slot('10:00', 'Кейноут: будущее индустрии'),
      slot('12:30', 'Панель: ИИ в продукте'),
      slot('15:00', 'Воркшопы по трекам'),
      slot('18:00', 'Нетворкинг-вечеринка'),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Спикеры', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '4', stagger: 'true' }, [
      speaker('Анна Петрова', 'CPO, Aurora'),
      speaker('Иван Смирнов', 'CTO, Nova'),
      speaker('Мария Ли', 'Head of AI, Pulse'),
      speaker('Пётр Волков', 'Founder, Bloom'),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
    mk('heading', { text: 'Билеты', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, [
      mk('pricing', { plan: 'Online', price: '3 900₽', period: '', features: 'Доступ к трансляции\nЗаписи докладов\nЧат участников', cta: 'Купить', href: '/site/contact', featured: 'false', priceVariant: 'outline' }),
      mk('pricing', { plan: 'Standart', price: '9 900₽', period: '', features: 'Всё в Online\nОфлайн-участие\nОбеды и кофе-брейки', cta: 'Купить', href: '/site/contact', featured: 'true', priceVariant: 'card' }),
      mk('pricing', { plan: 'VIP', price: '24 900₽', period: '', features: 'Всё в Standart\nПервый ряд\nУжин со спикерами', cta: 'Купить', href: '/site/contact', featured: 'false', priceVariant: 'outline' }),
    ]),
  ]),
  bigCta('Присоединяйтесь к событию', 'Раннее бронирование — дешевле на 30%.', 'Забронировать билет'),
];

// === 5. Web3 — neon glass 2×2 panels + inline stat strip + numbered steps ===
const glassPanel = (title: string, body: string): BuilderNode =>
  mk('card', { cardVariant: 'glass', padding: 'lg', gap: 'sm', radius: 'xl', hover: 'glow', animate: 'slide-up' }, [
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true', lineHeight: 'relaxed' }),
  ]);
const stepChip = (num: string, title: string, body: string): BuilderNode =>
  mk('card', { cardVariant: 'elevated', padding: 'md', gap: 'sm', radius: 'xl', hover: 'lift' }, [
    mk('heading', { text: num, level: '1', align: 'left', textColor: 'primary' }),
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true', size: 'sm' }),
  ]);
const web3Landing = (): BuilderNode[] => [
  mk('section', { padding: 'lg', bg: 'none', fx: 'aurora', width: 'normal', minH: 'screen' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      chipCenter('⬢ ДЕЦЕНТРАЛИЗОВАНО · НЕКАСТОДИАЛЬНО'),
      mk('heading', { text: 'Ваши активы под вашим контролем', level: '1', align: 'center', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', lineHeight: 'tight', animate: 'slide-up' }),
      mk('text', { text: 'Кошелёк и биржа нового поколения. Быстро, приватно, надёжно.', align: 'center', size: 'lg', muted: 'true' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [pBtn('Открыть кошелёк'), gBtn('Whitepaper')]),
      chipCenter('0x7a9f…3C2e · подключено'),
    ]),
  ]),
  mk('section', { padding: 'md', bg: 'card', width: 'wide' }, [
    mk('row', { gap: 'lg', align: 'center', justify: 'between', wrap: 'wrap' }, [
      mk('counter', { value: '$2B+', label: 'объём торгов', align: 'center' }),
      mk('counter', { value: '1.5M', label: 'кошельков', align: 'center' }),
      mk('counter', { value: '0', label: 'взломов', align: 'center' }),
      mk('counter', { value: '900+', label: 'токенов', align: 'center' }),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Возможности протокола', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '2', stagger: 'true' }, [
      glassPanel('Самохранение', 'Приватные ключи только у вас — мы физически не имеем доступа к средствам.'),
      glassPanel('Мгновенные свопы', 'Обмен активов за секунды с лучшими курсами из десятков DEX.'),
      glassPanel('Мультичейн', 'Ethereum, Solana, TON и другие сети в одном интерфейсе.'),
      glassPanel('Стейкинг', 'Пассивный доход до 12% годовых прямо в кошельке.'),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
    mk('heading', { text: 'Начните за 3 шага', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, [
      stepChip('1', 'Создайте кошелёк', 'Без KYC и e-mail — за минуту.'),
      stepChip('2', 'Пополните счёт', 'Картой или переводом крипты.'),
      stepChip('3', 'Торгуйте', 'Свопы, стейкинг и NFT.'),
    ]),
  ]),
  faqSection('separated', 'none'),
  bigCta('Начните с Web3 сегодня', 'Создайте кошелёк за минуту — без KYC.', 'Открыть кошелёк'),
];

// === 6. Beauty — warm split hero + price-tagged cards + booking form ===
const priceCard = (title: string, price: string, body: string): BuilderNode =>
  mk('card', { cardVariant: 'elevated', padding: 'lg', gap: 'sm', radius: 'xl', hover: 'lift', animate: 'slide-up' }, [
    mk('row', { gap: 'sm', align: 'center', justify: 'between', wrap: 'nowrap' }, [
      mk('heading', { text: title, level: '3', align: 'left' }),
      mk('text', { text: price, align: 'right', fontWeight: 'bold', textColor: 'primary' }),
    ]),
    mk('text', { text: body, align: 'left', muted: 'true' }),
  ]);
const beautyLanding = (): BuilderNode[] => [
  mk('section', { padding: 'lg', bg: 'none', fx: 'dots', width: 'wide', minH: 'half' }, [
    mk('grid', { gap: 'lg', columns: '2' }, [
      mk('stack', { gap: 'md', align: 'start' }, [
        mk('text', { text: 'СТУДИЯ КРАСОТЫ И УХОДА', size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', muted: 'true' }),
        mk('heading', { text: 'Ваша красота — наше искусство', level: '1', align: 'left', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', lineHeight: 'tight', animate: 'slide-up' }),
        mk('text', { text: 'Индивидуальный уход, мастера с опытом и атмосфера, в которую хочется возвращаться.', align: 'left', size: 'lg', lineHeight: 'relaxed' }),
        mk('button', { text: 'Записаться онлайн', href: '/site/contact', size: 'lg', align: 'left', type: 'link', radius: 'full', hover: 'glow', shimmer: 'true' }),
      ]),
      mk('image', { src: '', alt: 'Интерьер студии', imgMode: 'framed', ratio: '3/4', animate: 'zoom' }),
    ]),
  ]),
  mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
    mk('heading', { text: 'Услуги и цены', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, [
      priceCard('Уход за лицом', 'от 2 500₽', 'Чистка, пилинги, массаж и уходовые процедуры.'),
      priceCard('Волосы', 'от 1 800₽', 'Стрижка, окрашивание, уход и укладка.'),
      priceCard('Ногти', 'от 1 200₽', 'Маникюр, педикюр, дизайн и покрытие.'),
    ]),
  ]),
  gallerySection('Наши работы'),
  mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
    mk('testimonial', { quote: 'Лучшая студия в городе. Атмосфера, сервис и результат — на высоте!', author: 'Ольга Н.', role: 'постоянный клиент', quoteVariant: 'centered' }),
  ]),
  mk('section', { padding: 'lg', bg: 'primary', width: 'wide' }, [
    mk('grid', { gap: 'lg', columns: '2' }, [
      mk('stack', { gap: 'md', align: 'start' }, [
        mk('heading', { text: 'Запишитесь на визит', level: '2', align: 'left' }),
        mk('text', { text: 'Оставьте контакты — подберём удобное время и мастера.', align: 'left', size: 'lg' }),
        mk('list', { items: 'Бесплатная консультация\nНапоминание о записи\nБонус за первый визит', listVariant: 'check' }),
      ]),
      mk('card', { cardVariant: 'elevated', padding: 'lg', gap: 'sm', radius: 'xl' }, [
        mk('form', { formId: 'booking', submitText: 'Записаться', successMsg: 'Спасибо! Свяжемся для подтверждения.' }, [
          mk('input', { name: 'name', label: 'Имя', placeholder: 'Ваше имя', type: 'text' }),
          mk('input', { name: 'phone', label: 'Телефон', placeholder: '+7…', type: 'tel' }),
        ]),
      ]),
    ]),
  ]),
];

// ---- per-landing matching sub-pages (About / Portfolio / Contact) ----
// Each landing belongs to a "style family"; sub-pages are built in that family's
// visual language (aurora+glass, editorial dots, warm, dynamic, clean) so the
// whole site is cohesive with the chosen landing — not a generic recolor.
const KIT_FX: Record<string, string> = { aurora: 'aurora', editorial: 'dots', warm: 'dots', dynamic: 'aurora', clean: 'none' };
const kitCardVariant = (style: string): string => (style === 'aurora' || style === 'dynamic' ? 'glass' : 'elevated');
const kitHeader = (style: string, title: string, sub: string): BuilderNode => {
  const editorial = style === 'editorial';
  const align = editorial ? 'left' : 'center';
  return mk('section', { padding: 'lg', bg: 'none', fx: KIT_FX[style] ?? 'dots', width: editorial ? 'wide' : 'normal', minH: 'half' }, [
    mk('stack', { gap: 'md', align: editorial ? 'start' : 'center' }, [
      mk('heading', { text: title, level: '1', align, gradient: 'true', fontSize: '4xl', fontWeight: 'bold', lineHeight: 'tight', animate: 'slide-up' }),
      mk('text', { text: sub, align, size: 'lg', lineHeight: 'relaxed', muted: 'true' }),
    ]),
  ]);
};
const kitCard = (style: string, title: string, body: string): BuilderNode =>
  mk('card', { cardVariant: kitCardVariant(style), padding: 'lg', gap: 'sm', radius: 'xl', hover: 'glow', animate: 'slide-up' }, [
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true', lineHeight: 'relaxed' }),
  ]);
const kitCase = (style: string, cat: string, title: string): BuilderNode =>
  mk('card', { cardVariant: kitCardVariant(style), padding: 'lg', gap: 'sm', radius: 'xl', hover: 'glow', animate: 'slide-up' }, [
    mk('text', { text: cat, size: 'sm', letterSpacing: 'wider', fontWeight: 'semibold', textColor: 'primary' }),
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: 'Смотреть кейс →', align: 'left', muted: 'true', size: 'sm' }),
  ]);
// Kit-aware call-to-action: bold gradient band for tech/dynamic families, but a
// restrained, on-brand block (no heavy color band) for editorial/clean/warm —
// so it never clashes with a minimalist landing.
const kitCta = (style: string, title: string, sub: string, cta: string): BuilderNode => {
  if (style === 'aurora' || style === 'dynamic') return bigCta(title, sub, cta);
  return mk('section', { padding: 'lg', bg: style === 'warm' ? 'muted' : 'none', fx: style === 'editorial' ? 'dots' : 'none', width: 'normal' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '2', align: 'center', gradient: 'true', fontSize: '3xl', fontWeight: 'bold' }),
      mk('text', { text: sub, align: 'center', size: 'lg', muted: 'true', lineHeight: 'relaxed' }),
      mk('button', { text: cta, href: '/site/contact', size: 'lg', align: 'center', type: 'link', radius: 'full', hover: 'lift' }),
    ]),
  ]);
};

const aboutBlocks = (style: string): BuilderNode[] => [
  kitHeader(style, 'О компании', 'Мы создаём продукты, которыми гордимся, и растим команду профессионалов.'),
  statsRow([['10K+', 'клиентов'], ['50+', 'стран'], ['99.9%', 'аптайм']], 'muted'),
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Наша команда', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, [
      kitCard(style, 'Иван Смирнов', 'Основатель и CEO'),
      kitCard(style, 'Мария Кузнецова', 'Дизайн и продукт'),
      kitCard(style, 'Пётр Волков', 'Технологии'),
    ]),
  ]),
  kitCta(style, 'Хотите работать с нами?', 'Расскажите о задаче — предложим решение.', 'Связаться'),
];
const portfolioBlocks = (style: string): BuilderNode[] => [
  kitHeader(style, 'Наши работы', 'Избранные проекты и кейсы, которыми мы гордимся.'),
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('grid', { gap: 'md', columns: '2', stagger: 'true' }, [
      kitCase(style, 'БРЕНДИНГ', 'Aurora — финтех нового поколения'),
      kitCase(style, 'ВЕБ-ДИЗАЙН', 'Nova — платформа для стартапов'),
      kitCase(style, 'КАМПАНИЯ', 'Bloom — запуск косметики'),
      kitCase(style, 'MOTION', 'Pulse — музыкальный фестиваль'),
    ]),
  ]),
  kitCta(style, 'Хотите так же?', 'Обсудим ваш проект и предложим решение.', 'Обсудить проект'),
];
const contactBlocks = (style: string): BuilderNode[] => [
  kitHeader(style, 'Свяжитесь с нами', 'Оставьте заявку — ответим в течение дня.'),
  mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('grid', { gap: 'lg', columns: '2' }, [
      mk('stack', { gap: 'md', align: 'start' }, [
        mk('heading', { text: 'Напишите нам', level: '2', align: 'left' }),
        mk('text', { text: 'Расскажите о задаче — предложим решение и сроки.', align: 'left', size: 'lg', muted: 'true' }),
        mk('list', { items: 'Бесплатная консультация\nОтвет в течение дня\nБез спама', listVariant: 'check' }),
        mk('socials', { links: 'Telegram|https://t.me\nEmail|mailto:hi@example.com', align: 'left', socialVariant: 'pills' }),
      ]),
      mk('card', { cardVariant: kitCardVariant(style), padding: 'lg', gap: 'sm', radius: 'xl' }, [
        mk('form', { formId: 'contact', submitText: 'Отправить', successMsg: 'Спасибо! Мы свяжемся с вами.' }, [
          mk('input', { name: 'name', label: 'Имя', placeholder: 'Как вас зовут?', type: 'text' }),
          mk('input', { name: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' }),
          mk('textarea', { name: 'message', label: 'Сообщение', placeholder: 'Расскажите о задаче…' }),
        ]),
      ]),
    ]),
  ]),
];

const styledSubPages = (style: string): BuilderPage[] => [
  { id: newId('page'), path: 'about', title: 'О нас', description: 'Кто мы, наша миссия и команда.', blocks: aboutBlocks(style) },
  { id: newId('page'), path: 'portfolio', title: 'Портфолио', description: 'Избранные проекты и кейсы.', blocks: portfolioBlocks(style) },
  { id: newId('page'), path: 'contact', title: 'Контакты', description: 'Свяжитесь с нами — форма и соцсети.', blocks: contactBlocks(style) },
];

const LANDING_STYLE: Record<string, string> = {
  'l-saas': 'aurora', 'l-app': 'aurora', 'l-startup': 'aurora', 'l-ai': 'aurora', 'l-web3': 'aurora', 'l-launch': 'aurora',
  'l-agency': 'editorial', 'l-studio': 'editorial', 'l-portfolio': 'editorial', 'l-restaurant': 'editorial',
  'l-coffee': 'warm', 'l-beauty': 'warm', 'l-eco': 'warm',
  'l-fitness': 'dynamic', 'l-event': 'dynamic',
  'l-course': 'clean',
};
// Attach matching sub-pages to every landing based on its style family.
LANDINGS.forEach((l) => {
  l.subpages = () => styledSubPages(LANDING_STYLE[l.id] ?? 'aurora');
});

export interface SectionPreset {
  id: string;
  label: string;
  build: () => BuilderNode;
}

export const SECTION_PRESETS: SectionPreset[] = [
  { id: 'hero-center', label: 'Hero · по центру', build: () => heroCenter('Заголовок по центру', 'Короткое описание вашего предложения.', 'Начать', 'Подробнее', 'primary') },
  { id: 'hero-spotlight', label: 'Hero · полноэкранный градиент', build: () => heroSpotlight('✦ НОВИНКА', 'Заголовок во весь экран', 'Яркое вступление с градиентом, плавающим бейджем и двумя кнопками.', 'Начать', 'Подробнее') },
  { id: 'hero-aurora', label: 'Hero · aurora + градиент-текст', build: () =>
    mk('section', { padding: 'lg', bg: 'none', fx: 'aurora', width: 'normal', minH: 'screen' }, [
      mk('stack', { gap: 'md', align: 'center' }, [
        chipCenter('✦ НОВИНКА'),
        mk('heading', { text: 'Заголовок с градиентом на aurora-фоне', level: '1', align: 'center', gradient: 'true', fontSize: '4xl', fontWeight: 'bold', animate: 'slide-up' }),
        mk('text', { text: 'Живой анимированный фон, крупная типографика и кнопка с бликом.', align: 'center', size: 'lg', lineHeight: 'relaxed' }),
        mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [pBtn('Начать'), gBtn('Подробнее')]),
      ]),
    ]) },
  { id: 'glass-cards', label: 'Glass-панели 2×2', build: () =>
    mk('section', { padding: 'lg', bg: 'none', fx: 'aurora', width: 'wide' }, [
      mk('heading', { text: 'Возможности', level: '2', align: 'center' }),
      mk('spacer', { height: 'md' }),
      mk('grid', { gap: 'md', columns: '2', stagger: 'true' }, [
        glassPanel('Скорость', 'Молниеносная загрузка и отклик.'),
        glassPanel('Гибкость', 'Собирайте что угодно из блоков.'),
        glassPanel('Безопасность', 'Данные под надёжной защитой.'),
        glassPanel('Поддержка', 'Живые люди на связи 24/7.'),
      ]),
    ]) },
  { id: 'hero-split', label: 'Hero · сплит', build: heroSplit },
  { id: 'hero-image', label: 'Hero · с картинкой', build: heroImage },
  { id: 'hero-gradient', label: 'Hero · градиент', build: heroGradient },
  { id: 'hero-video', label: 'Hero · фон-видео', build: heroVideo },
  { id: 'hero-form', label: 'Hero · с формой', build: heroForm },
  { id: 'logos', label: 'Логотипы клиентов', build: logosSection },
  { id: 'steps', label: 'Шаги / процесс', build: stepsSection },
  { id: 'team', label: 'Команда', build: teamSection },
  { id: 'timeline', label: 'Таймлайн', build: timelineSection },
  { id: 'features', label: 'Преимущества (3)', build: () => featureGrid('Возможности', '3', [['Быстро', 'Молниеносный запуск.'], ['Гибко', 'Собирайте из блоков.'], ['Надёжно', 'Данные под защитой.']]) },
  { id: 'bento', label: 'Бенто · glow-карточки', build: () => bentoFeatures('Возможности', [['Скорость', 'Молниеносная загрузка.'], ['Гибкость', 'Собирайте что угодно.'], ['Аналитика', 'Метрики в реальном времени.'], ['Поддержка', 'Всегда на связи 24/7.']]) },
  { id: 'stats', label: 'Статистика', build: () => statsRow([['10K+', 'клиентов'], ['99.9%', 'аптайм'], ['4.9★', 'рейтинг']]) },
  { id: 'pricing', label: 'Тарифы', build: () => pricingSection('none') },
  { id: 'testimonials', label: 'Отзывы', build: () => testimonialsSection('card') },
  { id: 'faq', label: 'FAQ', build: () => faqSection('bordered') },
  { id: 'gallery', label: 'Галерея', build: () => gallerySection('Галерея') },
  { id: 'cta', label: 'Призыв к действию', build: () => ctaSection('Готовы начать?', 'Оставить заявку') },
  { id: 'big-cta', label: 'Призыв · градиентный баннер', build: () => bigCta('Готовы начать?', 'Присоединяйтесь прямо сейчас — это бесплатно.', 'Оставить заявку') },
  { id: 'contact', label: 'Форма контактов', build: contactSection },
];
