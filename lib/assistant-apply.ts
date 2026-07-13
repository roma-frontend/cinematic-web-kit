import 'server-only';
import { chatComplete } from '@/lib/llm';
import { THEMES, pickTheme, getTheme } from '@/lib/themes';

export type ApplyAction =
  | { kind: 'theme'; themeId: string; label: string }
  | { kind: 'regenerate' }
  | { kind: 'patch'; changes: Record<string, string>; summary: string }
  | { kind: 'chat'; message: string };

export interface SelectedBlockContext {
  type: string;
  props: Record<string, string>;
}

const IDS = THEMES.map((t) => t.id);

// These fields can execute styles, redirect users, or send data outside the
// platform. They remain editable manually, but never through an AI patch.
const AI_FORBIDDEN_PROP_KEYS = new Set([
  'customCss', 'customCssFull', 'hvCss', 'cssBgImage', 'bgImage', 'bgVideo',
  'src', 'srcDark', 'href', 'webhook', 'redirect', 'notifyEmail',
]);

/** Remove fields that must never be exposed to or changed by the AI editor. */
export function safeSelectedBlockContext(selected?: SelectedBlockContext): SelectedBlockContext | undefined {
  if (!selected) return undefined;
  return {
    type: selected.type.slice(0, 80),
    props: Object.fromEntries(
      Object.entries(selected.props)
        .filter(([key]) => !AI_FORBIDDEN_PROP_KEYS.has(key))
        .slice(0, 40)
        .map(([key, value]) => [key, value.slice(0, 1500)]),
    ),
  };
}

// Deterministic fallback when no LLM is configured: keyword-match a theme, or a
// verb hint for regeneration, else a gentle chat nudge.
function fallbackAction(instruction: string, locale: string, selected?: SelectedBlockContext): ApplyAction {
  const s = instruction.toLowerCase();
  if (selected?.props.text && /(короче|сократи|shorter|shorten)/.test(s)) {
    const words = selected.props.text.trim().split(/\s+/);
    const text = words.slice(0, Math.max(3, Math.ceil(words.length / 2))).join(' ');
    if (text && text !== selected.props.text) return { kind: 'patch', changes: { text }, summary: 'Сокращу текст выбранного блока' };
  }
  if (selected && /(по центру|выровняй.*центр|align.*center|center.*align)/.test(s)) {
    if ('align' in selected.props && selected.props.align !== 'center') {
      return { kind: 'patch', changes: { align: 'center' }, summary: 'Выровняю выбранный блок по центру' };
    }
    if ('cssTextAlign' in selected.props && selected.props.cssTextAlign !== 'center') {
      return { kind: 'patch', changes: { cssTextAlign: 'center' }, summary: 'Выровняю текст выбранного блока по центру' };
    }
  }
  if (selected?.type === 'button' && selected.props.text && /(усиль.*cta|усиль.*призыв|сделай.*cta|stronger.*cta|cta.*stronger)/.test(s)) {
    const text = selected.props.text.trim();
    const localized = locale === 'en'
      ? { replacement: 'Get started', suffix: ' now', summary: 'Make the call to action more prominent' }
      : locale === 'hy'
        ? { replacement: 'Սկսել հիմա', suffix: ' հիմա', summary: 'Կուժեղացնեմ գործողության կոչը' }
        : { replacement: 'Начать сейчас', suffix: ' сейчас', summary: 'Сделаю призыв к действию более заметным' };
    const improved = /^(узнать|подробнее|learn more)$/i.test(text) ? localized.replacement : `${text.replace(/[.!…]+$/, '')}${localized.suffix}`;
    if (improved !== text) return { kind: 'patch', changes: { text: improved }, summary: localized.summary };
  }
  const wantsTheme = /(тема|стиль|цвет|theme|style|color|palette|неон|neon|люкс|luxur|тёмн|dark|светл|light)/.test(s);
  if (wantsTheme) {
    const t = pickTheme(instruction);
    return { kind: 'theme', themeId: t.id, label: t.label };
  }
  const wantsRewrite = /(перепиш|сгенерир|замен|обнов|rewrite|regenerate|redo|generate|content|текст|страниц|page)/.test(s);
  if (wantsRewrite) return { kind: 'regenerate' };
  const msg = locale === 'ru'
    ? 'Я могу сменить тему сайта или перегенерировать текущую страницу по вашему описанию. Например: «сделай неоновый ночной стиль» или «перепиши страницу под барбершоп».'
    : locale === 'hy'
      ? 'Կարող եմ փոխել կայքի թեման կամ վերագեներացնել ընթացիկ էջը ձեր նկարագրությամբ։'
      : 'I can change the site theme or regenerate the current page from your description. E.g. “make it a neon night style” or “rewrite the page for a barbershop”.';
  return { kind: 'chat', message: msg };
}

export async function classifyInstruction(instruction: string, locale: string, selected?: SelectedBlockContext): Promise<ApplyAction> {
  selected = safeSelectedBlockContext(selected);
  const catalog = THEMES.map((t) => `- ${t.id}: ${t.label}`).join('\n');
  const selectedContext = selected
    ? `4) {"kind":"patch","changes":{"prop":"value"},"summary":"<short summary>"} — when the user asks to edit the selected ${selected.type} block. You may change ONLY keys already present in SELECTED BLOCK PROPS. Never add URLs, scripts, custom CSS, or new keys.\nSELECTED BLOCK PROPS: ${JSON.stringify(selected.props)}\n`
    : '';
  const system =
    'You are an in-builder website assistant. Map the user instruction to ONE action and reply with ONLY compact JSON, no prose.\n' +
    'Actions:\n' +
    '1) {"kind":"theme","themeId":"<one id from the list>"} — when they want a different visual style/theme/colors/mood.\n' +
    '2) {"kind":"regenerate"} — when they want to rewrite/replace the current page content or layout.\n' +
    '3) {"kind":"chat","message":"<short helpful reply in the user\'s language>"} — anything else.\n' +
    selectedContext +
    `Theme ids:\n${catalog}`;
  const raw = await chatComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: instruction },
    ],
    { temperature: 0, maxTokens: 120 },
  );
  if (!raw) return fallbackAction(instruction, locale, selected);
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return fallbackAction(instruction, locale, selected);
    const obj = JSON.parse(m[0]) as { kind?: string; themeId?: string; message?: string; changes?: Record<string, unknown>; summary?: string };
    if (obj.kind === 'theme') {
      const id = IDS.find((x) => (obj.themeId || '').toLowerCase().includes(x)) ?? pickTheme(instruction).id;
      const t = getTheme(id);
      return { kind: 'theme', themeId: t.id, label: t.label };
    }
    if (obj.kind === 'regenerate') return { kind: 'regenerate' };
    if (obj.kind === 'patch' && selected && obj.changes && typeof obj.changes === 'object') {
      const allowed = new Set(Object.keys(selected.props));
      const changes = Object.fromEntries(
        Object.entries(obj.changes as Record<string, unknown>)
          .filter(([key, value]) => allowed.has(key) && !AI_FORBIDDEN_PROP_KEYS.has(key) && typeof value === 'string' && String(value).slice(0, 4000) !== (selected.props[key] ?? ''))
          .map(([key, value]) => [key, String(value).slice(0, 4000)]),
      );
      if (Object.keys(changes).length) {
        return { kind: 'patch', changes, summary: typeof obj.summary === 'string' ? obj.summary.slice(0, 240) : 'Изменение выбранного блока' };
      }
    }
    if (obj.kind === 'chat' && obj.message) return { kind: 'chat', message: String(obj.message).slice(0, 600) };
  } catch {
    /* fall through */
  }
  return fallbackAction(instruction, locale, selected);
}
