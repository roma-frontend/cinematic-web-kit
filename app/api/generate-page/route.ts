import { NextResponse } from 'next/server';
import { makeNode, newId, type BuilderNode, type NodeType } from '@/lib/builder/types';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

const ALLOWED: NodeType[] = [
  'section', 'stack', 'row', 'grid', 'card', 'heading', 'text', 'list', 'button', 'image',
  'video', 'input', 'textarea', 'form', 'pricing', 'testimonial', 'socials', 'faq', 'tabs', 'divider', 'spacer',
];

// Assigns fresh ids and drops unknown node types coming from an LLM.
function sanitize(node: unknown): BuilderNode | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as Record<string, unknown>;
  const type = n.type as NodeType;
  if (!ALLOWED.includes(type)) return null;
  const props: Record<string, string> = {};
  if (n.props && typeof n.props === 'object') {
    for (const [k, v] of Object.entries(n.props as Record<string, unknown>)) props[k] = String(v);
  }
  const out: BuilderNode = { id: newId(type), type, props };
  if (Array.isArray(n.children)) {
    out.children = n.children.map(sanitize).filter((x): x is BuilderNode => x !== null);
  }
  return out;
}

// Deterministic, no-API landing page from a brief.
function fallbackBlocks(brief: string): BuilderNode[] {
  const title = brief.trim().slice(0, 70) || 'Ваш новый продукт';
  const mk = (type: NodeType, props: Record<string, string>, children?: BuilderNode[]): BuilderNode => {
    const node = makeNode(type);
    node.props = { ...node.props, ...props };
    if (children) node.children = children;
    return node;
  };

  const hero = mk('section', { padding: 'lg', bg: 'primary', width: 'normal' }, [
    mk('stack', { gap: 'md', align: 'center' }, [
      mk('heading', { text: title, level: '1', align: 'center' }),
      mk('text', { text: `Решение для «${brief.trim() || 'вашей задачи'}». Быстро, современно и с полным адаптивом.`, align: 'center', muted: 'false', size: 'lg' }),
      mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
        mk('button', { text: 'Начать', href: '/site/contact', variant: 'default', size: 'lg', align: 'center' }),
        mk('button', { text: 'Подробнее', href: '#features', variant: 'outline', size: 'lg', align: 'center' }),
      ]),
    ]),
  ]);

  const features = mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
    mk('heading', { text: 'Возможности', level: '2', align: 'center' }),
    mk('spacer', { height: 'md' }),
    mk('grid', { gap: 'md', columns: '3' }, [
      ['Быстро', 'Запуск за считанные минуты без кода.'],
      ['Гибко', 'Собирайте страницы из блоков и секций.'],
      ['Адаптивно', 'Идеально выглядит на любом устройстве.'],
    ].map(([h, t]) =>
      mk('card', { padding: 'md', bg: 'card', border: 'true', gap: 'sm' }, [
        mk('heading', { text: h, level: '3', align: 'left' }),
        mk('text', { text: t, align: 'left', muted: 'true' }),
      ]),
    )),
  ]);

  const faq = mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
    mk('heading', { text: 'Частые вопросы', level: '2', align: 'left' }),
    mk('spacer', { height: 'sm' }),
    mk('faq', { items: 'Сколько это стоит?::Есть бесплатный тариф и платные планы.\nНужен ли код?::Нет, всё собирается визуально.', align: 'left' }),
  ]);

  const cta = mk('section', { padding: 'lg', bg: 'card', width: 'narrow' }, [
    mk('heading', { text: 'Готовы начать?', level: '2', align: 'center' }),
    mk('text', { text: 'Оставьте заявку — мы свяжемся с вами.', align: 'center', muted: 'true' }),
    mk('spacer', { height: 'sm' }),
    mk('form', { formId: 'lead', submitText: 'Отправить', successMsg: 'Спасибо! Скоро свяжемся.' }, [
      mk('input', { name: 'name', label: 'Имя', placeholder: 'Ваше имя', type: 'text' }),
      mk('input', { name: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' }),
    ]),
  ]);

  return [hero, features, faq, cta];
}

async function llmBlocks(brief: string): Promise<BuilderNode[] | null> {
  const url = process.env.THEME_LLM_URL;
  const key = process.env.THEME_LLM_KEY;
  const model = process.env.THEME_LLM_MODEL || 'gpt-4o-mini';
  if (!url || !key) return null;
  const sys = `You output ONLY a JSON array of website builder nodes. Allowed types: ${ALLOWED.join(', ')}. Each node: {"type": string, "props": object of string values, "children"?: array}. Containers: section, stack, row, grid, card, form. Build a complete, responsive Russian-language landing page.`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Бриф: ${brief}` },
        ],
        temperature: 0.6,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return null;
    const blocks = arr.map(sanitize).filter((x): x is BuilderNode => x !== null);
    return blocks.length ? blocks : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // May call the configured LLM on the server's key — signed-in users only.
  const user = await requireUser();
  if (!user) return unauthorized();
  const t = apiErrors(await getLocale());
  if (!rateLimit(`generate-page:${user.id}`, 10)) {
    return NextResponse.json({ error: t.tooManyGenerations }, { status: 429 });
  }
  let brief = '';
  let title = 'Новая страница';
  let path = '';
  try {
    const body = await request.json();
    brief = String(body?.brief ?? '');
    if (body?.title) title = String(body.title);
    if (typeof body?.path === 'string') path = body.path.replace(/^\/+|\/+$/g, '');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!brief.trim()) return NextResponse.json({ error: t.emptyBrief }, { status: 400 });

  const viaLlm = await llmBlocks(brief);
  const blocks = viaLlm ?? fallbackBlocks(brief);
  return NextResponse.json({
    ok: true,
    source: viaLlm ? 'llm' : 'fallback',
    page: { id: newId('page'), path, title, blocks },
  });
}
