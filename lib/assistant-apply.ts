import 'server-only';
import { chatComplete } from '@/lib/llm';
import { THEMES, pickTheme, getTheme } from '@/lib/themes';

export type ApplyAction =
  | { kind: 'theme'; themeId: string; label: string }
  | { kind: 'regenerate' }
  | { kind: 'chat'; message: string };

const IDS = THEMES.map((t) => t.id);

// Deterministic fallback when no LLM is configured: keyword-match a theme, or a
// verb hint for regeneration, else a gentle chat nudge.
function fallbackAction(instruction: string, locale: string): ApplyAction {
  const s = instruction.toLowerCase();
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

export async function classifyInstruction(instruction: string, locale: string): Promise<ApplyAction> {
  const catalog = THEMES.map((t) => `- ${t.id}: ${t.label}`).join('\n');
  const system =
    'You are an in-builder website assistant. Map the user instruction to ONE action and reply with ONLY compact JSON, no prose.\n' +
    'Actions:\n' +
    '1) {"kind":"theme","themeId":"<one id from the list>"} — when they want a different visual style/theme/colors/mood.\n' +
    '2) {"kind":"regenerate"} — when they want to rewrite/replace the current page content or layout.\n' +
    '3) {"kind":"chat","message":"<short helpful reply in the user\'s language>"} — anything else.\n' +
    `Theme ids:\n${catalog}`;
  const raw = await chatComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: instruction },
    ],
    { temperature: 0, maxTokens: 120 },
  );
  if (!raw) return fallbackAction(instruction, locale);
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return fallbackAction(instruction, locale);
    const obj = JSON.parse(m[0]) as { kind?: string; themeId?: string; message?: string };
    if (obj.kind === 'theme') {
      const id = IDS.find((x) => (obj.themeId || '').toLowerCase().includes(x)) ?? pickTheme(instruction).id;
      const t = getTheme(id);
      return { kind: 'theme', themeId: t.id, label: t.label };
    }
    if (obj.kind === 'regenerate') return { kind: 'regenerate' };
    if (obj.kind === 'chat' && obj.message) return { kind: 'chat', message: String(obj.message).slice(0, 600) };
  } catch {
    /* fall through */
  }
  return fallbackAction(instruction, locale);
}
