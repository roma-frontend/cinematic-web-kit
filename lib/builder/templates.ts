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
