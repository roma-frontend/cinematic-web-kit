'use client';

import type { AssistantMessage } from '@/components/assistant/use-studio-assistant';

export type ExportFormat = 'markdown' | 'json' | 'text';

function messagesToMarkdown(messages: AssistantMessage[], title: string): string {
  const lines = [`# ${title}`, '', `_${new Date().toLocaleString()}_`, ''];
  for (const m of messages) {
    const role = m.role === 'user' ? '**You**' : '**Assistant**';
    lines.push(`${role}:`, '', m.content, '');
  }
  return lines.join('\n');
}

function messagesToJson(messages: AssistantMessage[], title: string): string {
  return JSON.stringify({ title, exportedAt: new Date().toISOString(), messages: messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })) }, null, 2);
}

function messagesToText(messages: AssistantMessage[], title: string): string {
  const lines = [title, '='.repeat(title.length), '', `Exported: ${new Date().toLocaleString()}`, ''];
  for (const m of messages) {
    const role = m.role === 'user' ? 'You' : 'Assistant';
    lines.push(`[${role}]`, m.content, '');
  }
  return lines.join('\n');
}

export function exportConversation(messages: AssistantMessage[], title: string, format: ExportFormat): void {
  const mime: Record<ExportFormat, string> = { markdown: 'text/markdown', json: 'application/json', text: 'text/plain' };
  const ext: Record<ExportFormat, string> = { markdown: 'md', json: 'json', text: 'txt' };
  const content = format === 'markdown' ? messagesToMarkdown(messages, title) : format === 'json' ? messagesToJson(messages, title) : messagesToText(messages, title);
  const blob = new Blob([content], { type: mime[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Zа-яА-Я0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50)}.${ext[format]}`;
  a.click();
  URL.revokeObjectURL(url);
}
