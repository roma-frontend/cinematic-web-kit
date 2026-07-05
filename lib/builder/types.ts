// Visual site-builder schema. A BuilderDoc is a whole website: brand, theme,
// shared header nav + footer, and a list of pages. Each page is a tree of
// BuilderNodes (sections → containers → elements). The renderer in
// components/builder/render-node.tsx turns this into responsive markup and the
// editor in app/studio/builder edits it.

export type NodeType =
  | 'section'
  | 'stack'
  | 'row'
  | 'grid'
  | 'card'
  | 'heading'
  | 'text'
  | 'list'
  | 'counter'
  | 'button'
  | 'image'
  | 'video'
  | 'input'
  | 'textarea'
  | 'form'
  | 'pricing'
  | 'testimonial'
  | 'socials'
  | 'faq'
  | 'tabs'
  | 'divider'
  | 'spacer'
  | 'themeGallery'
  | 'videoGrid'
  | 'authLogin'
  | 'authRegister'
  | 'authAccount';

export interface BuilderNode {
  id: string;
  type: NodeType;
  props: Record<string, string>;
  children?: BuilderNode[];
}

export interface NavLink {
  label: string;
  href: string;
}

export interface BuilderPage {
  id: string;
  path: string; // '' = home (/site), 'about' = /site/about
  title: string;
  description?: string; // SEO meta description
  blocks: BuilderNode[];
}

export interface BuilderDoc {
  brand: string;
  themeId: string;
  headerVariant?: string;
  headerBehavior?: string;
  footerVariant?: string;
  asideVariant?: string;
  asideStyle?: string;
  /** Transient link base set by rebaseDoc for tenant rendering (e.g. '/s/slug').
   *  Absent for the legacy /site route. Used by chrome for brand/CTA links. */
  base?: string;
  /** Transient site id injected at render so end-user auth blocks know which
   *  tenant they belong to. Never edited/stored by the builder. */
  siteId?: string;
  nav: NavLink[];
  footer: { text: string; links: NavLink[] };
  pages: BuilderPage[];
}

/** Which node types accept children in the editor + renderer. */
export const CONTAINER_TYPES: NodeType[] = ['section', 'stack', 'row', 'grid', 'card', 'form'];
export const isContainer = (t: NodeType) => CONTAINER_TYPES.includes(t);

/** Human labels for the palette / tree. */
export const NODE_LABELS: Record<NodeType, string> = {
  section: 'Секция',
  stack: 'Колонка (stack)',
  row: 'Ряд (row)',
  grid: 'Сетка (grid)',
  card: 'Карточка',
  heading: 'Заголовок',
  text: 'Текст',
  list: 'Список',
  counter: 'Счётчик (count-up)',
  button: 'Кнопка',
  image: 'Картинка',
  video: 'Видео',
  input: 'Поле ввода',
  textarea: 'Многострочное поле',
  form: 'Форма',
  pricing: 'Тариф (прайс)',
  testimonial: 'Отзыв',
  socials: 'Соцсети',
  faq: 'FAQ / аккордеон',
  tabs: 'Вкладки',
  divider: 'Разделитель',
  spacer: 'Отступ',
  themeGallery: 'Галерея тем',
  videoGrid: 'Видео-сетка',
  authLogin: 'Вход (клиенты сайта)',
  authRegister: 'Регистрация (клиенты сайта)',
  authAccount: 'Личный кабинет',
};

let counter = 0;
export function newId(type: string): string {
  counter += 1;
  return `${type}-${Date.now().toString(36)}-${counter}`;
}

/** Default props for a freshly created node of a given type. */
export function defaultProps(type: NodeType): Record<string, string> {
  switch (type) {
    case 'section':
      return { padding: 'lg', bg: 'none', width: 'wide' };
    case 'stack':
      return { gap: 'md', align: 'stretch' };
    case 'row':
      return { gap: 'md', align: 'center', justify: 'start', wrap: 'wrap' };
    case 'grid':
      return { gap: 'md', columns: '3' };
    case 'card':
      return { padding: 'md', bg: 'card', border: 'true', gap: 'sm', cardVariant: 'elevated' };
    case 'heading':
      return { text: 'Заголовок', level: '2', align: 'left' };
    case 'text':
      return { text: 'Немного описательного текста для вашего сайта.', align: 'left', muted: 'true' };
    case 'list':
      return { items: 'Первый пункт\nВторой пункт\nТретий пункт', listVariant: 'bullet' };
    case 'counter':
      return { value: '10000+', label: 'клиентов', align: 'center' };
    case 'button':
      return { text: 'Кнопка', href: '/site', variant: 'default', size: 'default', align: 'left', type: 'link' };
    case 'image':
      return { src: '', alt: '', rounded: 'lg', ratio: '16/9' };
    case 'video':
      return { src: '', ratio: '16/9', rounded: 'lg' };
    case 'input':
      return { name: 'field', label: 'Метка', placeholder: 'Введите…', type: 'text' };
    case 'textarea':
      return { name: 'message', label: 'Сообщение', placeholder: 'Ваше сообщение…' };
    case 'form':
      return { formId: 'contact', submitText: 'Отправить', successMsg: 'Спасибо! Мы свяжемся с вами.' };
    case 'pricing':
      return { plan: 'Pro', price: '990₽', period: '/мес', features: 'Всё из Base\nПриоритетная поддержка\nБез ограничений', cta: 'Выбрать', href: '/site/contact', featured: 'false', priceVariant: 'card' };
    case 'testimonial':
      return { quote: 'Отличный продукт — собрали сайт за вечер!', author: 'Анна Иванова', role: 'CEO, Acme', quoteVariant: 'card' };
    case 'socials':
      return { links: 'Telegram|https://t.me\nGitHub|https://github.com\nEmail|mailto:hi@example.com', align: 'left', socialVariant: 'pills' };
    case 'faq':
      return { items: 'Как это работает?::Собираете страницу из блоков в конструкторе.\nЕсть ли адаптив?::Да, всё адаптивно из коробки.', align: 'left', faqVariant: 'bordered' };
    case 'tabs':
      return { items: 'Обзор::Краткое описание продукта.\nВозможности::Список ключевых функций.\nЦены::Информация о тарифах.' };
    case 'divider':
      return {};
    case 'spacer':
      return { height: 'md' };
    case 'themeGallery':
      return { count: '6', columns: '3' };
    case 'videoGrid':
      return { count: '6' };
    case 'authLogin':
      return { title: 'Вход', submitText: 'Войти', successMsg: 'Вы вошли.' };
    case 'authRegister':
      return { title: 'Регистрация', submitText: 'Создать аккаунт', successMsg: 'Аккаунт создан.', showName: 'true' };
    case 'authAccount':
      return { title: 'Личный кабинет', logoutText: 'Выйти' };
    default:
      return {};
  }
}

export function makeNode(type: NodeType): BuilderNode {
  const node: BuilderNode = { id: newId(type), type, props: defaultProps(type) };
  if (isContainer(type)) node.children = [];
  return node;
}

export const DEFAULT_DOC: BuilderDoc = {
  brand: 'Мой сайт',
  themeId: 'auto',
  nav: [
    { label: 'Главная', href: '/site' },
    { label: 'О нас', href: '/site/about' },
    { label: 'Контакты', href: '/site/contact' },
  ],
  footer: {
    text: '© 2025 Мой сайт. Все права защищены.',
    links: [
      { label: 'Политика', href: '/site/about' },
      { label: 'Контакты', href: '/site/contact' },
    ],
  },
  pages: [],
};
