'use client';

import { useState } from 'react';
import { AlertTriangle, Bookmark, CheckCircle2, Code2, Download, Loader2, Play, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import type { Locale } from '@/lib/seo';

type Result = { columns: string[]; rows: Record<string, unknown>[]; changes: number; truncated: boolean; durationMs: number };

const COPY: Record<Locale, {
  title: string;
  subtitle: string;
  readOnly: string;
  allowWrite: string;
  confirmPh: string;
  saveQuery: string;
  run: string;
  writeWarn: string;
  sqlFailed: string;
  doneIn: string; // {ms} {changes}
  truncated: string;
  downloadDb: string;
  exportJson: string;
  accessNote: string;
  queryName: string;
}> = {
  ru: {
    title: 'SQL-консоль',
    subtitle: 'Запросы и изменения прямо в браузере · без расширений',
    readOnly: 'Только чтение',
    allowWrite: 'Разрешить изменение данных',
    confirmPh: 'Введите APPLY CHANGES',
    saveQuery: 'Сохранить запрос',
    run: 'Выполнить',
    writeWarn: 'Изменения применяются сразу. ATTACH, VACUUM, REINDEX и загрузка расширений заблокированы.',
    sqlFailed: 'Не удалось выполнить SQL',
    doneIn: 'Готово за {ms} мс · изменено строк: {changes}',
    truncated: ' · показаны первые 500 строк',
    downloadDb: 'Скачать резервную копию .db',
    exportJson: 'Экспорт JSON',
    accessNote: 'Доступ только суперадмину · действия записываются в аудит',
    queryName: 'Query name',
  },
  en: {
    title: 'SQL console',
    subtitle: 'Queries and changes right in the browser · no extensions',
    readOnly: 'Read only',
    allowWrite: 'Allow data changes',
    confirmPh: 'Type APPLY CHANGES',
    saveQuery: 'Save query',
    run: 'Run',
    writeWarn: 'Changes apply immediately. ATTACH, VACUUM, REINDEX and loading extensions are blocked.',
    sqlFailed: 'Failed to run SQL',
    doneIn: 'Done in {ms} ms · rows changed: {changes}',
    truncated: ' · showing first 500 rows',
    downloadDb: 'Download .db backup',
    exportJson: 'Export JSON',
    accessNote: 'Superadmin only · actions are audited',
    queryName: 'Query name',
  },
  hy: {
    title: 'SQL վահանակ',
    subtitle: 'Հարցումներ և փոփոխություններ անմիջապես բրաուզերում · առանց ընդլայնումների',
    readOnly: 'Միայն ընթերցում',
    allowWrite: 'Թույլատրել տվյալների փոփոխություն',
    confirmPh: 'Մուտքագրեք APPLY CHANGES',
    saveQuery: 'Պահել հարցումը',
    run: 'Կատարել',
    writeWarn: 'Փոփոխությունները կիրառվում են անմիջապես։ ATTACH, VACUUM, REINDEX և ընդլայնումների բեռնումը արգելափակված են։',
    sqlFailed: 'Չհաջողվեց կատարել SQL',
    doneIn: 'Պատրաստ է {ms} մվ · փոփոխված տողեր՝ {changes}',
    truncated: ' · ցուցադրված են առաջին 500 տողերը',
    downloadDb: 'Ներբեռնել .db պահուստը',
    exportJson: 'Արտահանում JSON',
    accessNote: 'Միայն գերադմին · գործողությունները գրանցվում են աուդիտում',
    queryName: 'Հարցման անուն',
  },
};

export function DbSqlConsole() {
  const c = COPY[useLocale().locale] ?? COPY.en;
  const [open, setOpen] = useState(false);
  const [sql, setSql] = useState('SELECT name, type\nFROM sqlite_master\nWHERE type IN (\'table\', \'index\')\nORDER BY type, name');
  const [write, setWrite] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState<{ name: string; sql: string }[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('db-saved-queries') || '[]'); } catch { return []; }
  });
  const saveQuery = () => {
    const name = window.prompt(c.queryName); if (!name?.trim() || !sql.trim()) return;
    const next = [...saved.filter((q) => q.name !== name.trim()), { name: name.trim(), sql }];
    setSaved(next); localStorage.setItem('db-saved-queries', JSON.stringify(next));
  };
  const deleteQuery = (name: string) => { const next = saved.filter((q) => q.name !== name); setSaved(next); localStorage.setItem('db-saved-queries', JSON.stringify(next)); };

  const run = async () => {
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/admin/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sql', sql, allowWrite: write, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || c.sqlFailed);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : c.sqlFailed); }
    finally { setBusy(false); }
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Code2 className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">{c.title}</strong><span className="text-xs text-muted-foreground">{c.subtitle}</span></span>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">{c.readOnly}</span>
      </button>
      {open && <div className="space-y-4 border-t border-border/60 p-4">
        {saved.length > 0 && <div className="flex flex-wrap gap-2">{saved.map((query) => <span key={query.name} className="inline-flex overflow-hidden rounded-xl border border-border bg-muted/40"><button onClick={() => setSql(query.sql)} className="px-3 py-1.5 text-xs font-semibold hover:bg-muted"><Bookmark className="mr-1 inline h-3 w-3 text-primary" />{query.name}</button><button onClick={() => deleteQuery(query.name)} className="border-l border-border px-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3 w-3" /></button></span>)}</div>}
        <div className="relative">
          <textarea value={sql} onChange={(e) => setSql(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); } }} spellCheck={false} className="min-h-40 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm leading-6 outline-none focus:border-primary" />
          <span className="absolute bottom-3 right-3 text-[11px] text-muted-foreground">Ctrl/⌘ + Enter</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={write} onChange={(e) => { setWrite(e.target.checked); setConfirmation(''); }} className="h-4 w-4 accent-primary" /> {c.allowWrite}</label>
          {write && <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={c.confirmPh} className="h-9 min-w-56 rounded-lg border border-amber-500/50 bg-amber-500/5 px-3 text-sm outline-none focus:border-amber-500" />}
          <Button variant="outline" onClick={saveQuery} disabled={!sql.trim()} className="gap-2"><Bookmark /> {c.saveQuery}</Button>
          <Button onClick={run} disabled={busy || !sql.trim() || (write && confirmation !== 'APPLY CHANGES')} className="ml-auto gap-2">
            {busy ? <Loader2 className="animate-spin" /> : <Play />} {c.run}
          </Button>
        </div>
        {write && <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" />{c.writeWarn}</p>}
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
        {result && <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{c.doneIn.replace('{ms}', String(result.durationMs)).replace('{changes}', String(result.changes))}{result.truncated ? c.truncated : ''}</p>
          {result.rows.length > 0 && <div className="max-h-80 overflow-auto rounded-xl border border-border"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr>{result.columns.map((col) => <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{col}</th>)}</tr></thead><tbody className="divide-y divide-border">{result.rows.map((row, i) => <tr key={i}>{result.columns.map((col) => <td key={col} className="max-w-80 truncate px-3 py-2 font-mono text-xs">{row[col] == null ? <span className="opacity-40">NULL</span> : String(row[col])}</td>)}</tr>)}</tbody></table></div>}
        </div>}
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button asChild variant="outline" size="sm"><a href="/api/admin/export-db"><Download /> {c.downloadDb}</a></Button>
          <Button asChild variant="outline" size="sm"><a href="/api/admin/export-db?format=json"><Download /> {c.exportJson}</a></Button>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />{c.accessNote}</span>
        </div>
      </div>}
    </section>
  );
}
