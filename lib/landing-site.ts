import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { getDb, newId, users, sites, type Site } from '@/lib/db';
import { makeNode, newId as newNodeId, type BuilderNode, type BuilderDoc, type BuilderPage, type NodeType } from '@/lib/builder/types';

// The landing page (/) is a normal builder site with a reserved slug, so it can
// be edited with the full visual builder (all node types, variants, hover /
// animation / effects, header/footer/user-menu chrome). Owned by the first
// (superadmin) user. Rendered at / via SiteRenderer; edited at /studio/builder.
export const LANDING_SLUG = '__landing__';

const mk = (type: NodeType, props: Record<string, string> = {}, children?: BuilderNode[]): BuilderNode => {
  const node = makeNode(type);
  node.props = { ...node.props, ...props };
  if (children) node.children = children;
  return node;
};

const featCard = (title: string, body: string): BuilderNode =>
  mk('card', { padding: 'md', cardVariant: 'elevated', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
    mk('heading', { text: title, level: '3', align: 'left' }),
    mk('text', { text: body, align: 'left', muted: 'true' }),
  ]);

function seedLandingDoc(): BuilderDoc {
  const year = new Date().getFullYear();
  const home: BuilderPage = {
    id: newNodeId('page'),
    path: '',
    title: 'Главная',
    description: 'ИИ-платформа для сайтов: генерация видео, авто-темы, визуальный конструктор и публикация.',
    blocks: [
      // Hero
      mk('section', { padding: 'lg', bg: 'none', width: 'normal', minH: 'half' }, [
        mk('stack', { gap: 'md', align: 'center' }, [
          mk('text', { text: 'ИИ-платформа для сайтов', align: 'center', muted: 'true', size: 'sm' }),
          mk('heading', { text: 'Соберите и опубликуйте сайт с помощью ИИ', level: '1', align: 'center', animate: 'slide-up' }),
          mk('text', { text: 'Опишите идею — платформа сгенерирует видео и тему, соберёт страницы в визуальном конструкторе и опубликует сайт на вашем поддомене. Без кода и дизайнеров.', align: 'center', size: 'lg', animate: 'fade' }),
          mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
            mk('button', { text: 'Начать бесплатно', href: '/register', variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
            mk('button', { text: 'Открыть Студию', href: '/studio', variant: 'outline', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
          ]),
          mk('text', { text: 'Без карты · старт за пару минут', align: 'center', muted: 'true', size: 'sm' }),
        ]),
      ]),
      // How it works
      mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
        mk('heading', { text: 'Как это работает', level: '2', align: 'center', animate: 'fade' }),
        mk('text', { text: 'Три шага от идеи до опубликованного сайта.', align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, [
          mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('heading', { text: '01', level: '1', align: 'left', textColor: 'primary' }),
            mk('heading', { text: 'Опишите идею', level: '3', align: 'left' }),
            mk('text', { text: 'Напишите бриф — Студия соберёт кинематографический промпт, сгенерирует ИИ-видео и подберёт тему под ваш продукт.', align: 'left', muted: 'true' }),
          ]),
          mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('heading', { text: '02', level: '1', align: 'left', textColor: 'primary' }),
            mk('heading', { text: 'Соберите страницы', level: '3', align: 'left' }),
            mk('text', { text: 'Визуальный конструктор с drag-and-drop, живым предпросмотром и готовыми лендингами. Никакого кода.', align: 'left', muted: 'true' }),
          ]),
          mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('heading', { text: '03', level: '1', align: 'left', textColor: 'primary' }),
            mk('heading', { text: 'Опубликуйте', level: '3', align: 'left' }),
            mk('text', { text: 'Один клик — и сайт живёт на вашем поддомене. Меняйте контент в любой момент, обновления сразу онлайн.', align: 'left', muted: 'true' }),
          ]),
        ]),
      ]),
      // Features
      mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
        mk('heading', { text: 'Возможности', level: '2', align: 'center', animate: 'fade' }),
        mk('text', { text: 'Всё для запуска красивого сайта — в одном месте.', align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '4', stagger: 'true' }, [
          featCard('ИИ-видео', 'Кинематографические ролики из текстового промпта, автоматически оптимизированные в .webm с постером.'),
          featCard('Авто-темы', 'Движок подбирает палитру, шрифты, радиусы и характер анимаций под содержание вашего сайта.'),
          featCard('Визуальный конструктор', 'Многостраничный редактор: секции, стили, варианты блоков, undo/redo, адаптив под мобильные.'),
          featCard('Публикация на поддомене', 'Собственный адрес вида your-brand.site, мгновенные обновления и живой предпросмотр.'),
        ]),
      ]),
      // Testimonials
      mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
        mk('heading', { text: 'Нам доверяют', level: '2', align: 'center' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3' }, [
          mk('testimonial', { quote: 'Собрали и запустили сайт за один вечер. Невероятно удобно!', author: 'Анна Петрова', role: 'CEO, Acme', quoteVariant: 'card' }),
          mk('testimonial', { quote: 'ИИ-видео и авто-темы экономят кучу времени.', author: 'Иван Смирнов', role: 'Founder', quoteVariant: 'card' }),
          mk('testimonial', { quote: 'Публикация в один клик — это магия.', author: 'Мария Кузнецова', role: 'Product', quoteVariant: 'card' }),
        ]),
      ]),
      // Final CTA
      mk('section', { padding: 'lg', bg: 'card', width: 'normal', minH: 'none' }, [
        mk('stack', { gap: 'sm', align: 'center' }, [
          mk('heading', { text: 'Запустите свой сайт уже сегодня', level: '2', align: 'center' }),
          mk('text', { text: 'Опишите идею — остальное сделает платформа. Публикация на поддомене в один клик.', align: 'center', muted: 'true' }),
          mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
            mk('button', { text: 'Начать бесплатно', href: '/register', variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
            mk('button', { text: 'Открыть конструктор', href: '/studio/builder', variant: 'outline', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
          ]),
        ]),
      ]),
    ],
  };

  return {
    brand: 'Cinematic Web Kit',
    themeId: 'auto',
    headerVariant: 'split',
    headerBehavior: 'sticky',
    footerVariant: 'columns',
    asideVariant: 'none',
    nav: [
      { label: 'Темы', href: '/themes' },
      { label: 'Конструктор', href: '/studio/builder' },
      { label: 'Студия', href: '/studio' },
      { label: 'Войти', href: '/login' },
    ],
    footer: {
      text: `© ${year} Cinematic Web Kit. Все права защищены.`,
      links: [
        { label: 'Темы', href: '/themes' },
        { label: 'Студия', href: '/studio' },
        { label: 'Войти', href: '/login' },
      ],
    },
    pages: [home],
  };
}

/** The reserved landing site, or null if it does not exist yet. */
export function getLandingSite(): Site | null {
  return getDb().select().from(sites).where(eq(sites.slug, LANDING_SLUG)).get() ?? null;
}

/** Get the landing site, creating + publishing a seeded one on first call.
 *  Returns null only if there is no user yet to own it. */
export function getOrCreateLandingSite(): Site | null {
  const db = getDb();
  const existing = getLandingSite();
  if (existing) return existing;
  const owner = db.select().from(users).orderBy(asc(users.createdAt)).get();
  if (!owner) return null; // no users yet — landing falls back to marketing
  const doc = seedLandingDoc();
  const now = new Date();
  const json = JSON.stringify(doc);
  const site: Site = {
    id: newId('s'),
    userId: owner.id,
    name: 'Лендинг (главная)',
    slug: LANDING_SLUG,
    draftDoc: json,
    publishedDoc: json, // publish immediately so / renders it right away
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sites).values(site).run();
  return site;
}
