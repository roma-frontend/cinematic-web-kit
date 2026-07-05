'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowUp, ArrowDown, X, Plus, Save, Loader2, Check, Monitor, Tablet, Smartphone,
  ExternalLink, Trash2, FileText, LayoutTemplate, ChevronRight, Copy, Upload, Wand2, Palette,
  Undo2, Redo2, LayoutGrid,
} from 'lucide-react';
import seed from '@/data/builder.json';
import { THEMES } from '@/lib/themes';
import { TEMPLATES } from '@/lib/builder/templates';
import {
  type BuilderDoc, type BuilderNode, type NodeType, type BuilderPage,
  NODE_LABELS, isContainer, makeNode, newId,
} from '@/lib/builder/types';
import { updateProps, removeNode, insertChild, moveNode, findNode, duplicateNode, moveRelative, insertAfter } from '@/lib/builder/tree';

type Field = { k: string; label: string; kind?: 'text' | 'textarea'; opts?: string[] };

const FIELDS: Record<NodeType, Field[]> = {
  section: [
    { k: 'padding', label: 'Отступы', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'bg', label: 'Фон', opts: ['none', 'muted', 'card', 'primary'] },
    { k: 'width', label: 'Ширина', opts: ['narrow', 'normal', 'wide'] },
  ],
  stack: [
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'Выравнивание', opts: ['start', 'center', 'end', 'stretch'] },
  ],
  row: [
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'По верт.', opts: ['start', 'center', 'end'] },
    { k: 'justify', label: 'По гориз.', opts: ['start', 'center', 'end', 'between'] },
    { k: 'wrap', label: 'Перенос', opts: ['wrap', 'nowrap'] },
  ],
  grid: [
    { k: 'columns', label: 'Колонок', opts: ['1', '2', '3', '4'] },
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
  ],
  card: [
    { k: 'padding', label: 'Внутр. отступ', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'bg', label: 'Фон', opts: ['none', 'muted', 'card'] },
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'border', label: 'Рамка', opts: ['true', 'false'] },
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
    { k: 'ordered', label: 'Нумерованный', opts: ['false', 'true'] },
    { k: 'marker', label: 'Маркеры', opts: ['true', 'false'] },
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
    { k: 'type', label: 'Тип', opts: ['text', 'email', 'tel', 'number'] },
  ],
  textarea: [
    { k: 'name', label: 'Имя поля' },
    { k: 'label', label: 'Метка' },
    { k: 'placeholder', label: 'Подсказка' },
  ],
  form: [
    { k: 'formId', label: 'ID формы' },
    { k: 'submitText', label: 'Текст кнопки' },
    { k: 'successMsg', label: 'Сообщение об успехе' },
  ],
  pricing: [
    { k: 'plan', label: 'Название плана' },
    { k: 'price', label: 'Цена' },
    { k: 'period', label: 'Период (напр. /мес)' },
    { k: 'features', label: 'Фичи (по строкам)', kind: 'textarea' },
    { k: 'cta', label: 'Текст кнопки' },
    { k: 'href', label: 'Ссылка кнопки' },
    { k: 'featured', label: 'Выделить', opts: ['false', 'true'] },
  ],
  testimonial: [
    { k: 'quote', label: 'Цитата', kind: 'textarea' },
    { k: 'author', label: 'Автор' },
    { k: 'role', label: 'Должность / компания' },
  ],
  socials: [
    { k: 'links', label: 'Ссылки «Текст|URL» (по строкам)', kind: 'textarea' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  faq: [
    { k: 'items', label: 'Вопрос::Ответ (по строкам)', kind: 'textarea' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center'] },
  ],
  tabs: [{ k: 'items', label: 'Вкладка::Содержимое (по строкам)', kind: 'textarea' }],
  divider: [],
  spacer: [{ k: 'height', label: 'Высота', opts: ['sm', 'md', 'lg'] }],
};

const PALETTE: NodeType[] = ['section', 'stack', 'row', 'grid', 'card', 'heading', 'text', 'list', 'button', 'image', 'video', 'input', 'textarea', 'form', 'pricing', 'testimonial', 'socials', 'faq', 'tabs', 'divider', 'spacer'];
const DEVICE = { full: '100%', tablet: '768px', mobile: '390px' } as const;

export default function BuilderEditor() {
  const [doc, setDoc] = useState<BuilderDoc>(seed as unknown as BuilderDoc);
  const [pageId, setPageId] = useState<string>((seed as unknown as BuilderDoc).pages[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<keyof typeof DEVICE>('full');
  const [tab, setTab] = useState<'pages' | 'blocks' | 'design'>('pages');
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPath, setNewPath] = useState('');

  // Load current server state on mount.
  useEffect(() => {
    fetch('/api/builder')
      .then((r) => r.json())
      .then((d: BuilderDoc) => {
        if (d?.pages?.length) {
          setDoc(d);
          setPageId(d.pages[0].id);
        }
      })
      .catch(() => {});
  }, []);

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
    }
  }, [doc]);
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(doc);
    skipHistory.current = true;
    setDoc(p);
    setHistTick((t) => t + 1);
  };
  const redo = () => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(doc);
    skipHistory.current = true;
    setDoc(n);
    setHistTick((t) => t + 1);
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

  const page: BuilderPage | undefined = useMemo(
    () => doc.pages.find((p) => p.id === pageId) ?? doc.pages[0],
    [doc, pageId],
  );
  const selected = useMemo(
    () => (selectedId && page ? findNode(page.blocks, selectedId) : null),
    [selectedId, page],
  );

  const setBlocks = (next: BuilderNode[]) =>
    setDoc((d) => ({ ...d, pages: d.pages.map((p) => (p.id === page?.id ? { ...p, blocks: next } : p)) }));

  const addNode = (type: NodeType) => {
    if (!page) return;
    const node = makeNode(type);
    if (selected && isContainer(selected.type)) setBlocks(insertChild(page.blocks, selected.id, node));
    else setBlocks([...page.blocks, node]);
    setSelectedId(node.id);
  };

  const patch = (id: string, p: Record<string, string>) => page && setBlocks(updateProps(page.blocks, id, p));

  const duplicate = (id: string) => {
    if (!page) return;
    const { nodes, newId: nid } = duplicateNode(page.blocks, id);
    setBlocks(nodes);
    if (nid) setSelectedId(nid);
  };

  // Drag-and-drop within the structure tree — handles both moving existing
  // nodes and dropping a NEW element dragged from the palette.
  const dragId = useRef<string | null>(null);
  const paletteDrag = useRef<NodeType | null>(null);
  const onTreeDrop = (targetId: string) => {
    const pType = paletteDrag.current;
    const from = dragId.current;
    paletteDrag.current = null;
    dragId.current = null;
    if (!page) return;
    if (pType) {
      const target = findNode(page.blocks, targetId);
      const node = makeNode(pType);
      // Drop INTO the target if it's a container, else place right after it.
      if (target && isContainer(target.type)) setBlocks(insertChild(page.blocks, targetId, node));
      else setBlocks(insertAfter(page.blocks, targetId, node));
      setSelectedId(node.id);
      return;
    }
    if (from) setBlocks(moveRelative(page.blocks, from, targetId));
  };
  // Drop a palette element onto the empty page area (append to root).
  const onRootDrop = () => {
    const pType = paletteDrag.current;
    paletteDrag.current = null;
    dragId.current = null;
    if (!page || !pType) return;
    const node = makeNode(pType);
    setBlocks([...page.blocks, node]);
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

  // Adds a page, ensuring its path is unique; selects it.
  const addPageDoc = (np: BuilderPage): void => {
    let base = np.path ?? '';
    if (base === '' && doc.pages.some((p) => p.path === '')) base = 'home';
    let path = base;
    let i = 2;
    while (doc.pages.some((p) => p.path === path)) path = `${base || 'page'}-${i++}`;
    const created: BuilderPage = { ...np, id: newId('page'), path };
    setDoc((d) => ({ ...d, pages: [...d.pages, created] }));
    setPageId(created.id);
    setSelectedId(null);
  };
  const addTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    addPageDoc(t.build());
    setMsg(`Добавлена страница «${t.label}». Не забудьте «Сохранить».`);
  };

  // ---- nav / footer / brand ----
  const setNavLink = (i: number, key: 'label' | 'href', val: string) =>
    setDoc((d) => ({ ...d, nav: d.nav.map((l, j) => (j === i ? { ...l, [key]: val } : l)) }));
  const addNavLink = () => setDoc((d) => ({ ...d, nav: [...d.nav, { label: 'Пункт', href: '/site' }] }));
  const removeNavLink = (i: number) => setDoc((d) => ({ ...d, nav: d.nav.filter((_, j) => j !== i) }));

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Сохранено · страниц: ${data.pages}`);
        setPreviewKey((k) => k + 1);
      } else setMsg(data.error || 'Ошибка');
    } catch {
      setMsg('Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  };

  const previewSrc = `/site${page?.path ? `/${page.path}` : ''}`;

  return (
    <main className="min-h-dvh bg-background">
      {/* Toolbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[120rem] items-center gap-3 px-4">
          <Link href="/studio" className="flex items-center gap-2 font-bold tracking-tight">
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
          <Button size="sm" onClick={save} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Сохранить
          </Button>
        </div>
        {msg && <div className="border-t border-border/60 bg-muted/40 px-4 py-1 text-center text-xs text-muted-foreground">{msg}</div>}
      </header>

      <div className="mx-auto grid max-w-[120rem] gap-4 p-4 xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          {/* Tabs */}
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
            {([['pages', 'Страницы'], ['blocks', 'Блоки'], ['design', 'Сайт']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>
            ))}
          </div>

          {/* TAB: Страницы */}
          <div className={tab === 'pages' ? 'space-y-4' : 'hidden'}>
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
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><LayoutGrid className="h-4 w-4 text-primary" /> Готовые страницы</p>
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
                <div key={p.id} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${p.id === page?.id ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'}`}>
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => { setPageId(p.id); setSelectedId(null); }}>
                    {p.title} <span className="text-xs text-muted-foreground">/{p.path}</span>
                  </button>
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
          <div className={tab === 'blocks' ? 'space-y-4' : 'hidden'}>
          {/* Palette */}
          <Card className="p-3">
            <p className="mb-1 text-sm font-semibold">Добавить элемент</p>
            <p className="mb-2 text-xs text-muted-foreground">{selected && isContainer(selected.type) ? `Клик — внутрь: ${NODE_LABELS[selected.type]}` : 'Клик — в конец страницы'} · или перетащите на блок</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE.map((t) => (
                <Button key={t} size="sm" variant="outline" draggable onDragStart={() => { paletteDrag.current = t; }} className="cursor-grab justify-start gap-1 text-xs active:cursor-grabbing" onClick={() => addNode(t)}>
                  <Plus className="h-3.5 w-3.5" /> {NODE_LABELS[t]}
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
                onMove={(id, dir) => setBlocks(moveNode(page.blocks, id, dir))}
                onDuplicate={duplicate}
                onDragStartId={(id) => { dragId.current = id; }}
                onDrop={onTreeDrop}
                onDelete={(id) => { setBlocks(removeNode(page.blocks, id)); if (selectedId === id) setSelectedId(null); }} />
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Пусто — добавьте элемент из палитры.</p>
            )}
          </Card>

          {/* Properties */}
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">Свойства</p>
            {selected ? (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">{NODE_LABELS[selected.type]}</p>
                {FIELDS[selected.type].length === 0 && <p className="text-xs text-muted-foreground">Нет настроек.</p>}
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
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Выберите элемент в структуре, чтобы редактировать.</p>
            )}
          </Card>
          </div>{/* end Блоки */}

          {/* TAB: Сайт */}
          <div className={tab === 'design' ? 'space-y-4' : 'hidden'}>
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
        </div>

        {/* Column 3 — live preview */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ChevronRight className="h-4 w-4 text-primary" /> Предпросмотр <span className="text-xs font-normal text-muted-foreground">{previewSrc}</span>
            <button onClick={() => setPreviewKey((k) => k + 1)} className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground">Обновить</button>
          </div>
          <Card className="overflow-hidden bg-muted/30 p-0">
            <div className="mx-auto transition-all" style={{ width: DEVICE[device] }}>
              <iframe key={previewKey} src={previewSrc} title="Предпросмотр" className="h-[80vh] w-full border-0 bg-background" />
            </div>
          </Card>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" /> Изменения появятся после «Сохранить».</p>
        </div>
      </div>
    </main>
  );
}

// Recursive tree view
function Tree({
  nodes, depth, selectedId, onSelect, onMove, onDelete, onDuplicate, onDragStartId, onDrop,
}: {
  nodes: BuilderNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStartId: (id: string) => void;
  onDrop: (targetId: string) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((n, i) => (
        <div key={n.id}>
          <div
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStartId(n.id); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(n.id); }}
            className={`flex items-center gap-0.5 rounded-md py-1 pr-1 text-sm ${selectedId === n.id ? 'bg-primary/15' : 'hover:bg-muted'}`}
            style={{ paddingLeft: depth * 12 + 6 }}
          >
            <span className="cursor-grab text-muted-foreground/50 active:cursor-grabbing" aria-hidden>⋮⋮</span>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => onSelect(n.id)}>
              <span className="text-muted-foreground">{isContainer(n.type) ? '▸ ' : '• '}</span>
              {NODE_LABELS[n.type]}
              {n.props.text ? <span className="text-muted-foreground"> — {n.props.text.slice(0, 18)}</span> : null}
            </button>
            <button onClick={() => onMove(n.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Вверх"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => onMove(n.id, 1)} disabled={i === nodes.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Вниз"><ArrowDown className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDuplicate(n.id)} className="text-muted-foreground hover:text-foreground" aria-label="Дублировать"><Copy className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDelete(n.id)} className="text-muted-foreground hover:text-red-500" aria-label="Удалить"><X className="h-3.5 w-3.5" /></button>
          </div>
          {n.children && n.children.length > 0 && (
            <Tree nodes={n.children} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onDragStartId={onDragStartId} onDrop={onDrop} />
          )}
        </div>
      ))}
    </div>
  );
}
