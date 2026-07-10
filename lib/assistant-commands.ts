// Pure, framework-agnostic helpers for the Studio Assistant composer:
// slash-command registry/filtering and quick-action prompt templates. Kept free
// of React and 'server-only' so the client widget uses them and Vitest can unit
// test them directly. Role-gating reuses the same allow-lists as navigation.

import {
  assistantRoutesForRole,
  assistantDataForRole,
  type AssistantRole,
} from '@/lib/assistant-routes';
import type { Locale } from '@/lib/seo';

export type SlashKind = 'navigate' | 'data' | 'new' | 'clear';

export interface SlashCommand {
  id: string;
  kind: SlashKind;
  label: string;
  hint?: string;
  /** Route path (navigate) or data key (data); empty for new/clear. */
  value?: string;
  /** Extra text folded into fuzzy matching (route path, aliases…). */
  keywords?: string;
}

export interface CommandLabels {
  /** route path -> human label, e.g. '/dashboard/submissions' -> 'Заявки'. */
  routes: Record<string, string>;
  /** data key -> human label, e.g. 'my-sites' -> 'Мои сайты'. */
  data: Record<string, string>;
  newChat: string;
  clearChat: string;
  /** Localized verbs used in the command hint, e.g. 'Открыть' / 'Показать'. */
  openVerb: string;
  showVerb: string;
}

/**
 * Build the ordered slash-command list for a role: new/clear chat, then every
 * navigable route, then every fetchable data set. Labels come from the caller
 * (the i18n dict) so this stays pure and locale-agnostic.
 */
export function buildSlashCommands(role: AssistantRole, labels: CommandLabels): SlashCommand[] {
  const cmds: SlashCommand[] = [
    { id: 'new', kind: 'new', label: labels.newChat },
    { id: 'clear', kind: 'clear', label: labels.clearChat },
  ];
  for (const route of assistantRoutesForRole(role)) {
    const label = labels.routes[route] ?? route;
    cmds.push({
      id: `nav:${route}`,
      kind: 'navigate',
      label,
      hint: `${labels.openVerb} ${route}`,
      value: route,
      keywords: route,
    });
  }
  for (const key of assistantDataForRole(role)) {
    const label = labels.data[key] ?? key;
    cmds.push({
      id: `data:${key}`,
      kind: 'data',
      label,
      hint: `${labels.showVerb}: ${label}`,
      value: key,
      keywords: key,
    });
  }
  return cmds;
}

/**
 * Detect whether the composer is in slash-command mode. True only while the
 * whole input is a single '/token' (no spaces yet); returns the token after '/'
 * lower-cased for matching.
 */
export function parseSlashQuery(input: string): { active: boolean; query: string } {
  const m = /^\/(\S*)$/.exec(input);
  if (!m) return { active: false, query: '' };
  return { active: true, query: m[1].toLowerCase() };
}

/**
 * Fuzzy-filter commands: every whitespace-separated token of the query must
 * appear (substring) in the command's label/hint/keywords. Results with a label
 * that starts with the query come first; otherwise original order is preserved.
 */
export function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = commands
    .map((cmd, index) => {
      const hay = `${cmd.label} ${cmd.hint ?? ''} ${cmd.keywords ?? ''}`.toLowerCase();
      const ok = tokens.every((tk) => hay.includes(tk));
      if (!ok) return null;
      const starts = cmd.label.toLowerCase().startsWith(q) ? 0 : 1;
      return { cmd, index, starts };
    })
    .filter((x): x is { cmd: SlashCommand; index: number; starts: number } => x !== null)
    .sort((a, b) => a.starts - b.starts || a.index - b.index);
  return scored.map((s) => s.cmd);
}

export type QuickAction = 'shorter' | 'longer' | 'simplify' | 'translate' | 'continue';

export const QUICK_ACTIONS: QuickAction[] = ['shorter', 'longer', 'simplify', 'translate', 'continue'];

// Locale-specific follow-up prompts that operate on the assistant's previous
// answer. Deterministic so they can be unit-tested. `translate` targets the
// "other" major language (RU/HY -> English, EN -> Russian).
const PROMPTS: Record<Locale, Record<QuickAction, string>> = {
  ru: {
    shorter: 'Сократи предыдущий ответ — оставь только суть, без воды.',
    longer: 'Раскрой предыдущий ответ подробнее, добавь примеры и детали.',
    simplify: 'Объясни предыдущий ответ проще, простыми словами.',
    translate: 'Переведи предыдущий ответ на английский язык.',
    continue: 'Продолжи предыдущий ответ с того места, где остановился.',
  },
  en: {
    shorter: 'Make the previous answer shorter — keep only the essentials.',
    longer: 'Expand the previous answer with more detail and examples.',
    simplify: 'Explain the previous answer more simply, in plain language.',
    translate: 'Translate the previous answer into Russian.',
    continue: 'Continue the previous answer from where it stopped.',
  },
  hy: {
    shorter: 'Կրճատիր նախորդ պատասխանը՝ թողնելով միայն ամենակարևորը։',
    longer: 'Ընդլայնիր նախորդ պատասխանը՝ ավելի մանրամասն, օրինակներով։',
    simplify: 'Բացատրիր նախորդ պատասխանը ավելի պարզ, հասկանալի բառերով։',
    translate: 'Թարգմանիր նախորդ պատասխանը անգլերեն։',
    continue: 'Շարունակիր նախորդ պատասխանը այնտեղից, որտեղ կանգ առար։',
  },
};

export function quickActionPrompt(action: QuickAction, locale: Locale): string {
  return (PROMPTS[locale] ?? PROMPTS.en)[action];
}

/**
 * Push a sent message onto a bounded, de-duplicated input-history ring (newest
 * last). Consecutive duplicates collapse; capacity defaults to 50.
 */
export function pushInputHistory(history: string[], entry: string, cap = 50): string[] {
  const trimmed = entry.trim();
  if (!trimmed) return history;
  const withoutDup = history.filter((h) => h !== trimmed);
  const next = [...withoutDup, trimmed];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
