// Pure helpers for the Studio Assistant fullscreen canvas side-panel.
// Kept client-safe and framework-agnostic so Vitest can unit-test them.

import type { MentionEntity } from '@/lib/assistant-commands';

export interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

/**
 * Parse the first GitHub-flavoured markdown table found in a block of text.
 * Tolerant to leading/trailing prose; returns null if no table is found.
 */
export function parseMarkdownTable(md: string): MarkdownTable | null {
  const lines = md.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const start = lines.findIndex((l) => /^\|.*\|$/.test(l));
  if (start < 0) return null;
  const headerLine = lines[start];
  const sepLine = lines[start + 1];
  if (!sepLine || !/^\|\s*[:-]+\s*(\|\s*[:-]+\s*)*\|$/.test(sepLine.replace(/\s+/g, ' '))) return null;
  const cells = (line: string) =>
    line
      .split('|')
      .slice(1, -1)
      .map((c) => c.replace(/\\\|/g, '|').trim())
      .map((c) => c.replace(/\\n/g, '\n'));
  const headers = cells(headerLine);
  const rows: string[][] = [];
  for (let i = start + 2; i < lines.length; i++) {
    const ln = lines[i];
    if (!/^\|.*\|$/.test(ln)) break;
    rows.push(cells(ln));
  }
  if (rows.length === 0) return null;
  return { headers, rows };
}

/** Build a live preview URL for an owned site. Owners always see the draft. */
export function sitePreviewUrl(slug: string, themeId?: string): string {
  const params = new URLSearchParams({ draft: '1' });
  if (themeId) params.set('theme', themeId);
  return `/s/${encodeURIComponent(slug)}?${params.toString()}`;
}

/** Find a site-type mention entity by its id. */
export function findSiteEntity(entities: MentionEntity[], siteId: string): MentionEntity | undefined {
  return entities.find((e) => e.type === 'site' && e.id === siteId);
}
