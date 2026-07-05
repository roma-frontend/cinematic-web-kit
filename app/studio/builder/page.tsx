'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowUp, ArrowDown, X, Plus, Save, Loader2, Monitor, Tablet, Smartphone,
  ExternalLink, Trash2, FileText, LayoutTemplate, ChevronRight, Copy, Upload, Wand2, Palette,
  Undo2, Redo2, LayoutGrid, ChevronDown, Maximize2, Minimize2, Sun, Moon, Rocket, Home,
} from 'lucide-react';
import seed from '@/data/builder.json';
import { THEMES, getTheme, themeCss } from '@/lib/themes';
import { RenderNode } from '@/components/builder/render-node';
import { RevealDisabled } from '@/components/builder/reveal';
import { Header as ChromeHeader, Footer as ChromeFooter } from '@/components/builder/site-chrome';
import { TEMPLATES, LANDINGS, SECTION_PRESETS } from '@/lib/builder/templates';
import {
  type BuilderDoc, type BuilderNode, type NodeType, type BuilderPage,
  NODE_LABELS, isContainer, makeNode, newId,
} from '@/lib/builder/types';
import { updateProps, removeNode, insertChild, moveNode, findNode, duplicateNode, moveTo, insertAfter, ancestorTypes, ancestorPath } from '@/lib/builder/tree';

type Field = { k: string; label: string; kind?: 'text' | 'textarea'; opts?: string[] };

const FIELDS: Record<NodeType, Field[]> = {
  section: [
    { k: 'padding', label: 'Отступы', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'minH', label: 'Мин. высота', opts: ['none', 'half', 'screen'] },
    { k: 'bg', label: 'Фон', opts: ['none', 'muted', 'card', 'primary', 'gradient'] },
    { k: 'width', label: 'Ширина', opts: ['narrow', 'normal', 'wide'] },
    { k: 'bgImage', label: 'Фоновая картинка (URL)' },
    { k: 'bgMode', label: 'Режим фона', opts: ['cover', 'blur', 'overlay', 'tint', 'duotone'] },
    { k: 'bgVideo', label: 'Фоновое видео (URL .mp4)' },
    { k: 'parallax', label: 'Параллакс фона', opts: ['false', 'true'] },
  ],
  stack: [
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'Выравнивание', opts: ['start', 'center', 'end', 'stretch'] },
    { k: 'stagger', label: 'Появление по очереди', opts: ['false', 'true'] },
  ],
  row: [
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'По верт.', opts: ['start', 'center', 'end'] },
    { k: 'justify', label: 'По гориз.', opts: ['start', 'center', 'end', 'between'] },
    { k: 'wrap', label: 'Перенос', opts: ['wrap', 'nowrap'] },
    { k: 'stagger', label: 'Появление по очереди', opts: ['false', 'true'] },
  ],
  grid: [
    { k: 'columns', label: 'Колонок', opts: ['1', '2', '3', '4'] },
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'stagger', label: 'Появление по очереди', opts: ['false', 'true'] },
  ],
  card: [
    { k: 'cardVariant', label: 'Вариант', opts: ['elevated', 'outline', 'soft', 'plain'] },
    { k: 'padding', label: 'Внутр. отступ', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
  ],
  heading: [
    { k: 'text', label: 'Текст', kind: 'textarea' },
    { k: 'level', label: 'Уровень', opts: ['1', '2', '3', '4'] },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  text: [
    { k: 'text', label: 'Текст', kind: 'textarea' },
    { k: 'size', label: 'Размер', opts: ['sm', 'base', 'lg'] },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
    { k: 'muted', label: 'Приглушить', opts: ['true', 'false'] },
  ],
  list: [
    { k: 'items', label: 'Пункты (по строкам)', kind: 'textarea' },
    { k: 'listVariant', label: 'Вариант', opts: ['bullet', 'check', 'arrow', 'numbered', 'plain'] },
  ],
  counter: [
    { k: 'value', label: 'Значение (напр. 10000+, 99.9%)' },
    { k: 'label', label: 'Подпись' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  button: [
    { k: 'text', label: 'Текст' },
    { k: 'type', label: 'Тип', opts: ['link', 'submit', 'reset'] },
    { k: 'href', label: 'Ссылка (для типа link)' },
    { k: 'variant', label: 'Стиль', opts: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
    { k: 'size', label: 'Размер', opts: ['sm', 'default', 'lg'] },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  image: [
    { k: 'src', label: 'URL картинки' },
    { k: 'alt', label: 'Alt-текст' },
    { k: 'imgMode', label: 'Режим показа', opts: ['inline', 'cover', 'background', 'glow', 'overlay', 'duotone', 'framed'] },
    { k: 'rounded', label: 'Скругление', opts: ['none', 'lg', 'full'] },
    { k: 'ratio', label: 'Пропорции (напр. 16/9)' },
  ],
  video: [
    { k: 'src', label: 'URL (YouTube/Vimeo/MP4)' },
    { k: 'ratio', label: 'Пропорции (напр. 16/9)' },
    { k: 'rounded', label: 'Скругление', opts: ['none', 'lg'] },
  ],
  input: [
    { k: 'name', label: 'Имя поля' },
    { k: 'label', label: 'Метка' },
    { k: 'placeholder', label: 'Подсказка' },
    { k: 'type', label: 'Тип', opts: ['text', 'email', 'tel', 'number', 'password', 'url', 'search', 'date', 'time'] },
    { k: 'required', label: 'Обязательное', opts: ['false', 'true'] },
  ],
  textarea: [
    { k: 'name', label: 'Имя поля' },
    { k: 'label', label: 'Метка' },
    { k: 'placeholder', label: 'Подсказка' },
    { k: 'required', label: 'Обязательное', opts: ['false', 'true'] },
  ],
  form: [
    { k: 'formId', label: 'ID формы' },
    { k: 'submitText', label: 'Текст кнопки' },
    { k: 'successMsg', label: 'Сообщение об успехе' },
  ],
  pricing: [
    { k: 'priceVariant', label: 'Вариант', opts: ['card', 'outline', 'minimal'] },
    { k: 'plan', label: 'Название плана' },
    { k: 'price', label: 'Цена' },
    { k: 'period', label: 'Период (напр. /мес)' },
    { k: 'features', label: 'Фичи (по строкам)', kind: 'textarea' },
    { k: 'cta', label: 'Текст кнопки' },
    { k: 'href', label: 'Ссылка кнопки' },
    { k: 'featured', label: 'Выделить', opts: ['false', 'true'] },
  ],
  testimonial: [
    { k: 'quoteVariant', label: 'Вариант', opts: ['card', 'quote', 'minimal', 'centered'] },
    { k: 'quote', label: 'Цитата', kind: 'textarea' },
    { k: 'author', label: 'Автор' },
    { k: 'role', label: 'Должность / компания' },
  ],
  socials: [
    { k: 'socialVariant', label: 'Вариант', opts: ['pills', 'buttons', 'underline', 'minimal'] },
    { k: 'links', label: 'Ссылки «Текст|URL» (по строкам)', kind: 'textarea' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  faq: [
    { k: 'faqVariant', label: 'Вариант', opts: ['bordered', 'separated', 'card', 'plain'] },
    { k: 'items', label: 'Вопрос::Ответ (по строкам)', kind: 'textarea' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center'] },
  ],
  tabs: [{ k: 'items', label: 'Вкладка::Содержимое (по строкам)', kind: 'textarea' }],
  divider: [],
  spacer: [{ k: 'height', label: 'Высота', opts: ['sm', 'md', 'lg'] }],
};

const PALETTE: NodeType[] = ['section', 'stack', 'row', 'grid', 'card', 'heading', 'text', 'list', 'counter', 'button', 'image', 'video', 'input', 'textarea', 'form', 'pricing', 'testimonial', 'socials', 'faq', 'tabs', 'divider', 'spacer'];

// Styling controls available for EVERY element, grouped for quick access.
const STYLE_GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Типографика',
    fields: [
      { k: 'fontSize', label: 'Размер шрифта', opts: ['—', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] },
      { k: 'fontWeight', label: 'Насыщенность', opts: ['—', 'normal', 'medium', 'semibold', 'bold'] },
      { k: 'letterSpacing', label: 'Межбуквенный', opts: ['—', 'normal', 'wide', 'wider'] },
      { k: 'lineHeight', label: 'Межстрочный', opts: ['—', 'tight', 'normal', 'relaxed', 'loose'] },
      { k: 'textColor', label: 'Цвет текста', opts: ['—', 'primary', 'foreground', 'muted', 'white'] },
    ],
  },
  {
    title: 'Фон и границы',
    fields: [
      { k: 'bgColor', label: 'Фон', opts: ['—', 'transparent', 'primary', 'muted', 'card', 'foreground', 'white', 'black'] },
      { k: 'borderWidth', label: 'Толщина рамки', opts: ['—', '0', '1', '2', '4'] },
      { k: 'borderColor', label: 'Цвет рамки', opts: ['—', 'border', 'primary', 'muted', 'foreground', 'white'] },
      { k: 'radius', label: 'Скругление', opts: ['—', 'none', 'sm', 'lg', 'xl', 'full'] },
      { k: 'ring', label: 'Ring (фокус)', opts: ['—', 'none', 'primary', 'subtle', 'offset'] },
      { k: 'shadow', label: 'Тень', opts: ['—', 'none', 'sm', 'md', 'lg', 'xl'] },
      { k: 'opacity', label: 'Прозрачность', opts: ['—', '100', '90', '75', '50'] },
    ],
  },
  {
    title: 'Отступы',
    fields: [
      { k: 'mt', label: 'Отступ сверху', opts: ['—', 'none', 'sm', 'md', 'lg'] },
      { k: 'mb', label: 'Отступ снизу', opts: ['—', 'none', 'sm', 'md', 'lg'] },
    ],
  },
  {
    title: 'Адаптив (на каких экранах показывать)',
    fields: [
      { k: 'showOn', label: 'Показывать на', opts: ['—', 'all', 'mobile', 'tablet', 'desktop'] },
    ],
  },
  {
    title: 'Анимация и наведение',
    fields: [
      { k: 'animate', label: 'Анимация появления', opts: ['—', 'none', 'fade', 'slide-up', 'slide-left', 'slide-right', 'zoom', 'mask'] },
      { k: 'loop', label: 'Постоянная анимация', opts: ['—', 'none', 'pulse', 'float', 'bounce'] },
      { k: 'hover', label: 'Движение при наведении', opts: ['—', 'none', 'lift', 'grow', 'glow', 'bright', 'pulse'] },
      { k: 'hoverBg', label: 'Фон при наведении', opts: ['—', 'none', 'primary', 'muted', 'foreground', 'dark'] },
      { k: 'hoverText', label: 'Цвет текста при наведении', opts: ['—', 'none', 'primary', 'foreground', 'muted'] },
    ],
  },
];
const DEVICE = { full: '100%', tablet: '768px', mobile: '390px' } as const;

// useSearchParams requires a Suspense boundary at the page level.
export default function BuilderEditorPage() {
  return (
    <Suspense>
      <BuilderEditor />
    </Suspense>
  );
}

interface SiteMeta {
  id: string;
  name: string;
  slug: string;
  published: boolean;
}

function BuilderEditor() {
  const router = useRouter();
  const siteId = useSearchParams().get('site');
  const [siteMeta, setSiteMeta] = useState<SiteMeta | null>(null);
  const [doc, setDoc] = useState<BuilderDoc>(seed as unknown as BuilderDoc);
  const [pageId, setPageId] = useState<string>((seed as unknown as BuilderDoc).pages[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<keyof typeof DEVICE>('full');
  const [tab, setTab] = useState<'pages' | 'blocks' | 'design'>('pages');
  const [previewWidth, setPreviewWidth] = useState(520);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewDark, setPreviewDark] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dropHint, setDropHint] = useState<{ id: string; pos: 'before' | 'after' } | null>(null);
  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const startResize = () => {
    const onMove = (e: MouseEvent) => setPreviewWidth(Math.min(1100, Math.max(300, window.innerWidth - e.clientX)));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Mirror `dirty` into a ref so unmount/unload flush handlers see the latest.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const [msg, setMsg] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPath, setNewPath] = useState('');

  // Load the tenant's draft doc. The builder always works on a concrete site
  // (?site=<id>); without it we send the user to the dashboard to pick one.
  useEffect(() => {
    if (!siteId) {
      router.replace('/dashboard');
      return;
    }
    fetch(`/api/builder?site=${encodeURIComponent(siteId)}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/studio/builder?site=${siteId}`)}`);
          return null;
        }
        if (!r.ok) {
          router.replace('/dashboard');
          return null;
        }
        return r.json() as Promise<{ doc: BuilderDoc; site: SiteMeta }>;
      })
      .then((d) => {
        if (!d) return;
        if (d.doc?.pages?.length) {
          skipHistory.current = true; // the fetched doc is the baseline, not an undoable edit
          setDoc(d.doc);
          setPageId(d.doc.pages[0].id);
        }
        setSiteMeta(d.site);
      })
      .catch(() => setMsg('Не удалось загрузить сайт.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, router]);

  // ---- undo / redo history ----
  const past = useRef<BuilderDoc[]>([]);
  const future = useRef<BuilderDoc[]>([]);
  const skipHistory = useRef(true); // skip the very first (mount) doc
  const prevDoc = useRef<BuilderDoc>(doc);
  const [histTick, setHistTick] = useState(0);
  useEffect(() => {
    if (skipHistory.current) {
      skipHistory.current = false;
      prevDoc.current = doc;
      return;
    }
    if (prevDoc.current !== doc) {
      past.current.push(prevDoc.current);
      if (past.current.length > 60) past.current.shift();
      future.current = [];
      prevDoc.current = doc;
      setHistTick((t) => t + 1);
      setDirty(true);
    }
  }, [doc]);
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(doc);
    skipHistory.current = true;
    setDoc(p);
    setHistTick((t) => t + 1);
    setDirty(true);
  };
  const redo = () => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(doc);
    skipHistory.current = true;
    setDoc(n);
    setHistTick((t) => t + 1);
    setDirty(true);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  void histTick;

  // Click-to-select coming from the live preview iframe (edit mode).
  const previewRef = useRef<HTMLIFrameElement>(null);
  const stateRef = useRef({ doc, pageId, selectedId, previewDark });
  stateRef.current = { doc, pageId, selectedId, previewDark };
  const postPreview = useCallback(() => {
    previewRef.current?.contentWindow?.postMessage({ source: 'builder-editor', ...stateRef.current }, '*');
  }, []);

  // Insert an element dropped from the palette onto the live page, snapping it
  // into the nearest container, with validation hints when placement is risky.
  const dropOnPreview = useCallback((nodeType: NodeType, targetId: string | null) => {
    const { doc: d, pageId: pid } = stateRef.current;
    const pg = d.pages.find((p) => p.id === pid) ?? d.pages[0];
    if (!pg) return;
    const node = makeNode(nodeType);
    const applyBlocks = (blocks: BuilderNode[]) =>
      setDoc((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === pg.id ? { ...p, blocks } : p)) }));
    const target = targetId ? findNode(pg.blocks, targetId) : null;

    if (nodeType === 'input' || nodeType === 'textarea') {
      const anc = targetId ? ancestorTypes(pg.blocks, targetId) : [];
      const insideForm = target?.type === 'form' || anc.includes('form');
      if (!insideForm) setMsg('⚠ Поля ввода работают внутри «Формы». Добавьте блок «Форма» и перетащите поле в неё — иначе данные не отправятся.');
    }
    if (target) {
      if (isContainer(target.type)) applyBlocks(insertChild(pg.blocks, target.id, node));
      else applyBlocks(insertAfter(pg.blocks, target.id, node));
    } else {
      applyBlocks([...pg.blocks, node]);
      if (nodeType !== 'section') setMsg('💡 Совет: на верхнем уровне лучше сначала добавить «Секцию», а элементы помещать внутрь неё.');
    }
    setSelectedId(node.id);
    setTab('blocks');
  }, []);
  // Push live state to the preview on every change — instant, no save needed.
  useEffect(() => {
    postPreview();
  }, [doc, pageId, selectedId, previewDark, postPreview]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source !== 'builder-preview') return;
      if (e.data.type === 'ready') postPreview();
      else if (e.data.type === 'select' && e.data.id) {
        setSelectedId(e.data.id as string);
        setTab('blocks');
      } else if (e.data.type === 'drop' && e.data.nodeType) {
        dropOnPreview(e.data.nodeType as NodeType, (e.data.targetId as string | null) ?? null);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [postPreview, dropOnPreview]);

  const page: BuilderPage | undefined = useMemo(
    () => doc.pages.find((p) => p.id === pageId) ?? doc.pages[0],
    [doc, pageId],
  );
  const selected = useMemo(
    () => (selectedId && page ? findNode(page.blocks, selectedId) : null),
    [selectedId, page],
  );

  // Apply a blocks transform to the CURRENT page using the latest state — never
  // a render-time snapshot — so consecutive edits accumulate instead of the
  // last one overwriting the rest.
  const setBlocks = (fn: (blocks: BuilderNode[]) => BuilderNode[]) =>
    setDoc((d) => {
      const pid = page?.id ?? d.pages[0]?.id;
      return { ...d, pages: d.pages.map((p) => (p.id === pid ? { ...p, blocks: fn(p.blocks) } : p)) };
    });

  const addNode = (type: NodeType) => {
    if (!page) return;
    const node = makeNode(type);
    if (selected && isContainer(selected.type)) setBlocks((b) => insertChild(b, selected.id, node));
    else setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
  };

  const patch = (id: string, p: Record<string, string>) => setBlocks((b) => updateProps(b, id, p));

  const duplicate = (id: string) => {
    if (!page) return;
    const { nodes, newId: nid } = duplicateNode(page.blocks, id);
    setBlocks(() => nodes);
    if (nid) setSelectedId(nid);
  };

  // Drag-and-drop within the structure tree.
  const dragId = useRef<string | null>(null);
  const paletteDrag = useRef<NodeType | null>(null);
  // Drop a palette element onto the empty page area (append to root).
  const onRootDrop = () => {
    const pType = paletteDrag.current;
    paletteDrag.current = null;
    dragId.current = null;
    if (!page || !pType) return;
    const node = makeNode(pType);
    setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
  };

  // Image upload for the selected image node.
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const uploadImage = async (file: File, nodeId: string) => {
    setUploadBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) patch(nodeId, { src: data.url });
      else setMsg(data.error || 'Ошибка загрузки');
    } catch {
      setMsg('Ошибка загрузки');
    } finally {
      setUploadBusy(false);
    }
  };

  // Generate a whole page from a brief.
  const [brief, setBrief] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const generatePage = async () => {
    if (!brief.trim()) return;
    setGenBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, title: brief.trim().slice(0, 40), path: '' }),
      });
      const data = await res.json();
      if (res.ok && data.page) {
        addPageDoc(data.page as BuilderPage);
        setBrief('');
        setMsg(`Страница создана (${data.source === 'llm' ? 'LLM' : 'шаблон'}). Не забудьте «Сохранить».`);
      } else setMsg(data.error || 'Ошибка генерации');
    } catch {
      setMsg('Ошибка генерации');
    } finally {
      setGenBusy(false);
    }
  };

  // ---- pages ----
  const addPage = () => {
    const title = newTitle.trim() || 'Новая страница';
    const path = newPath.trim().replace(/^\/+|\/+$/g, '');
    if (doc.pages.some((p) => p.path === path)) {
      setMsg(`Путь "${path}" уже занят`);
      return;
    }
    const p: BuilderPage = { id: newId('page'), path, title, blocks: [] };
    setDoc((d) => ({ ...d, pages: [...d.pages, p] }));
    setPageId(p.id);
    setNewTitle('');
    setNewPath('');
  };
  const deletePage = (id: string) => {
    if (doc.pages.length <= 1) return;
    setDoc((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }));
    if (pageId === id) setPageId(doc.pages.find((p) => p.id !== id)?.id ?? '');
  };
  const renamePage = (field: 'title' | 'path' | 'description', val: string) =>
    setDoc((d) => ({ ...d, pages: d.pages.map((p) => (p.id === page?.id ? { ...p, [field]: field === 'path' ? val.replace(/^\/+|\/+$/g, '') : val } : p)) }));

  // Swap the chosen page into the site root: it takes the empty path and the
  // former homepage inherits its old one, so neither page loses its URL.
  const makeHomepage = (id: string) => {
    const target = doc.pages.find((p) => p.id === id);
    if (!target || target.path === '') return;
    const oldHome = doc.pages.find((p) => p.path === '');
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === id ? { ...p, path: '' } : p.path === '' ? { ...p, path: target.path } : p,
      ),
    }));
    setMsg(oldHome
      ? `«${target.title}» теперь главная страница. Прежняя главная («${oldHome.title}») доступна по /${target.path}.`
      : `«${target.title}» теперь главная страница.`);
  };

  // Adds a page, ensuring its path is unique; selects it.
  const addPageDoc = (np: BuilderPage): BuilderPage => {
    let base = np.path ?? '';
    if (base === '' && doc.pages.some((p) => p.path === '')) base = 'home';
    let path = base;
    let i = 2;
    while (doc.pages.some((p) => p.path === path)) path = `${base || 'page'}-${i++}`;
    const created: BuilderPage = { ...np, id: newId('page'), path };
    setDoc((d) => ({ ...d, pages: [...d.pages, created] }));
    setPageId(created.id);
    setSelectedId(null);
    return created;
  };
  const addTemplate = (id: string) => {
    const t = [...LANDINGS, ...TEMPLATES].find((x) => x.id === id);
    if (!t) return;
    const created = addPageDoc(t.build());
    if (t.themeId) setDoc((d) => ({ ...d, themeId: t.themeId! }));
    if (t.asideVariant) setDoc((d) => ({ ...d, asideVariant: t.asideVariant! }));
    setMsg(created.path === ''
      ? `«${t.label}» добавлен как главная страница${t.themeId ? ' (тема применена)' : ''}.`
      : `«${t.label}» — новая страница /${created.path}${t.themeId ? ' (тема применена)' : ''}. Посетители по-прежнему увидят текущую главную — чтобы показать эту страницу первой, нажмите домик в списке страниц.`);
  };
  const addSectionPreset = (id: string) => {
    const s = SECTION_PRESETS.find((x) => x.id === id);
    if (!s || !page) return;
    const node = s.build();
    setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
    setMsg(`Секция «${s.label}» добавлена в конец страницы.`);
  };

  // ---- nav / footer / brand ----
  const setNavLink = (i: number, key: 'label' | 'href', val: string) =>
    setDoc((d) => ({ ...d, nav: d.nav.map((l, j) => (j === i ? { ...l, [key]: val } : l)) }));
  const addNavLink = () => setDoc((d) => ({ ...d, nav: [...d.nav, { label: 'Пункт', href: '/site' }] }));
  const removeNavLink = (i: number) => setDoc((d) => ({ ...d, nav: d.nav.filter((_, j) => j !== i) }));

  // Save the draft to the tenant site. Always sends the latest doc (via
  // stateRef) and only clears `dirty` if no edit happened while the request
  // was in flight. Returns true on success so publish can chain on top of it.
  // savingRef holds the in-flight request: manual save/publish waits it out
  // and saves again; autosave bails and gets rescheduled via saveTick.
  const savingRef = useRef<Promise<boolean> | null>(null);
  const [saveTick, setSaveTick] = useState(0);
  const saveDraft = (auto = false): Promise<boolean> => {
    if (!siteId) return Promise.resolve(false);
    if (savingRef.current) {
      if (auto) return Promise.resolve(false);
      return savingRef.current.then(() => saveDraft(auto), () => saveDraft(auto));
    }
    const run = async (): Promise<boolean> => {
      const sentDoc = stateRef.current.doc;
      try {
        const res = await fetch(`/api/builder?site=${encodeURIComponent(siteId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sentDoc),
        });
        const data = await res.json();
        if (res.ok) {
          if (stateRef.current.doc === sentDoc) setDirty(false);
          const liveMsg = data.published ? ' · обновлено в live' : '';
          setMsg(auto ? `Автосохранено${liveMsg}` : `Сохранено · страниц: ${data.pages}${liveMsg}`);
          if (!auto) setPreviewKey((k) => k + 1);
          return true;
        }
        setMsg(data.error || 'Ошибка');
        return false;
      } finally {
        savingRef.current = null;
        setSaveTick((t) => t + 1); // reschedule autosave if edits arrived mid-request
      }
    };
    savingRef.current = run();
    return savingRef.current;
  };

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      await saveDraft();
    } catch {
      setMsg('Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  };

  // Debounced autosave: edits land in the DB after 2s of inactivity, so
  // closing the tab can't lose more than the last couple of seconds of work.
  useEffect(() => {
    if (!dirty || !siteMeta) return;
    const t = setTimeout(() => {
      saveDraft(true).catch(() => setMsg('Автосохранение не удалось — проверьте сеть.'));
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, doc, siteMeta, saveTick]);

  // Warn before leaving with unsaved edits (e.g. autosave hasn't fired yet).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Best-effort synchronous flush that survives the page unload.
      if (siteId) {
        try {
          fetch(`/api/builder?site=${encodeURIComponent(siteId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stateRef.current.doc),
            keepalive: true,
          });
        } catch { /* ignore */ }
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, siteId]);

  // Flush unsaved edits when leaving the builder via in-app navigation
  // (SPA route change unmounts this component without firing beforeunload).
  useEffect(() => {
    return () => {
      if (dirtyRef.current && siteId) {
        try {
          fetch(`/api/builder?site=${encodeURIComponent(siteId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stateRef.current.doc),
            keepalive: true,
          });
        } catch { /* ignore */ }
      }
    };
  }, [siteId]);

  const [pubBusy, setPubBusy] = useState(false);
  const publish = async () => {
    if (!siteId) return;
    setPubBusy(true);
    setMsg('');
    try {
      if (!(await saveDraft())) return; // publish snapshots the draft — save it first
      const res = await fetch(`/api/sites/${siteId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSiteMeta((m) => (m ? { ...m, published: true } : m));
        setMsg(`Опубликовано — сайт доступен по /s/${siteMeta?.slug ?? ''}`);
      } else setMsg(data.error || 'Ошибка публикации');
    } catch {
      setMsg('Ошибка публикации');
    } finally {
      setPubBusy(false);
    }
  };

  // Owner draft preview on the tenant route ('?draft=1' shows unsaved-published work).
  const previewSrc = siteMeta
    ? `/s/${siteMeta.slug}${page?.path ? `/${page.path}` : ''}?draft=1`
    : '/dashboard';

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[120rem] items-center gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight" title="К списку сайтов">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Конструктор
          </Link>
          <div className="mx-2 h-6 w-px bg-border" />
          <Input value={doc.brand} onChange={(e) => setDoc((d) => ({ ...d, brand: e.target.value }))} className="h-8 w-44" aria-label="Название сайта" />
          <div className="hidden items-center gap-1 sm:flex">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Select value={doc.themeId} onValueChange={(v) => { setDoc((d) => ({ ...d, themeId: v })); }}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Тема" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Авто</SelectItem>
                {THEMES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(['full', 'tablet', 'mobile'] as const).map((dv) => {
              const Icon = dv === 'full' ? Monitor : dv === 'tablet' ? Tablet : Smartphone;
              return (
                <button key={dv} onClick={() => setDevice(dv)} className={`rounded-md p-1.5 ${device === dv ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label={dv}>
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <Link href={previewSrc} target="_blank"><Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-4 w-4" /> Открыть</Button></Link>
          <button onClick={undo} disabled={!canUndo} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Отменить" title="Отменить (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Повторить" title="Повторить (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></button>
          <Button size="sm" onClick={save} disabled={busy || pubBusy} className="relative gap-1.5" title={dirty ? 'Есть несохранённые изменения (автосохранение через пару секунд)' : 'Всё сохранено'}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Сохранить
            {dirty && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500" aria-label="Несохранённые изменения" />}
          </Button>
          <Button size="sm" variant={siteMeta?.published ? 'outline' : 'default'} onClick={publish} disabled={busy || pubBusy} className="gap-1.5" title="Сохранить черновик и опубликовать">
            {pubBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {siteMeta?.published ? 'Обновить' : 'Опубликовать'}
          </Button>
        </div>
        {msg && <div className="border-t border-border/60 bg-muted/40 px-4 py-1 text-center text-xs text-muted-foreground">{msg}</div>}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex-1 min-w-0 overflow-y-auto border-r border-border/60 p-3">
          {/* Tabs */}
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
            {([['pages', 'Страницы'], ['blocks', 'Блоки'], ['design', 'Сайт']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>
            ))}
          </div>

          {/* TAB: Страницы */}
          <div className={tab === 'pages' ? 'space-y-4' : 'hidden'}>
          {/* Ready-made landings */}
          <Card className="p-3">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><LayoutTemplate className="h-4 w-4 text-primary" /> Готовые лендинги</p>
            <p className="mb-2 text-xs text-muted-foreground">Выберите лендинг — добавится как страница с подходящей темой, дальше меняйте под себя.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {LANDINGS.map((t) => (
                <div key={t.id} role="button" tabIndex={0} onClick={() => addTemplate(t.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTemplate(t.id); } }} className="cursor-pointer overflow-hidden rounded-lg border border-border/60 text-left transition-colors hover:border-primary/60">
                  <LandingThumb def={t} />
                  <span className="block px-2 pt-1.5 text-xs font-semibold">{t.label}</span>
                  <span className="block px-2 pb-2 text-[10px] leading-tight text-muted-foreground">{t.description}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Generate page from brief */}
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4 text-primary" /> Сгенерировать страницу</p>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="Опишите сайт: напр. «лендинг кофейни с меню и формой заявки»" className="mb-2" />
            <Button size="sm" onClick={generatePage} disabled={genBusy || !brief.trim()} className="w-full gap-1.5">
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Создать по брифу
            </Button>
          </Card>

          {/* Ready-made templates */}
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><LayoutGrid className="h-4 w-4 text-primary" /> Отдельные страницы</p>
            <div className="space-y-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => addTemplate(t.id)} className="w-full rounded-lg border border-border/60 p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/50">
                  <span className="flex items-center justify-between text-sm font-medium">{t.label}<Plus className="h-3.5 w-3.5 text-muted-foreground" /></span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Pages */}
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> Страницы</p>
            <div className="space-y-1">
              {doc.pages.map((p) => (
                <div key={p.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${p.id === page?.id ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'}`}>
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => { setPageId(p.id); setSelectedId(null); }}>
                    {p.title} <span className="text-xs text-muted-foreground">/{p.path}</span>
                  </button>
                  {p.path === '' ? (
                    <span title="Главная страница — открывается по адресу сайта" className="shrink-0 text-primary"><Home className="h-3.5 w-3.5" /></span>
                  ) : (
                    <button onClick={() => makeHomepage(p.id)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100" title="Сделать главной страницей" aria-label="Сделать главной страницей"><Home className="h-3.5 w-3.5" /></button>
                  )}
                  {doc.pages.length > 1 && (
                    <button onClick={() => deletePage(p.id)} className="text-muted-foreground hover:text-red-500" aria-label="Удалить страницу"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название" className="h-8" />
              <div className="flex gap-1.5">
                <Input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="путь (напр. pricing)" className="h-8" />
                <Button size="sm" onClick={addPage} className="shrink-0 gap-1"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>

          {/* Current page settings */}
          {page && (
            <Card className="space-y-2 p-3">
              <p className="text-sm font-semibold">Страница</p>
              <Input value={page.title} onChange={(e) => renamePage('title', e.target.value)} placeholder="Заголовок" className="h-8" />
              <Input value={page.path} onChange={(e) => renamePage('path', e.target.value)} placeholder="путь (пусто = главная)" className="h-8" />
              <Textarea value={page.description ?? ''} onChange={(e) => renamePage('description', e.target.value)} rows={2} placeholder="SEO-описание (meta description)" />
            </Card>
          )}
          </div>{/* end Страницы */}

          {/* TAB: Блоки */}
          <div className={tab === 'blocks' ? 'grid items-start gap-4 lg:grid-cols-2' : 'hidden'}>
          <div className="space-y-4">
          {/* Palette */}
          <Card className="p-3">
            <p className="mb-1 text-sm font-semibold">Добавить элемент</p>
            <p className="mb-2 text-xs text-muted-foreground">{selected && isContainer(selected.type) ? `Клик — внутрь: ${NODE_LABELS[selected.type]}` : 'Клик — в конец страницы'} · или перетащите на блок</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE.map((t) => (
                <Button key={t} size="sm" variant="outline" draggable onDragStart={(e) => { paletteDrag.current = t; e.dataTransfer.setData('text/builder-type', t); e.dataTransfer.effectAllowed = 'copy'; }} className="cursor-grab justify-start gap-1 text-xs active:cursor-grabbing" onClick={() => addNode(t)}>
                  <Plus className="h-3.5 w-3.5" /> {NODE_LABELS[t]}
                </Button>
              ))}
            </div>
          </Card>

          {/* Section presets */}
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">Готовые секции</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_PRESETS.map((s) => (
                <Button key={s.id} size="sm" variant="outline" className="justify-start gap-1 text-xs" onClick={() => addSectionPreset(s.id)}>
                  <Plus className="h-3.5 w-3.5" /> {s.label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Tree */}
          <Card className="p-3" onDragOver={(e) => e.preventDefault()} onDrop={onRootDrop}>
            <p className="mb-1 text-sm font-semibold">Структура</p>
            <p className="mb-2 text-xs text-muted-foreground">Перетащите элемент из палитры сюда или на нужный блок.</p>
            {page && page.blocks.length > 0 ? (
              <Tree nodes={page.blocks} depth={0} selectedId={selectedId} onSelect={setSelectedId}
                collapsed={collapsed} onToggle={toggleCollapse}
                dropHint={dropHint} setDropHint={setDropHint}
                onMove={(id, dir) => setBlocks((b) => moveNode(b, id, dir))}
                onDuplicate={duplicate}
                onDragStartId={(id) => { dragId.current = id; }}
                onDropRow={(id, pos) => { const dg = dragId.current; if (dg) setBlocks((b) => moveTo(b, dg, id, pos)); dragId.current = null; setDropHint(null); }}
                onDelete={(id) => { setBlocks((b) => removeNode(b, id)); if (selectedId === id) setSelectedId(null); }} />
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Пусто — добавьте элемент из палитры.</p>
            )}
          </Card>
          </div>{/* col A */}

          {/* Properties */}
          <div className="space-y-4">
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">Свойства</p>
            {selected ? (
              <div className="space-y-2.5">
                {page && (
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {ancestorPath(page.blocks, selected.id).map((a) => (
                      <span key={a.id} className="flex items-center gap-1">
                        <button className="hover:text-foreground" onClick={() => setSelectedId(a.id)}>{NODE_LABELS[a.type as NodeType] ?? a.type}</button>
                        <span>›</span>
                      </span>
                    ))}
                    <span className="font-medium text-foreground">{NODE_LABELS[selected.type]}</span>
                  </div>
                )}
                {FIELDS[selected.type].length === 0 && <p className="text-xs text-muted-foreground">Нет настроек контента.</p>}
                {FIELDS[selected.type].map((f) => (
                  <div key={f.k}>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                    {f.opts ? (
                      <Select value={selected.props[f.k] ?? f.opts[0]} onValueChange={(v) => patch(selected.id, { [f.k]: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{f.opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : f.kind === 'textarea' ? (
                      <Textarea value={selected.props[f.k] ?? ''} onChange={(e) => patch(selected.id, { [f.k]: e.target.value })} rows={3} />
                    ) : (
                      <Input value={selected.props[f.k] ?? ''} onChange={(e) => patch(selected.id, { [f.k]: e.target.value })} className="h-8" />
                    )}
                  </div>
                ))}
                {selected.type === 'image' && (
                  <div className="border-t border-border/60 pt-2">
                    <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={uploadBusy} onClick={() => uploadRef.current?.click()}>
                      {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Загрузить картинку
                    </Button>
                    <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], selected.id)} />
                  </div>
                )}

                {/* Styling for every element */}
                {STYLE_GROUPS.map((g) => (
                  <div key={g.title} className="border-t border-border/60 pt-2.5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {g.fields.map((f) => {
                        const isColor = f.k === 'textColor' || f.k === 'bgColor' || f.k === 'borderColor';
                        const val = selected.props[f.k];
                        return (
                          <div key={f.k}>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{f.label}</label>
                            <div className="flex gap-1">
                              <Select value={val && !val.startsWith('#') ? val : '—'} onValueChange={(v) => patch(selected.id, { [f.k]: v === '—' ? '' : v })}>
                                <SelectTrigger className="h-8 min-w-0 flex-1"><SelectValue placeholder={val?.startsWith('#') ? 'свой' : undefined} /></SelectTrigger>
                                <SelectContent>{f.opts!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                              </Select>
                              {isColor && (
                                <input
                                  type="color"
                                  value={val?.startsWith('#') ? val : '#000000'}
                                  onChange={(e) => patch(selected.id, { [f.k]: e.target.value })}
                                  title="Выбрать свой цвет"
                                  className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Выберите элемент в структуре, чтобы редактировать.</p>
            )}
          </Card>
          </div>{/* col B */}
          </div>{/* end Блоки */}

          {/* TAB: Сайт */}
          <div className={tab === 'design' ? 'space-y-4' : 'hidden'}>
          {/* Chrome variants */}
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">Шапка (header)</p>
            <div className="grid grid-cols-2 gap-2">
              {(['minimal', 'centered', 'split', 'cta'] as const).map((v) => (
                <div key={v} role="button" tabIndex={0} onClick={() => setDoc((d) => ({ ...d, headerVariant: v }))} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDoc((d) => ({ ...d, headerVariant: v })); }} className={`cursor-pointer overflow-hidden rounded-lg border p-1 text-left transition-colors ${(doc.headerVariant || 'minimal') === v ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}>
                  <ChromeThumb doc={doc} kind="header" variant={v} />
                  <span className="mt-1 block text-[11px] font-medium">{HEADER_LABELS[v]}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Поведение:</span>
              {(['solid', 'transparent'] as const).map((b) => (
                <Button key={b} size="sm" variant={(doc.headerBehavior || 'solid') === b ? 'default' : 'outline'} className="h-7 flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, headerBehavior: b }))}>
                  {b === 'solid' ? 'Сплошная' : 'Прозрачная'}
                </Button>
              ))}
            </div>
            <p className="mb-2 mt-3 text-sm font-semibold">Подвал (footer)</p>
            <div className="grid grid-cols-2 gap-2">
              {(['simple', 'columns', 'centered', 'newsletter'] as const).map((v) => (
                <div key={v} role="button" tabIndex={0} onClick={() => setDoc((d) => ({ ...d, footerVariant: v }))} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDoc((d) => ({ ...d, footerVariant: v })); }} className={`cursor-pointer overflow-hidden rounded-lg border p-1 text-left transition-colors ${(doc.footerVariant || 'simple') === v ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}>
                  <ChromeThumb doc={doc} kind="footer" variant={v} />
                  <span className="mt-1 block text-[11px] font-medium">{FOOTER_LABELS[v]}</span>
                </div>
              ))}
            </div>
            <p className="mb-1 mt-3 text-sm font-semibold">Боковая панель (aside)</p>
            <div className="flex gap-1.5">
              {(['none', 'left', 'right'] as const).map((v) => (
                <Button key={v} size="sm" variant={(doc.asideVariant || 'none') === v ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, asideVariant: v }))}>
                  {v === 'none' ? 'Нет' : v === 'left' ? 'Слева' : 'Справа'}
                </Button>
              ))}
            </div>
            {(doc.asideVariant && doc.asideVariant !== 'none') && (
              <div className="mt-1.5 flex gap-1.5">
                {(['default', 'compact', 'icons'] as const).map((v) => (
                  <Button key={v} size="sm" variant={(doc.asideStyle || 'default') === v ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, asideStyle: v }))}>
                    {v === 'default' ? 'Обычный' : v === 'compact' ? 'Компакт' : 'Иконки'}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          {/* Navigation editor */}
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Меню (шапка)</p>
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={addNavLink}><Plus className="h-3.5 w-3.5" /> Пункт</Button>
            </div>
            <div className="space-y-1.5">
              {doc.nav.map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input value={l.label} onChange={(e) => setNavLink(i, 'label', e.target.value)} placeholder="Текст" className="h-8" />
                  <Input value={l.href} onChange={(e) => setNavLink(i, 'href', e.target.value)} placeholder="/site/..." className="h-8" />
                  <button onClick={() => removeNavLink(i)} className="shrink-0 text-muted-foreground hover:text-red-500" aria-label="Удалить"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border/60 pt-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Текст футера</label>
              <Input value={doc.footer.text} onChange={(e) => setDoc((d) => ({ ...d, footer: { ...d.footer, text: e.target.value } }))} className="h-8" />
            </div>
          </Card>
          </div>{/* end Сайт */}
        </aside>

        {/* Resizable splitter */}
        <div
          onMouseDown={startResize}
          className={`w-1.5 shrink-0 cursor-col-resize bg-border/60 transition-colors hover:bg-primary/60 ${fullscreen ? 'hidden' : ''}`}
          title="Потяните, чтобы изменить ширину"
        />

        {/* Live preview canvas */}
        <div
          className={fullscreen ? 'fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col bg-muted/20' : 'flex shrink-0 flex-col border-l border-border/60 bg-muted/20'}
          style={fullscreen ? undefined : { width: previewWidth }}
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <ChevronRight className="h-4 w-4 text-primary" />
            <span className="truncate">{previewSrc}</span>
            <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">в реальном времени</span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setPreviewDark((v) => !v)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" title="Светлая / тёмная тема предпросмотра">
                {previewDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {previewDark ? 'Светлая' : 'Тёмная'}
              </button>
              <button onClick={() => setPreviewKey((k) => k + 1)} className="rounded-md px-2 py-1 hover:bg-muted">Перезагрузить</button>
              <button onClick={() => setFullscreen((f) => !f)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" title="Полноэкранный предпросмотр">
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {fullscreen ? 'Свернуть' : 'На весь экран'}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="mx-auto h-full transition-[width] duration-300" style={{ width: fullscreen ? DEVICE[device] : (device === 'full' ? '100%' : DEVICE[device]) }}>
              <iframe
                ref={previewRef}
                key={previewKey}
                src="/builder-preview"
                title="Предпросмотр"
                onLoad={postPreview}
                className="h-full w-full rounded-xl border border-border bg-background shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Real, theme-scoped mini-preview of a header/footer variant.
const HEADER_LABELS: Record<string, string> = { minimal: 'Минимал', centered: 'По центру', split: 'Сплит', cta: 'С кнопкой' };
const FOOTER_LABELS: Record<string, string> = { simple: 'Простой', columns: 'Колонки', centered: 'По центру', newsletter: 'С подпиской' };
function ChromeThumb({ doc, kind, variant }: { doc: BuilderDoc; kind: 'header' | 'footer'; variant: string }) {
  const theme = getTheme(doc.themeId ?? 'modern-clean');
  const cls = `cthumb-${kind}-${variant}`;
  const css = useMemo(() => themeCss(theme).split(':root').join(`.${cls}`).split('.dark').join(`.${cls}`), [theme, cls]);
  const previewDoc = { ...doc, headerVariant: variant, headerBehavior: 'solid', footerVariant: variant } as BuilderDoc;
  const h = kind === 'header' ? 46 : 84;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.33);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1000);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-md border border-border/60" style={{ height: h }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className={`${cls} pointer-events-none absolute left-0 top-0 origin-top-left`} style={{ width: 1000, transform: `scale(${scale})`, background: 'var(--background)', color: 'var(--foreground)' }}>
        <RevealDisabled.Provider value={true}>
          {kind === 'header' ? <ChromeHeader doc={previewDoc} /> : <ChromeFooter doc={previewDoc} />}
        </RevealDisabled.Provider>
      </div>
    </div>
  );
}

// Real, theme-scoped mini-preview of a landing (scaled-down actual render).
function LandingThumb({ def }: { def: { id: string; themeId?: string; build: () => { blocks: BuilderNode[] } } }) {
  const theme = getTheme(def.themeId ?? 'modern-clean');
  const blocks = useMemo(() => def.build().blocks, [def]);
  const cls = `thumb-${def.id}`;
  const css = useMemo(() => themeCss(theme).split(':root').join(`.${cls}`).split('.dark').join(`.${cls}`), [theme, cls]);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);
  return (
    <div ref={ref} className="relative h-40 w-full overflow-hidden border-b border-border bg-background">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {mounted && (
      <div
        className={`${cls} pointer-events-none absolute left-0 top-0 origin-top-left`}
        style={{ width: 1280, transform: `scale(${scale})`, background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <RevealDisabled.Provider value={true}>
          {blocks.map((n) => (
            <RenderNode key={n.id} node={n} />
          ))}
        </RevealDisabled.Provider>
      </div>
      )}
    </div>
  );
}

// Recursive tree view
function Tree({
  nodes, depth, selectedId, onSelect, onMove, onDelete, onDuplicate, onDragStartId, onDropRow,
  collapsed, onToggle, dropHint, setDropHint,
}: {
  nodes: BuilderNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStartId: (id: string) => void;
  onDropRow: (id: string, pos: 'before' | 'after') => void;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  dropHint: { id: string; pos: 'before' | 'after' } | null;
  setDropHint: (h: { id: string; pos: 'before' | 'after' } | null) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((n, i) => {
        const hasKids = !!n.children && n.children.length > 0;
        const isCollapsed = collapsed.has(n.id);
        const container = isContainer(n.type);
        const hint = dropHint?.id === n.id ? dropHint.pos : null;
        return (
          <div key={n.id}>
            {hint === 'before' && <div className="my-0.5 h-0.5 rounded bg-primary" style={{ marginLeft: depth * 12 + 6 }} />}
            <div
              draggable
              onDragStart={(e) => { e.stopPropagation(); onDragStartId(n.id); }}
              onDragOver={(e) => {
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setDropHint({ id: n.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' });
              }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropRow(n.id, dropHint?.id === n.id ? dropHint.pos : 'after'); }}
              className={`flex items-center gap-0.5 rounded-md py-1 pr-1 text-sm ${selectedId === n.id ? 'bg-primary/15' : 'hover:bg-muted'}`}
              style={{ paddingLeft: depth * 12 + 2 }}
            >
              {container && hasKids ? (
                <button onClick={() => onToggle(n.id)} className="text-muted-foreground hover:text-foreground" aria-label={isCollapsed ? 'Развернуть' : 'Свернуть'}>
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-3.5" />
              )}
              <span className="cursor-grab text-muted-foreground/50 active:cursor-grabbing" aria-hidden>⋮⋮</span>
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => onSelect(n.id)}>
                {NODE_LABELS[n.type]}
                {n.props.text ? <span className="text-muted-foreground"> — {n.props.text.slice(0, 16)}</span> : null}
              </button>
              <button onClick={() => onMove(n.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Вверх"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => onMove(n.id, 1)} disabled={i === nodes.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Вниз"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDuplicate(n.id)} className="text-muted-foreground hover:text-foreground" aria-label="Дублировать"><Copy className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDelete(n.id)} className="text-muted-foreground hover:text-red-500" aria-label="Удалить"><X className="h-3.5 w-3.5" /></button>
            </div>
            {hint === 'after' && <div className="my-0.5 h-0.5 rounded bg-primary" style={{ marginLeft: depth * 12 + 6 }} />}
            {hasKids && !isCollapsed && (
              <Tree nodes={n.children!} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onDragStartId={onDragStartId} onDropRow={onDropRow} collapsed={collapsed} onToggle={onToggle} dropHint={dropHint} setDropHint={setDropHint} />
            )}
          </div>
        );
      })}
    </div>
  );
}
