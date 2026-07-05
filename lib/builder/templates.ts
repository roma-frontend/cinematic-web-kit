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
  mk('card', { padding: 'md', bg: 'card', border: 'true', gap: 'sm' }, [
    mk('heading', { text: title, level, align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true' }),
  ]);

export interface TemplateDef {
  id: string;
  label: string;
  description: string;
  suggestedPath: string;
  themeId?: string;
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
        mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
          mk('heading', { text: 'О компании', level: '1', align: 'left' }),
          mk('text', { text: 'Мы создаём инструменты, которые делают веб доступным каждому. Наша миссия — убрать барьеры между идеей и запуском.', align: 'left', muted: 'false', size: 'lg' }),
        ]),
        mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
          mk('grid', { gap: 'md', columns: '3' }, [
            mk('stack', { gap: 'sm', align: 'center' }, [mk('heading', { text: '10K+', level: '2', align: 'center' }), mk('text', { text: 'пользователей', align: 'center', muted: 'true' })]),
            mk('stack', { gap: 'sm', align: 'center' }, [mk('heading', { text: '50+', level: '2', align: 'center' }), mk('text', { text: 'стран', align: 'center', muted: 'true' })]),
            mk('stack', { gap: 'sm', align: 'center' }, [mk('heading', { text: '99.9%', level: '2', align: 'center' }), mk('text', { text: 'аптайм', align: 'center', muted: 'true' })]),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('heading', { text: 'Команда', level: '2', align: 'center' }),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '3' }, [
            card('Иван Смирнов', 'Основатель и CEO', '3'),
            card('Мария Кузнецова', 'Дизайн и продукт', '3'),
            card('Пётр Волков', 'Технологии', '3'),
          ]),
        ]),
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
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('heading', { text: 'Простые и честные цены', level: '1', align: 'center' }),
          mk('text', { text: 'Выбирайте план под свои задачи. Меняйте в любой момент.', align: 'center', muted: 'true', size: 'lg' }),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '3' }, [
            mk('pricing', { plan: 'Start', price: '0₽', period: '', features: '1 проект\nБазовые блоки', cta: 'Начать', href: '/site/contact', featured: 'false' }),
            mk('pricing', { plan: 'Pro', price: '990₽', period: '/мес', features: 'Безлимит\nВсе блоки\nПриоритет', cta: 'Выбрать', href: '/site/contact', featured: 'true' }),
            mk('pricing', { plan: 'Team', price: '2990₽', period: '/мес', features: 'Команда\nSLA\nМенеджер', cta: 'Связаться', href: '/site/contact', featured: 'false' }),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
          mk('heading', { text: 'Вопросы о тарифах', level: '2', align: 'left' }),
          mk('spacer', { height: 'sm' }),
          mk('faq', { items: 'Есть ли пробный период?::Да, 14 дней на Pro.\nКак оплатить?::Картой или по счёту.', align: 'left' }),
        ]),
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
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('heading', { text: 'Наши услуги', level: '1', align: 'center' }),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '3' }, [
            card('Дизайн', 'UI/UX, брендинг и прототипы.'),
            card('Разработка', 'Сайты и приложения под ключ.'),
            card('Маркетинг', 'Продвижение и аналитика.'),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
          mk('heading', { text: 'Как мы работаем', level: '2', align: 'left' }),
          mk('spacer', { height: 'sm' }),
          mk('tabs', { items: 'Бриф::Изучаем задачу и цели.\nДизайн::Готовим макеты и согласуем.\nЗапуск::Собираем, тестируем и публикуем.' }),
        ]),
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
        mk('section', { padding: 'lg', bg: 'none', width: 'narrow' }, [
          mk('heading', { text: 'Свяжитесь с нами', level: '1', align: 'left' }),
          mk('text', { text: 'Оставьте заявку — ответим в течение дня.', align: 'left', muted: 'true' }),
          mk('spacer', { height: 'sm' }),
          mk('form', { formId: 'contact', submitText: 'Отправить', successMsg: 'Спасибо! Мы свяжемся с вами.' }, [
            mk('input', { name: 'name', label: 'Имя', placeholder: 'Как вас зовут?', type: 'text' }),
            mk('input', { name: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' }),
            mk('textarea', { name: 'message', label: 'Сообщение', placeholder: 'Расскажите о задаче…' }),
          ]),
          mk('spacer', { height: 'sm' }),
          mk('socials', { links: 'Telegram|https://t.me\nEmail|mailto:hi@example.com', align: 'left' }),
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
        mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
          mk('heading', { text: 'Наши работы', level: '1', align: 'center' }),
          mk('spacer', { height: 'md' }),
          mk('grid', { gap: 'md', columns: '3' }, [
            mk('image', { src: '', alt: 'Проект 1', rounded: 'lg', ratio: '4/3' }),
            mk('image', { src: '', alt: 'Проект 2', rounded: 'lg', ratio: '4/3' }),
            mk('image', { src: '', alt: 'Проект 3', rounded: 'lg', ratio: '4/3' }),
            mk('image', { src: '', alt: 'Проект 4', rounded: 'lg', ratio: '4/3' }),
            mk('image', { src: '', alt: 'Проект 5', rounded: 'lg', ratio: '4/3' }),
            mk('image', { src: '', alt: 'Проект 6', rounded: 'lg', ratio: '4/3' }),
          ]),
        ]),
        mk('section', { padding: 'lg', bg: 'primary', width: 'normal' }, [
          mk('stack', { gap: 'sm', align: 'center' }, [
            mk('heading', { text: 'Хотите так же?', level: '2', align: 'center' }),
            mk('button', { text: 'Обсудить проект', href: '/site/contact', variant: 'default', size: 'lg', align: 'center' }),
          ]),
        ]),
      ],
    }),
  },
];



// ---- section helpers for full landing pages ----
const heroCenter = (title: string, sub: string, cta1: string, cta2: string, bg = 'primary'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'normal' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '1', align: 'center' }),
      mk('text', { text: sub, align: 'center', muted: 'false', size: 'lg' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
        mk('button', { text: cta1, href: '/site/contact', variant: 'default', size: 'lg', align: 'center', type: 'link' }),
        mk('button', { text: cta2, href: '#', variant: 'outline', size: 'lg', align: 'center', type: 'link' }),
      ]),
    ]),
  ]);

const featureGrid = (title: string, cols: string, items: [string, string][], bg = 'none'): BuilderNode =>
  mk('section', { padding: 'lg', bg, width: 'wide' }, [
    mk('heading', { text: title, level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: cols }, items.map(([h, t]) => card(h, t))),
  ]);

const statsRow = (items: [string, string][], bg = 'muted'): BuilderNode =>
  mk('section', { padding: 'md', bg, width: 'wide' }, [
    mk('grid', { gap: 'md', columns: String(items.length) }, items.map(([n, l]) =>
      mk('stack', { gap: 'sm', align: 'center' }, [
        mk('heading', { text: n, level: '2', align: 'center' }),
        mk('text', { text: l, align: 'center', muted: 'true' }),
      ]),
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
    id: 'l-saas', label: 'SaaS-платформа', description: 'Продукт, возможности, тарифы, отзывы, FAQ.', suggestedPath: '', themeId: 'tech-saas',
    build: () => landingPage('SaaS-платформа', [
      heroCenter('Автоматизируйте бизнес за минуты', 'Мощная платформа без кода — запускайте процессы и растите быстрее.', 'Начать бесплатно', 'Смотреть демо', 'primary'),
      statsRow([['10K+', 'команд'], ['99.9%', 'аптайм'], ['4.9★', 'рейтинг']]),
      featureGrid('Возможности', '3', [['Автоматизация', 'Настройте сценарии за пару кликов.'], ['Интеграции', 'Подключайте любимые сервисы.'], ['Аналитика', 'Дашборды в реальном времени.']]),
      pricingSection('muted'),
      testimonialsSection('card'),
      faqSection('bordered'),
      ctaSection('Готовы попробовать?', 'Создать аккаунт'),
    ], 'SaaS-лендинг: возможности, тарифы, отзывы.'),
  },
  {
    id: 'l-agency', label: 'Агентство', description: 'Услуги, кейсы, процесс, призыв.', suggestedPath: '', themeId: 'modern-clean',
    build: () => landingPage('Digital-агентство', [
      heroCenter('Создаём цифровые продукты, которые продают', 'Дизайн, разработка и маркетинг под ключ для вашего бренда.', 'Обсудить проект', 'Наши работы', 'none'),
      featureGrid('Услуги', '3', [['Брендинг', 'Логотип, стиль, гайдлайны.'], ['Веб-разработка', 'Сайты и приложения.'], ['Маркетинг', 'Реклама и аналитика.']]),
      gallerySection('Избранные работы'),
      testimonialsSection('quote', 'muted'),
      ctaSection('Начнём ваш проект?', 'Оставить заявку'),
    ], 'Лендинг digital-агентства.'),
  },
  {
    id: 'l-startup', label: 'Стартап', description: 'Смелый неоновый лендинг для запуска.', suggestedPath: '', themeId: 'neon-night',
    build: () => landingPage('Стартап', [
      heroCenter('Будущее уже здесь', 'Инновационный продукт, который меняет правила игры.', 'Присоединиться', 'Узнать больше', 'primary'),
      featureGrid('Почему мы', '3', [['Быстро', 'Молниеносная скорость.'], ['Умно', 'ИИ под капотом.'], ['Безопасно', 'Данные под защитой.']]),
      statsRow([['1M+', 'скачиваний'], ['150', 'стран'], ['24/7', 'поддержка']], 'none'),
      faqSection('separated', 'muted'),
      ctaSection('Успей первым', 'Получить доступ'),
    ], 'Неоновый лендинг стартапа.'),
  },
  {
    id: 'l-coffee', label: 'Кофейня', description: 'Тёплый редакторский стиль, меню и атмосфера.', suggestedPath: '', themeId: 'editorial-coffee',
    build: () => landingPage('Кофейня', [
      heroCenter('Просыпайся медленно', 'Обжарка на месте, зёрна со всего мира и уютная атмосфера.', 'Забронировать стол', 'Меню', 'primary'),
      featureGrid('Наше меню', '3', [['Эспрессо', 'Классика в идеальном балансе.'], ['Пуровер', 'Раскрываем вкус зерна.'], ['Латте', 'Нежная молочная пенка.']], 'none'),
      gallerySection('Атмосфера'),
      testimonialsSection('minimal', 'muted'),
      ctaSection('Ждём вас в гости', 'Как нас найти'),
    ], 'Лендинг кофейни.'),
  },
  {
    id: 'l-fitness', label: 'Фитнес-клуб', description: 'Динамичный спортивный лендинг.', suggestedPath: '', themeId: 'sport-dynamic',
    build: () => landingPage('Фитнес-клуб', [
      heroCenter('Стань сильнее каждый день', 'Современный зал, тренеры-профессионалы и программы под любые цели.', 'Пробная тренировка', 'Расписание', 'primary'),
      featureGrid('Направления', '3', [['Силовые', 'Свободные веса и тренажёры.'], ['Кардио', 'Выносливость и жиросжигание.'], ['Групповые', 'Йога, бокс, кроссфит.']]),
      statsRow([['5000+', 'участников'], ['30', 'тренеров'], ['15', 'залов']]),
      pricingSection('none'),
      ctaSection('Первая тренировка бесплатно', 'Записаться'),
    ], 'Спортивный лендинг фитнес-клуба.'),
  },
  {
    id: 'l-course', label: 'Онлайн-курс', description: 'Образовательный лендинг с программой.', suggestedPath: '', themeId: 'modern-clean',
    build: () => landingPage('Онлайн-курс', [
      heroCenter('Освойте профессию с нуля', 'Практический курс с наставником и реальными проектами в портфолио.', 'Записаться на курс', 'Программа', 'none'),
      featureGrid('Чему вы научитесь', '3', [['Основы', 'Прочный фундамент с нуля.'], ['Практика', 'Реальные задачи и проекты.'], ['Карьера', 'Помощь с трудоустройством.']]),
      statsRow([['2000+', 'выпускников'], ['92%', 'трудоустройство'], ['4.8★', 'оценка']], 'muted'),
      faqSection('card', 'none'),
      ctaSection('Старт ближайшего потока', 'Оставить заявку'),
    ], 'Лендинг онлайн-курса.'),
  },
  {
    id: 'l-app', label: 'Мобильное приложение', description: 'Промо приложения с фичами и отзывами.', suggestedPath: '', themeId: 'tech-saas',
    build: () => landingPage('Мобильное приложение', [
      heroCenter('Ваш помощник в кармане', 'Всё, что нужно, в одном приложении. Скачайте бесплатно.', 'Скачать в App Store', 'Google Play', 'primary'),
      featureGrid('Фишки приложения', '3', [['Синхронизация', 'Данные на всех устройствах.'], ['Офлайн', 'Работает без интернета.'], ['Уведомления', 'Ничего не пропустите.']]),
      gallerySection('Скриншоты'),
      testimonialsSection('card', 'muted'),
      ctaSection('Установите прямо сейчас', 'Скачать бесплатно'),
    ], 'Лендинг мобильного приложения.'),
  },
  {
    id: 'l-restaurant', label: 'Ресторан', description: 'Премиальный тёмный лендинг ресторана.', suggestedPath: '', themeId: 'luxury-dark',
    build: () => landingPage('Ресторан', [
      heroCenter('Высокая кухня и безупречный сервис', 'Авторское меню от шефа в атмосфере изысканности.', 'Забронировать', 'Меню', 'primary'),
      featureGrid('Наши блюда', '3', [['Закуски', 'Тонкие сочетания вкусов.'], ['Основные', 'Авторская подача.'], ['Десерты', 'Произведения искусства.']], 'none'),
      gallerySection('Интерьер и блюда'),
      testimonialsSection('centered', 'muted'),
      ctaSection('Забронируйте столик', 'Резерв стола'),
    ], 'Премиальный лендинг ресторана.'),
  },
  {
    id: 'l-portfolio', label: 'Портфолио / креатив', description: 'Минималистичный лендинг для специалиста.', suggestedPath: '', themeId: 'luxury-dark',
    build: () => landingPage('Портфолио', [
      heroCenter('Привет, я дизайнер', 'Создаю визуальные истории для брендов и продуктов.', 'Связаться', 'Работы', 'none'),
      gallerySection('Избранные проекты'),
      featureGrid('Что я делаю', '3', [['UI/UX', 'Интерфейсы и прототипы.'], ['Брендинг', 'Айдентика и стиль.'], ['Иллюстрации', 'Уникальная графика.']], 'muted'),
      ctaSection('Обсудим сотрудничество?', 'Написать мне'),
    ], 'Лендинг-портфолио.'),
  },
  {
    id: 'l-eco', label: 'Эко-продукт', description: 'Свежий природный лендинг для бренда.', suggestedPath: '', themeId: 'nature-fresh',
    build: () => landingPage('Эко-продукт', [
      heroCenter('Забота о планете начинается с вас', 'Натуральные продукты без вреда для природы.', 'В магазин', 'О нас', 'primary'),
      featureGrid('Наши ценности', '3', [['Натурально', '100% органические компоненты.'], ['Этично', 'Без тестов на животных.'], ['Экологично', 'Перерабатываемая упаковка.']]),
      statsRow([['50K+', 'клиентов'], ['0%', 'пластика'], ['100%', 'натурально']], 'muted'),
      testimonialsSection('minimal', 'none'),
      ctaSection('Присоединяйтесь к движению', 'Начать покупки'),
    ], 'Эко-лендинг натурального бренда.'),
  },
];
