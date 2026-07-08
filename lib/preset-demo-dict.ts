// Localized copy for the 6 preset demo landings (/presets/[slug]). Generic
// showcase text — pages have no real logic. Design config is in lib/presets.ts.

import type { Locale } from '@/lib/seo';

export interface PresetContent {
  tag: string;
  label: string;
  hero: { eyebrow: string; title: string; subtitle: string };
  stats?: { value: string; label: string }[];
  logos?: string[];
  features: { title: string; body: string }[];
  showcase: { title: string; body: string; points: string[] };
  gallery: { title: string; subtitle: string };
  offer: { title: string; subtitle: string; items: { name: string; price: string; note: string; features: string[] }[] };
  testimonials: { name: string; role: string; quote: string }[];
  final: { title: string; subtitle: string };
  /** Top nav labels for bento layouts (studio, pulse, maison). */
  nav?: string[];
  /** Labels overlaid on gallery tiles (studio works grid). */
  galleryLabels?: string[];
  /** "Why us" block (arena): image + icon rows. */
  whyUs?: { title: string; items: { title: string; body: string }[] };
  /** Artists row (pulse): circular avatars with name + genre. */
  artists?: { title: string; subtitle: string; cta: string; items: { name: string; genre: string }[] };
}

export interface PresetCommon {
  metaSuffix: string;
  backToPresets: string;
  allPresets: string;
  previewBadge: string;
  ctaPrimary: string;
  ctaSecondary: string;
  popular: string;
  perMonth: string;
  choosePlan: string;
  footerNote: string;
}

export interface PresetLocale {
  common: PresetCommon;
  presets: Record<string, PresetContent>;
}

const ru: PresetLocale = {
  common: {
    metaSuffix: 'демо-пресет',
    backToPresets: 'Ко всем пресетам',
    allPresets: 'Все пресеты',
    previewBadge: 'Превью',
    ctaPrimary: 'Начать бесплатно',
    ctaSecondary: 'Смотреть другие',
    popular: 'Популярный',
    perMonth: '/мес',
    choosePlan: 'Выбрать',
    footerNote: 'Демонстрационная страница · функционал отключён',
  },
  presets: {
    launch: {
      tag: 'SaaS / стартап',
      label: 'Launch',
      hero: { eyebrow: 'Запуск за минуты', title: 'Продукт, который растёт вместе с командой', subtitle: 'Соберите посадочную, подключите тарифы и начните продавать — без разработчиков и дизайнеров.' },
      logos: ['Northwind', 'Acme', 'Globex', 'Umbrella', 'Initech', 'Hooli'],
      features: [
        { title: 'Молниеносно', body: 'Мгновенная загрузка и оптимизация из коробки.' },
        { title: 'Безопасно', body: 'Надёжные настройки по умолчанию и контроль доступа.' },
        { title: 'Аналитика', body: 'Метрики и воронки, чтобы видеть рост в реальном времени.' },
      ],
      showcase: { title: 'Всё под контролем', body: 'Единая панель для контента, тарифов и пользователей.', points: ['Готовые блоки', 'A/B-варианты', 'Интеграции'] },
      gallery: { title: 'Возможности', subtitle: 'Каждый экран собран из готовых секций.' },
      offer: {
        title: 'Простые тарифы', subtitle: 'Демо — кнопки ведут к регистрации.',
        items: [
          { name: 'Старт', price: '$0', note: 'для проб', features: ['1 проект', 'Базовые блоки', 'Поддомен'] },
          { name: 'Про', price: '$19', note: 'популярный', features: ['10 проектов', 'Все темы', 'Свой домен', 'Аналитика'] },
          { name: 'Команда', price: '$49', note: 'для бизнеса', features: ['Безлимит', 'Роли', 'Приоритет'] },
        ],
      },
      testimonials: [
        { name: 'Анна', role: 'Основатель', quote: 'Запустили MVP за вечер, выглядит как работа студии.' },
        { name: 'Игорь', role: 'CTO', quote: 'Меньше кода — быстрее гипотезы. То, что нужно.' },
      ],
      final: { title: 'Готовы запустить продукт?', subtitle: 'Создайте свою посадочную за пару минут.' },
    },
    roast: {
      tag: 'Кофейня / бренд еды',
      label: 'Roast',
      hero: { eyebrow: 'Свежая обжарка', title: 'Кофе, ради которого возвращаются', subtitle: 'Тёплая редакторская подача: история зерна, меню и атмосфера вашего заведения.' },
      features: [
        { title: 'Своя обжарка', body: 'Профили под каждый сорт — от эспрессо до фильтра.' },
        { title: 'Честные зёрна', body: 'Прямые поставки с ферм и прозрачное происхождение.' },
        { title: 'С любовью', body: 'Ритуал, а не просто напиток.' },
      ],
      showcase: { title: 'От зерна до чашки', body: 'Рассказываем путь кофе так, чтобы захотелось прийти.', points: ['История фермы', 'Профиль обжарки', 'Рецепты бариста'] },
      gallery: { title: 'Атмосфера', subtitle: 'Загляните внутрь до визита.' },
      offer: {
        title: 'Меню', subtitle: 'Демо — позиции некликабельны по логике.',
        items: [
          { name: 'Эспрессо', price: '₽180', note: 'классика', features: ['двойной шот', 'своя обжарка'] },
          { name: 'Флэт уайт', price: '₽260', note: 'хит', features: ['бархатная пенка', 'цельное/растительное'] },
          { name: 'Фильтр V60', price: '₽320', note: 'спешелти', features: ['зерно недели', 'ручная заварка'] },
        ],
      },
      testimonials: [
        { name: 'Марина', role: 'Гость', quote: 'Лучший флэт уайт в городе, атмосфера бомба.' },
        { name: 'Пётр', role: 'Бариста', quote: 'Наконец сайт, который передаёт наш вайб.' },
      ],
      final: { title: 'Заглянете на чашку?', subtitle: 'Мы открыты каждый день с утра до вечера.' },
    },
    arena: {
      tag: 'Спорт / фитнес',
      label: 'Arena',
      hero: { eyebrow: 'Твой результат', title: 'Стань сильнее каждый день', subtitle: 'Залы, тренеры и расписание — всё, чтобы начать тренироваться уже сегодня.' },
      stats: [{ value: '12k+', label: 'участников' }, { value: '80+', label: 'занятий в неделю' }, { value: '24/7', label: 'доступ в залы' }],
      features: [
        { title: 'Сила', body: 'Свободные веса и функциональные зоны.' },
        { title: 'Драйв', body: 'Групповые классы с топ-тренерами.' },
        { title: 'Победа', body: 'Программы под цель и трекинг прогресса.' },
      ],
      showcase: { title: 'Тренируйся по-своему', body: 'Гибкое расписание и персональные планы.', points: ['Персональный тренер', 'Групповые классы', 'Открытые залы'] },
      whyUs: { title: 'Почему выбирают нас', items: [
        { title: 'Профессиональные тренеры', body: 'Опытные специалисты помогут достичь любых целей — от новичка до профи.' },
        { title: 'Гибкое расписание', body: 'Занимайся тогда, когда удобно тебе. Утром, днём или поздно вечером.' },
        { title: 'Доступ в любые залы', body: 'Тренируйся в любом зале сети 24/7 по единой подписке.' },
      ] },
      gallery: { title: 'Внутри клуба', subtitle: 'Оборудование и пространство.' },
      offer: {
        title: 'Расписание', subtitle: 'Демо — запись отключена.',
        items: [
          { name: 'Кроссфит', price: '07:00', note: 'Пн · Ср · Пт', features: ['60 мин', 'все уровни'] },
          { name: 'Бокс', price: '18:30', note: 'Вт · Чт', features: ['45 мин', 'спарринги'] },
          { name: 'Йога', price: '20:00', note: 'ежедневно', features: ['75 мин', 'восстановление'] },
        ],
      },
      testimonials: [
        { name: 'Дмитрий', role: 'Участник', quote: 'Минус 8 кг за два месяца. Тренеры топ.' },
        { name: 'Ольга', role: 'Тренер', quote: 'Расписание удобное, залы всегда открыты.' },
      ],
      final: { title: 'Первая тренировка бесплатно', subtitle: 'Приходи и почувствуй разницу.' },
    },
    studio: {
      tag: 'Агентство / портфолио',
      label: 'Studio',
      nav: ['Работы', 'Услуги', 'О студии', 'Блог', 'Контакты'],
      galleryLabels: ['Брендинг', 'Дизайн системы', 'Веб-дизайн', 'Продуктовый дизайн', 'UI/UX дизайн', 'Веб-приложение'],
      hero: { eyebrow: 'Дизайн-студия', title: 'Создаём бренды, которые замечают', subtitle: 'Портфолио, кейсы и подход команды — чисто, строго, по делу.' },
      logos: ['Vogue', 'Nike', 'Airbnb', 'Spotify', 'Figma', 'Notion'],
      features: [
        { title: 'Идентика', body: 'Логотипы и айдентика с характером.' },
        { title: 'Продукт', body: 'Интерфейсы, которыми приятно пользоваться.' },
        { title: 'Магия', body: 'Анимации и детали, что оживляют бренд.' },
      ],
      showcase: { title: 'Процесс, а не хаос', body: 'От брифа до запуска — прозрачно на каждом шаге.', points: ['Исследование', 'Концепция', 'Реализация'] },
      gallery: { title: 'Избранные работы', subtitle: 'Немного из недавнего.' },
      offer: {
        title: 'Форматы работы', subtitle: 'Демо — заявка отключена.',
        items: [
          { name: 'Спринт', price: '2 нед', note: 'быстрый старт', features: ['лендинг', 'айдентика'] },
          { name: 'Проект', price: '6 нед', note: 'популярный', features: ['сайт', 'бренд', 'гайдлайн'] },
          { name: 'Партнёрство', price: '∞', note: 'на потоке', features: ['выделенная команда', 'ретейнер'] },
        ],
      },
      testimonials: [
        { name: 'Елена', role: 'Клиент', quote: 'Сделали ребрендинг — продажи выросли на 40%.' },
        { name: 'Артём', role: 'Продакт', quote: 'Работать одно удовольствие, всё по срокам.' },
      ],
      final: { title: 'Обсудим ваш проект?', subtitle: 'Расскажите задачу — предложим решение.' },
    },
    maison: {
      tag: 'Люкс / ресторан',
      label: 'Maison',
      nav: ['Меню', 'О нас', 'Атмосфера', 'Блог', 'Контакты'],
      hero: { eyebrow: 'Высокая кухня', title: 'Вечер, который хочется продлить', subtitle: 'Авторское меню, безупречный сервис и атмосфера, достойная особого случая.' },
      features: [
        { title: 'Изысканно', body: 'Сезонное меню от шефа с именем.' },
        { title: 'Винотека', body: 'Подобранные пары к каждому блюду.' },
        { title: 'Безупречно', body: 'Сервис, продуманный до детали.' },
      ],
      showcase: { title: 'Гастрономический театр', body: 'Каждое блюдо — часть истории вечера.', points: ['Дегустационное меню', 'Сомелье', 'Приватный зал'] },
      gallery: { title: 'Интерьер и подача', subtitle: 'Атмосфера до визита.' },
      offer: {
        title: 'Дегустационное меню', subtitle: 'Демо — бронь отключена.',
        items: [
          { name: 'Аперитив', price: '—', note: 'встреча', features: ['игристое', 'амюз-буш'] },
          { name: 'Сет из 6 подач', price: '₽6900', note: 'signature', features: ['вино в паре', 'от шефа'] },
          { name: 'Диджестив', price: '—', note: 'финал', features: ['десерт', 'кофе'] },
        ],
      },
      testimonials: [
        { name: 'Виктория', role: 'Гость', quote: 'Лучший ужин за год. Каждая деталь на месте.' },
        { name: 'Николай', role: 'Сомелье', quote: 'Пары к блюдам подобраны безупречно.' },
      ],
      final: { title: 'Забронировать столик', subtitle: 'Мы сохраним для вас лучший вечер.' },
    },
    pulse: {
      tag: 'Музыка / ивент',
      label: 'Pulse',
      nav: ['Афиша', 'Артисты', 'Билеты', 'О нас', 'Контакты'],
      artists: { title: 'Звёзды на одной сцене', subtitle: 'Лучшие артисты сезона.', cta: 'Смотреть всех артистов', items: [
        { name: 'DJ Neon', genre: 'TECHNO' },
        { name: 'Luna Wave', genre: 'HOUSE' },
        { name: 'Bassline', genre: 'DRUM & BASS' },
        { name: 'Echo Pulse', genre: 'TRANCE' },
        { name: 'Vortex', genre: 'TECH HOUSE' },
      ] },
      hero: { eyebrow: 'Ночь начинается здесь', title: 'Почувствуй бит', subtitle: 'Лайн-ап, билеты и атмосфера главного события сезона.' },
      stats: [{ value: '20+', label: 'артистов' }, { value: '3', label: 'сцены' }, { value: '12ч', label: 'нон-стоп' }],
      features: [
        { title: 'Звук', body: 'Топовый саунд-сетап и свет.' },
        { title: 'Энергия', body: 'Хедлайнеры мировой сцены.' },
        { title: 'Билеты', body: 'Простой вход по QR — без очередей.' },
      ],
      showcase: { title: 'Лайн-ап сезона', body: 'Три сцены, десятки артистов, одна ночь.', points: ['Main stage', 'Techno room', 'Chill zone'] },
      gallery: { title: 'Прошлые события', subtitle: 'Как это было.' },
      offer: {
        title: 'Расписание', subtitle: 'Демо — покупка отключена.',
        items: [
          { name: 'Warm-up', price: '22:00', note: 'Main', features: ['DJ set', 'вход открыт'] },
          { name: 'Headliner', price: '00:00', note: 'Main', features: ['live', 'спецэффекты'] },
          { name: 'After', price: '04:00', note: 'Techno', features: ['до утра', 'resident'] },
        ],
      },
      testimonials: [
        { name: 'Саша', role: 'Гость', quote: 'Лучшая ночь года, звук — космос.' },
        { name: 'Kate', role: 'DJ', quote: 'Площадка и публика — огонь.' },
      ],
      final: { title: 'Успей на битву сезона', subtitle: 'Билеты почти закончились.' },
    },
  },
};

const en: PresetLocale = {
  common: {
    metaSuffix: 'demo preset',
    backToPresets: 'Back to all presets',
    allPresets: 'All presets',
    previewBadge: 'Preview',
    ctaPrimary: 'Start free',
    ctaSecondary: 'See others',
    popular: 'Popular',
    perMonth: '/mo',
    choosePlan: 'Choose',
    footerNote: 'Demo page · functionality disabled',
  },
  presets: {
    launch: {
      tag: 'SaaS / startup',
      label: 'Launch',
      hero: { eyebrow: 'Launch in minutes', title: 'A product that grows with your team', subtitle: 'Build a landing page, connect pricing and start selling — no developers or designers needed.' },
      logos: ['Northwind', 'Acme', 'Globex', 'Umbrella', 'Initech', 'Hooli'],
      features: [
        { title: 'Lightning fast', body: 'Instant loading and optimization out of the box.' },
        { title: 'Secure', body: 'Solid defaults and access control.' },
        { title: 'Analytics', body: 'Metrics and funnels to watch growth in real time.' },
      ],
      showcase: { title: 'Everything under control', body: 'A single dashboard for content, pricing and users.', points: ['Ready-made blocks', 'A/B variants', 'Integrations'] },
      gallery: { title: 'Capabilities', subtitle: 'Every screen is built from ready-made sections.' },
      offer: {
        title: 'Simple pricing', subtitle: 'Demo — buttons lead to sign-up.',
        items: [
          { name: 'Start', price: '$0', note: 'to try', features: ['1 project', 'Basic blocks', 'Subdomain'] },
          { name: 'Pro', price: '$19', note: 'popular', features: ['10 projects', 'All themes', 'Custom domain', 'Analytics'] },
          { name: 'Team', price: '$49', note: 'for business', features: ['Unlimited', 'Roles', 'Priority'] },
        ],
      },
      testimonials: [
        { name: 'Anna', role: 'Founder', quote: 'Launched an MVP in an evening — looks like studio work.' },
        { name: 'Igor', role: 'CTO', quote: 'Less code — faster hypotheses. Exactly what we needed.' },
      ],
      final: { title: 'Ready to launch your product?', subtitle: 'Build your landing page in a couple of minutes.' },
    },
    roast: {
      tag: 'Coffee shop / food brand',
      label: 'Roast',
      hero: { eyebrow: 'Fresh roast', title: 'Coffee worth coming back for', subtitle: 'Warm editorial storytelling: the bean’s story, the menu and the atmosphere of your place.' },
      features: [
        { title: 'Our own roast', body: 'Profiles for every variety — from espresso to filter.' },
        { title: 'Honest beans', body: 'Direct farm sourcing and transparent origin.' },
        { title: 'With love', body: 'A ritual, not just a drink.' },
      ],
      showcase: { title: 'From bean to cup', body: 'We tell coffee’s journey in a way that makes you want to visit.', points: ['Farm story', 'Roast profile', 'Barista recipes'] },
      gallery: { title: 'Atmosphere', subtitle: 'Take a look inside before you visit.' },
      offer: {
        title: 'Menu', subtitle: 'Demo — items are non-interactive by design.',
        items: [
          { name: 'Espresso', price: '$3', note: 'classic', features: ['double shot', 'our own roast'] },
          { name: 'Flat white', price: '$4.5', note: 'favorite', features: ['velvet foam', 'dairy/plant'] },
          { name: 'V60 filter', price: '$5.5', note: 'specialty', features: ['bean of the week', 'hand-brewed'] },
        ],
      },
      testimonials: [
        { name: 'Marina', role: 'Guest', quote: 'Best flat white in town, the vibe is amazing.' },
        { name: 'Peter', role: 'Barista', quote: 'Finally a site that captures our vibe.' },
      ],
      final: { title: 'Drop by for a cup?', subtitle: 'We’re open every day from morning to evening.' },
    },
    arena: {
      tag: 'Sport / fitness',
      label: 'Arena',
      hero: { eyebrow: 'Your results', title: 'Get stronger every day', subtitle: 'Gyms, coaches and a schedule — everything to start training today.' },
      stats: [{ value: '12k+', label: 'members' }, { value: '80+', label: 'classes / week' }, { value: '24/7', label: 'gym access' }],
      features: [
        { title: 'Strength', body: 'Free weights and functional zones.' },
        { title: 'Drive', body: 'Group classes with top coaches.' },
        { title: 'Victory', body: 'Goal-based programs and progress tracking.' },
      ],
      showcase: { title: 'Train your way', body: 'A flexible schedule and personal plans.', points: ['Personal trainer', 'Group classes', 'Open gyms'] },
      whyUs: { title: 'Why choose us', items: [
        { title: 'Professional coaches', body: 'Experienced specialists help you reach any goal — from beginner to pro.' },
        { title: 'Flexible schedule', body: 'Train whenever suits you. Morning, midday or late evening.' },
        { title: 'Access to any gym', body: 'Train at any gym in the network 24/7 with one membership.' },
      ] },
      gallery: { title: 'Inside the club', subtitle: 'Equipment and space.' },
      offer: {
        title: 'Schedule', subtitle: 'Demo — booking disabled.',
        items: [
          { name: 'CrossFit', price: '07:00', note: 'Mon · Wed · Fri', features: ['60 min', 'all levels'] },
          { name: 'Boxing', price: '18:30', note: 'Tue · Thu', features: ['45 min', 'sparring'] },
          { name: 'Yoga', price: '20:00', note: 'daily', features: ['75 min', 'recovery'] },
        ],
      },
      testimonials: [
        { name: 'Dmitry', role: 'Member', quote: 'Lost 8 kg in two months. Top coaches.' },
        { name: 'Olga', role: 'Coach', quote: 'Convenient schedule, gyms always open.' },
      ],
      final: { title: 'First workout free', subtitle: 'Come in and feel the difference.' },
    },
    studio: {
      tag: 'Agency / portfolio',
      label: 'Studio',
      nav: ['Work', 'Services', 'About', 'Blog', 'Contact'],
      galleryLabels: ['Branding', 'Design systems', 'Web design', 'Product design', 'UI/UX design', 'Web app'],
      hero: { eyebrow: 'Design studio', title: 'We build brands that get noticed', subtitle: 'Portfolio, case studies and the team’s approach — clean, sharp, to the point.' },
      logos: ['Vogue', 'Nike', 'Airbnb', 'Spotify', 'Figma', 'Notion'],
      features: [
        { title: 'Identity', body: 'Logos and identity with character.' },
        { title: 'Product', body: 'Interfaces that are a pleasure to use.' },
        { title: 'Magic', body: 'Animations and details that bring a brand to life.' },
      ],
      showcase: { title: 'Process, not chaos', body: 'From brief to launch — transparent at every step.', points: ['Research', 'Concept', 'Delivery'] },
      gallery: { title: 'Selected work', subtitle: 'A bit of our recent work.' },
      offer: {
        title: 'Ways to work', subtitle: 'Demo — inquiry form disabled.',
        items: [
          { name: 'Sprint', price: '2 wks', note: 'quick start', features: ['landing', 'identity'] },
          { name: 'Project', price: '6 wks', note: 'popular', features: ['website', 'brand', 'guidelines'] },
          { name: 'Partnership', price: '∞', note: 'ongoing', features: ['dedicated team', 'retainer'] },
        ],
      },
      testimonials: [
        { name: 'Elena', role: 'Client', quote: 'They rebranded us — sales grew 40%.' },
        { name: 'Artem', role: 'Product', quote: 'A joy to work with, always on schedule.' },
      ],
      final: { title: 'Shall we discuss your project?', subtitle: 'Tell us the task — we’ll propose a solution.' },
    },
    maison: {
      tag: 'Luxury / restaurant',
      label: 'Maison',
      nav: ['Menu', 'About', 'Atmosphere', 'Blog', 'Contact'],
      hero: { eyebrow: 'Fine dining', title: 'An evening you’ll want to prolong', subtitle: 'A signature menu, impeccable service and an atmosphere worthy of a special occasion.' },
      features: [
        { title: 'Exquisite', body: 'A seasonal menu from a renowned chef.' },
        { title: 'Wine cellar', body: 'Curated pairings for every dish.' },
        { title: 'Flawless', body: 'Service considered down to the detail.' },
      ],
      showcase: { title: 'Gastronomic theater', body: 'Every dish is part of the evening’s story.', points: ['Tasting menu', 'Sommelier', 'Private room'] },
      gallery: { title: 'Interior & plating', subtitle: 'The atmosphere before you visit.' },
      offer: {
        title: 'Tasting menu', subtitle: 'Demo — reservations disabled.',
        items: [
          { name: 'Aperitif', price: '—', note: 'welcome', features: ['sparkling', 'amuse-bouche'] },
          { name: '6-course set', price: '$95', note: 'signature', features: ['wine pairing', 'from the chef'] },
          { name: 'Digestif', price: '—', note: 'finale', features: ['dessert', 'coffee'] },
        ],
      },
      testimonials: [
        { name: 'Victoria', role: 'Guest', quote: 'Best dinner of the year. Every detail in place.' },
        { name: 'Nikolai', role: 'Sommelier', quote: 'The pairings were impeccable.' },
      ],
      final: { title: 'Reserve a table', subtitle: 'We’ll keep the best evening for you.' },
    },
    pulse: {
      tag: 'Music / event',
      label: 'Pulse',
      nav: ['Line-up', 'Artists', 'Tickets', 'About', 'Contact'],
      artists: { title: 'Stars on one stage', subtitle: 'The season’s best artists.', cta: 'See all artists', items: [
        { name: 'DJ Neon', genre: 'TECHNO' },
        { name: 'Luna Wave', genre: 'HOUSE' },
        { name: 'Bassline', genre: 'DRUM & BASS' },
        { name: 'Echo Pulse', genre: 'TRANCE' },
        { name: 'Vortex', genre: 'TECH HOUSE' },
      ] },
      hero: { eyebrow: 'The night starts here', title: 'Feel the beat', subtitle: 'The line-up, tickets and atmosphere of the season’s main event.' },
      stats: [{ value: '20+', label: 'artists' }, { value: '3', label: 'stages' }, { value: '12h', label: 'non-stop' }],
      features: [
        { title: 'Sound', body: 'Top-tier sound and light setup.' },
        { title: 'Energy', body: 'World-stage headliners.' },
        { title: 'Tickets', body: 'Simple QR entry — no queues.' },
      ],
      showcase: { title: 'Season line-up', body: 'Three stages, dozens of artists, one night.', points: ['Main stage', 'Techno room', 'Chill zone'] },
      gallery: { title: 'Past events', subtitle: 'How it went.' },
      offer: {
        title: 'Schedule', subtitle: 'Demo — purchase disabled.',
        items: [
          { name: 'Warm-up', price: '22:00', note: 'Main', features: ['DJ set', 'doors open'] },
          { name: 'Headliner', price: '00:00', note: 'Main', features: ['live', 'special effects'] },
          { name: 'After', price: '04:00', note: 'Techno', features: ['till dawn', 'resident'] },
        ],
      },
      testimonials: [
        { name: 'Sasha', role: 'Guest', quote: 'Best night of the year, the sound was cosmic.' },
        { name: 'Kate', role: 'DJ', quote: 'The venue and crowd were on fire.' },
      ],
      final: { title: 'Catch the season’s showdown', subtitle: 'Tickets are almost sold out.' },
    },
  },
};

const hy: PresetLocale = {
  common: {
    metaSuffix: 'դեմո-նախակարգ',
    backToPresets: 'Դեպի բոլոր նախակարգերը',
    allPresets: 'Բոլոր նախակարգերը',
    previewBadge: 'Նախադիտում',
    ctaPrimary: 'Սկսել անվճար',
    ctaSecondary: 'Տեսնել մյուսները',
    popular: 'Հանրաճանաչ',
    perMonth: '/ամիս',
    choosePlan: 'Ընտրել',
    footerNote: 'Դեմո էջ · ֆունկցիոնալն անջատված է',
  },
  presets: {
    launch: {
      tag: 'SaaS / սթարթափ',
      label: 'Launch',
      hero: { eyebrow: 'Գործարկում րոպեների ընթացքում', title: 'Ապրանք, որ աճում է թիմի հետ', subtitle: 'Հավաքեք լենդինգ, միացրեք սակագները և սկսեք վաճառել՝ առանց ծրագրավորողների և դիզայներների։' },
      logos: ['Northwind', 'Acme', 'Globex', 'Umbrella', 'Initech', 'Hooli'],
      features: [
        { title: 'Կայծակնային', body: 'Ակնթարթային բեռնում և օպտիմիզացիա անմիջապես։' },
        { title: 'Անվտանգ', body: 'Հուսալի կանխադրված կարգավորումներ և հասանելիության վերահսկում։' },
        { title: 'Անալիտիկա', body: 'Մետրիկներ և ձագարներ՝ աճը իրական ժամանակում տեսնելու համար։' },
      ],
      showcase: { title: 'Ամեն ինչ վերահսկողության տակ', body: 'Մեկ վահանակ բովանդակության, սակագների և օգտատերերի համար։', points: ['Պատրաստի բլոկներ', 'A/B տարբերակներ', 'Ինտեգրումներ'] },
      gallery: { title: 'Հնարավորություններ', subtitle: 'Յուրաքանչյուր էկրան հավաքված է պատրաստի բաժիններից։' },
      offer: {
        title: 'Պարզ սակագներ', subtitle: 'Դեմո — կոճակները տանում են դեպի գրանցում։',
        items: [
          { name: 'Start', price: '$0', note: 'փորձի համար', features: ['1 նախագիծ', 'Հիմնական բլոկներ', 'Ենթադոմեն'] },
          { name: 'Pro', price: '$19', note: 'հանրաճանաչ', features: ['10 նախագիծ', 'Բոլոր թեմաները', 'Սեփական դոմեն', 'Անալիտիկա'] },
          { name: 'Team', price: '$49', note: 'բիզնեսի համար', features: ['Անսահմանափակ', 'Դերեր', 'Առաջնահերթություն'] },
        ],
      },
      testimonials: [
        { name: 'Աննա', role: 'Հիմնադիր', quote: 'MVP-ն գործարկեցինք մեկ երեկոյում, ստուդիայի աշխատանքի տեսք ունի։' },
        { name: 'Իգոր', role: 'CTO', quote: 'Քիչ կոդ — արագ վարկածներ։ Հենց այն, ինչ պետք էր։' },
      ],
      final: { title: 'Պատրա՞ստ եք գործարկել ձեր ապրանքը', subtitle: 'Ստեղծեք ձեր լենդինգը մի քանի րոպեում։' },
    },
    roast: {
      tag: 'Սրճարան / սննդի բրենդ',
      label: 'Roast',
      hero: { eyebrow: 'Թարմ բոված', title: 'Սուրճ, որի համար վերադառնում են', subtitle: 'Ջերմ խմբագրական մատուցում՝ հատիկի պատմությունը, մենյուն և ձեր վայրի մթնոլորտը։' },
      features: [
        { title: 'Սեփական բովում', body: 'Պրոֆիլներ յուրաքանչյուր տեսակի համար՝ էսպրեսոյից մինչև ֆիլտր։' },
        { title: 'Ազնիվ հատիկներ', body: 'Ուղիղ մատակարարումներ ֆերմաներից և թափանցիկ ծագում։' },
        { title: 'Սիրով', body: 'Ծես, ոչ պարզապես ըմպելիք։' },
      ],
      showcase: { title: 'Հատիկից մինչև գավաթ', body: 'Պատմում ենք սուրճի ճանապարհն այնպես, որ ուզենաք գալ։', points: ['Ֆերմայի պատմություն', 'Բովման պրոֆիլ', 'Բարիստայի բաղադրատոմսեր'] },
      gallery: { title: 'Մթնոլորտ', subtitle: 'Նայեք ներս այցելությունից առաջ։' },
      offer: {
        title: 'Մենյու', subtitle: 'Դեմո — դիրքերն ըստ տրամաբանության սեղմելի չեն։',
        items: [
          { name: 'Էսպրեսո', price: '$3', note: 'դասական', features: ['կրկնակի շոթ', 'սեփական բովում'] },
          { name: 'Flat white', price: '$4.5', note: 'հիթ', features: ['թավշյա փրփուր', 'կաթ/բուսական'] },
          { name: 'V60 ֆիլտր', price: '$5.5', note: 'սփեշլթի', features: ['շաբաթվա հատիկ', 'ձեռքով եփ'] },
        ],
      },
      testimonials: [
        { name: 'Մարինա', role: 'Հյուր', quote: 'Քաղաքի լավագույն flat white-ը, մթնոլորտը հրաշալի է։' },
        { name: 'Պետրոս', role: 'Բարիստա', quote: 'Վերջապես կայք, որ փոխանցում է մեր վայբը։' },
      ],
      final: { title: 'Կմտնե՞ք մի գավաթի', subtitle: 'Բաց ենք ամեն օր առավոտից երեկո։' },
    },
    arena: {
      tag: 'Սպորտ / ֆիթնես',
      label: 'Arena',
      hero: { eyebrow: 'Քո արդյունքը', title: 'Դարձիր ավելի ուժեղ ամեն օր', subtitle: 'Դահլիճներ, մարզիչներ և ժամանակացույց — ամեն ինչ՝ այսօր մարզվելը սկսելու համար։' },
      stats: [{ value: '12k+', label: 'մասնակից' }, { value: '80+', label: 'պարապմունք/շաբաթ' }, { value: '24/7', label: 'դահլիճների հասանելիություն' }],
      features: [
        { title: 'Ուժ', body: 'Ազատ քաշեր և ֆունկցիոնալ գոտիներ։' },
        { title: 'Դրայվ', body: 'Խմբային դասեր լավագույն մարզիչների հետ։' },
        { title: 'Հաղթանակ', body: 'Ծրագրեր ըստ նպատակի և առաջընթացի հետևում։' },
      ],
      showcase: { title: 'Մարզվիր քո ձևով', body: 'Ճկուն ժամանակացույց և անհատական պլաններ։', points: ['Անհատական մարզիչ', 'Խմբային դասեր', 'Բաց դահլիճներ'] },
      whyUs: { title: 'Ինչու՞ են ընտրում մեզ', items: [
        { title: 'Պրոֆեսիոնալ մարզիչներ', body: 'Փորձառու մասնագետները կօգնեն հասնել ցանկացած նպատակի՝ սկսնակից մինչև պրոֆեսիոնալ։' },
        { title: 'Ճկուն ժամանակացույց', body: 'Մարզվիր այն ժամանակ, երբ հարմար է քեզ։ Առավոտյան, ցերեկը կամ ուշ երեկոյան։' },
        { title: 'Հասանելիություն բոլոր դահլիճներին', body: 'Մարզվիր ցանցի ցանկացած դահլիճում 24/7՝ մեկ բաժանորդագրությամբ։' },
      ] },
      gallery: { title: 'Ակումբի ներսում', subtitle: 'Սարքավորումներ և տարածք։' },
      offer: {
        title: 'Ժամանակացույց', subtitle: 'Դեմո — գրանցումն անջատված է։',
        items: [
          { name: 'CrossFit', price: '07:00', note: 'Երկ · Չրք · Ուրբ', features: ['60 րոպե', 'բոլոր մակարդակները'] },
          { name: 'Բռնցքամարտ', price: '18:30', note: 'Երք · Հնգ', features: ['45 րոպե', 'սպարինգներ'] },
          { name: 'Յոգա', price: '20:00', note: 'ամեն օր', features: ['75 րոպե', 'վերականգնում'] },
        ],
      },
      testimonials: [
        { name: 'Դմիտրի', role: 'Մասնակից', quote: 'Երկու ամսում մինուս 8 կգ։ Մարզիչները՝ լավագույնը։' },
        { name: 'Օլգա', role: 'Մարզիչ', quote: 'Ժամանակացույցը հարմար է, դահլիճները միշտ բաց են։' },
      ],
      final: { title: 'Առաջին մարզումն անվճար է', subtitle: 'Եկեք և զգացեք տարբերությունը։' },
    },
    studio: {
      tag: 'Գործակալություն / պորտֆոլիո',
      label: 'Studio',
      nav: ['Աշխատանքներ', 'Ծառայություններ', 'Ստուդիայի մասին', 'Բլոգ', 'Կապ'],
      galleryLabels: ['Բրենդինգ', 'Դիզայն համակարգեր', 'Վեբ-դիզայն', 'Փրոդակթ դիզայն', 'UI/UX դիզայն', 'Վեբ-հավելված'],
      hero: { eyebrow: 'Դիզայն-ստուդիա', title: 'Ստեղծում ենք բրենդներ, որ նկատում են', subtitle: 'Պորտֆոլիո, քեյսեր և թիմի մոտեցում՝ մաքուր, խիստ, ըստ էության։' },
      logos: ['Vogue', 'Nike', 'Airbnb', 'Spotify', 'Figma', 'Notion'],
      features: [
        { title: 'Ինքնություն', body: 'Լոգոներ և այդենտիկա բնավորությամբ։' },
        { title: 'Ապրանք', body: 'Ինտերֆեյսներ, որոնցով հաճելի է օգտվել։' },
        { title: 'Մոգություն', body: 'Անիմացիաներ և դետալներ, որ կենդանացնում են բրենդը։' },
      ],
      showcase: { title: 'Գործընթաց, ոչ քաոս', body: 'Բրիֆից մինչև գործարկում՝ թափանցիկ ամեն քայլում։', points: ['Հետազոտություն', 'Կոնցեպտ', 'Իրականացում'] },
      gallery: { title: 'Ընտրված աշխատանքներ', subtitle: 'Մի փոքր վերջին գործերից։' },
      offer: {
        title: 'Աշխատանքի ձևաչափեր', subtitle: 'Դեմո — հայտն անջատված է։',
        items: [
          { name: 'Սփրինտ', price: '2 շաբ', note: 'արագ մեկնարկ', features: ['լենդինգ', 'այդենտիկա'] },
          { name: 'Նախագիծ', price: '6 շաբ', note: 'հանրաճանաչ', features: ['կայք', 'բրենդ', 'գայդլայն'] },
          { name: 'Գործընկերություն', price: '∞', note: 'շարունակական', features: ['առանձնացված թիմ', 'ռիթեյներ'] },
        ],
      },
      testimonials: [
        { name: 'Ելենա', role: 'Հաճախորդ', quote: 'Ռեբրենդինգ արեցին — վաճառքն աճեց 40%-ով։' },
        { name: 'Արտյոմ', role: 'Փրոդակթ', quote: 'Աշխատելը հաճույք է, ամեն ինչ ժամկետում։' },
      ],
      final: { title: 'Քննարկե՞նք ձեր նախագիծը', subtitle: 'Պատմեք խնդիրը — կառաջարկենք լուծում։' },
    },
    maison: {
      tag: 'Լյուքս / ռեստորան',
      label: 'Maison',
      nav: ['Մենյու', 'Մեր մասին', 'Մթնոլորտ', 'Բլոգ', 'Կապ'],
      hero: { eyebrow: 'Բարձր խոհանոց', title: 'Երեկո, որ կուզենաս երկարացնել', subtitle: 'Հեղինակային մենյու, անթերի սպասարկում և առանձնահատուկ առիթին արժանի մթնոլորտ։' },
      features: [
        { title: 'Նրբագեղ', body: 'Սեզոնային մենյու անվանի շեֆից։' },
        { title: 'Գինետուն', body: 'Ընտրված զույգեր յուրաքանչյուր ուտեստի համար։' },
        { title: 'Անթերի', body: 'Սպասարկում՝ մտածված մինչև մանրուք։' },
      ],
      showcase: { title: 'Գաստրոնոմիական թատրոն', body: 'Յուրաքանչյուր ուտեստ երեկոյի պատմության մասն է։', points: ['Դեգուստացիոն մենյու', 'Սոմելյե', 'Առանձնյակ դահլիճ'] },
      gallery: { title: 'Ինտերիեր և մատուցում', subtitle: 'Մթնոլորտն այցից առաջ։' },
      offer: {
        title: 'Դեգուստացիոն մենյու', subtitle: 'Դեմո — ամրագրումն անջատված է։',
        items: [
          { name: 'Ապերիտիվ', price: '—', note: 'ընդունելություն', features: ['փրփրագին', 'ամյուզ-բուշ'] },
          { name: '6 ուտեստանոց սեթ', price: '$95', note: 'signature', features: ['գինու զույգ', 'շեֆից'] },
          { name: 'Դիջեստիվ', price: '—', note: 'եզրափակիչ', features: ['դեսերտ', 'սուրճ'] },
        ],
      },
      testimonials: [
        { name: 'Վիկտորյա', role: 'Հյուր', quote: 'Տարվա լավագույն ընթրիքը։ Ամեն դետալ իր տեղում։' },
        { name: 'Նիկոլայ', role: 'Սոմելյե', quote: 'Ուտեստների զույգերն անթերի էին ընտրված։' },
      ],
      final: { title: 'Ամրագրել սեղան', subtitle: 'Ձեզ համար կպահենք լավագույն երեկոն։' },
    },
    pulse: {
      tag: 'Երաժշտություն / իվենթ',
      label: 'Pulse',
      nav: ['Աֆիշա', 'Արտիստներ', 'Տոմսեր', 'Մեր մասին', 'Կապ'],
      artists: { title: 'Աստղերը մեկ բեմում', subtitle: 'Սեզոնի լավագույն արտիստները։', cta: 'Տեսնել բոլոր արտիստներին', items: [
        { name: 'DJ Neon', genre: 'TECHNO' },
        { name: 'Luna Wave', genre: 'HOUSE' },
        { name: 'Bassline', genre: 'DRUM & BASS' },
        { name: 'Echo Pulse', genre: 'TRANCE' },
        { name: 'Vortex', genre: 'TECH HOUSE' },
      ] },
      hero: { eyebrow: 'Գիշերը սկսվում է այստեղ', title: 'Զգա բիթը', subtitle: 'Սեզոնի գլխավոր իրադարձության լայն-ափը, տոմսերը և մթնոլորտը։' },
      stats: [{ value: '20+', label: 'արտիստ' }, { value: '3', label: 'բեմ' }, { value: '12ժ', label: 'նոն-ստոպ' }],
      features: [
        { title: 'Ձայն', body: 'Լավագույն սաունդ-սեթափ և լույս։' },
        { title: 'Էներգիա', body: 'Համաշխարհային բեմի հեդլայներներ։' },
        { title: 'Տոմսեր', body: 'Պարզ մուտք QR-ով՝ առանց հերթերի։' },
      ],
      showcase: { title: 'Սեզոնի լայն-ափ', body: 'Երեք բեմ, տասնյակ արտիստներ, մեկ գիշեր։', points: ['Main stage', 'Techno room', 'Chill zone'] },
      gallery: { title: 'Անցյալ իրադարձություններ', subtitle: 'Ինչպես էր դա։' },
      offer: {
        title: 'Ժամանակացույց', subtitle: 'Դեմո — գնումն անջատված է։',
        items: [
          { name: 'Warm-up', price: '22:00', note: 'Main', features: ['DJ set', 'մուտքը բաց է'] },
          { name: 'Headliner', price: '00:00', note: 'Main', features: ['live', 'հատուկ էֆեկտներ'] },
          { name: 'After', price: '04:00', note: 'Techno', features: ['մինչև առավոտ', 'resident'] },
        ],
      },
      testimonials: [
        { name: 'Սաշա', role: 'Հյուր', quote: 'Տարվա լավագույն գիշերը, ձայնը՝ տիեզերք։' },
        { name: 'Kate', role: 'DJ', quote: 'Հարթակն ու հանդիսատեսը՝ կրակ։' },
      ],
      final: { title: 'Հասցրու սեզոնի ճակատամարտին', subtitle: 'Տոմսերը գրեթե սպառվել են։' },
    },
  },
};

export const PRESET_LOCALES: Record<Locale, PresetLocale> = { ru, en, hy };

export function presetDict(locale: Locale): PresetLocale {
  return PRESET_LOCALES[locale];
}
