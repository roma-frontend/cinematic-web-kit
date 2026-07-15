'use client';

// Superadmin database browser + fullscreen "Database Studio". Pick a table on
// the left, view/search/paginate its rows on the right, edit/insert/delete a
// row, or export the whole (optionally filtered) table to a styled XLSX. All
// mutations go through /api/admin/db (superadmin-only, parameterized,
// rowid-addressed).

import { useEffect, useRef, useState } from 'react';
import {
  Table2, Loader2, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X, Save,
  AlertTriangle, Maximize2, Minimize2, Plus, Download, RefreshCw, Database, KeyRound, CheckSquare,
} from 'lucide-react';
import { usePref } from '@/hooks/use-user-prefs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import { staffDict, type StaffDict } from '@/lib/staff-dict';

type Column = { name: string; type: string; notnull: boolean; pk: boolean };
type Row = Record<string, unknown>;
type Dict = StaffDict['db'];
const PAGE = 50;
const SECRET = /password|hash|token|secret/i;

// --- column typing / validation ------------------------------------------
type Kind = 'integer' | 'number' | 'text';
function kindOf(type: string): Kind {
  const t = (type || '').toUpperCase();
  if (/INT/.test(t)) return 'integer';
  if (/REAL|FLOA|DOUB|NUMERIC|DEC/.test(t)) return 'number';
  return 'text';
}
// A per-field hint describing the expected value (translated).
function fieldHint(c: Column, t: Dict): string {
  if (c.pk) return t.hintAuto;
  const base = kindOf(c.type) === 'integer' ? t.hintInteger : kindOf(c.type) === 'number' ? t.hintNumber : t.hintText;
  return `${base} · ${c.notnull ? t.hintRequired : t.hintNullable}`;
}
// Returns a translated error string, or '' when the value is acceptable.
function validate(c: Column, raw: string, t: Dict): string {
  const v = raw.trim();
  if (v === '') return c.notnull && !c.pk ? t.vRequired : '';
  const k = kindOf(c.type);
  if (k === 'integer' && !/^-?\d+$/.test(v)) return t.vInteger;
  if (k === 'number' && !/^-?\d*\.?\d+$/.test(v)) return t.vNumber;
  if (/json|data|doc/i.test(c.name) && (v.startsWith('{') || v.startsWith('['))) {
    try { JSON.parse(v); } catch { return t.vJson; }
  }
  return '';
}

export function DbBrowser({ tables }: { tables: { name: string; count: number }[] }) {
  const t = staffDict(useLocale().locale).db;
  const [savedTable, saveTable] = usePref<string>('db-table', '');
  const [active, setActive] = useState<string>(tables[0]?.name ?? '');
  const picked = useRef(false);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [edit, setEdit] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);
  const [counts, setCounts] = useState(tables);
  const [full, setFull] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [tick, setTick] = useState(0);
  const key = `${active}|${offset}|${submittedQ}|${tick}`;
  const [result, setResult] = useState<{ key: string; columns: Column[]; rows: Row[]; total: number } | null>(null);
  const loading = !!active && result?.key !== key;
  const { columns = [], rows = [], total = 0 } = result ?? {};

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const url = `/api/admin/db?table=${encodeURIComponent(active)}&offset=${offset}&q=${encodeURIComponent(submittedQ)}`;
    fetch(url).then((r) => r.json()).then((d) => {
      if (alive) setResult({ key, columns: d.columns ?? [], rows: d.rows ?? [], total: d.total ?? 0 });
    }).catch(() => {
      if (alive) setResult((prev) => ({ key, columns: prev?.columns ?? [], rows: prev?.rows ?? [], total: prev?.total ?? 0 }));
    });
    return () => { alive = false; };
  }, [key, active, offset, submittedQ]);

  useEffect(() => {
    const reload = () => { setTick((n) => n + 1); setSelected(new Set()); };
    window.addEventListener('db-refresh', reload);
    return () => window.removeEventListener('db-refresh', reload);
  }, []);

  useEffect(() => {
    if (!picked.current && savedTable && savedTable !== active && tables.some((t) => t.name === savedTable)) {
      setActive(savedTable);
      setOffset(0);
    }
  }, [savedTable, tables]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc leaves fullscreen; lock body scroll while the studio overlay is open.
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [full]);

  const selectTable = (name: string) => { picked.current = true; saveTable(name); setActive(name); setOffset(0); setQ(''); setSubmittedQ(''); };
  const search = () => { setOffset(0); setSubmittedQ(q); setTick((n) => n + 1); };
  const refresh = () => { setTick((n) => n + 1); fetch('/api/admin/db').then((r) => r.json()).then((d) => d.tables && setCounts(d.tables)).catch(() => {}); };

  const updateCell = async (rowid: number, column: string, value: string) => {
    const response = await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', table: active, rowid, patch: { [column]: value } }) });
    if (!response.ok) throw new Error('update');
    setResult((current) => current ? {
      ...current,
      rows: current.rows.map((row) => Number(row.__rowid) === rowid ? { ...row, [column]: value === '' ? null : value } : row),
    } : current);
  };
  const saveEdit = async (patch: Row, rowid: number) => {
    const response = await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', table: active, rowid, patch }) });
    if (!response.ok) throw new Error('update');
    setEdit(null); refresh();
  };
  const doInsert = async (values: Row) => {
    const r = await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'insert', table: active, values }) });
    if (!r.ok) throw new Error('insert');
    setAdding(false); refresh();
  };
  const doDelete = async (rowid: number) => {
    await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', table: active, rowid }) });
    setConfirmDel(null); refresh();
  };
  const bulkDelete = async () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} selected rows? You can restore them from Change history.`)) return;
    setBulkBusy(true);
    const response = await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk-delete', table: active, rowids: [...selected] }) });
    setBulkBusy(false);
    if (response.ok) { setSelected(new Set()); refresh(); }
  };
  const doExport = async () => {
    if (!active) return;
    setExporting(true);
    try {
      const url = `/api/admin/db?table=${encodeURIComponent(active)}&q=${encodeURIComponent(submittedQ)}&export=xlsx`;
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href; a.download = `${active}.xlsx`; a.click();
      URL.revokeObjectURL(href);
    } finally { setExporting(false); }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;
  const shownTables = counts.filter((c) => !tableFilter || c.name.toLowerCase().includes(tableFilter.toLowerCase()));

  // The rows/tables/toolbar are shared between the inline card and the fullscreen
  // studio, so they live in one render tree parametrized by `full`.
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-sm backdrop-blur-xl">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder={t.searchIn.replace('{table}', active)} className="h-10 border-transparent bg-muted/60 pl-10 shadow-inner focus-visible:bg-background" />
      </div>
      <Button variant="outline" size="sm" onClick={search} className="h-10">{t.find}</Button>
      <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={!active} className="h-10 gap-1.5"><Plus className="h-4 w-4" />{t.addRow}</Button>
      <Button variant="outline" size="sm" onClick={doExport} disabled={!active || exporting} className="h-10 gap-1.5">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? t.exporting : t.exportXlsx}</Button>
      <Button variant="ghost" size="sm" onClick={refresh} className="h-10 gap-1.5" aria-label={t.refresh}><RefreshCw className="h-4 w-4" /></Button>
    </div>
  );

  const rowsPanel = (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20"><Table2 className="h-5 w-5" /></span>
        <div className="min-w-0"><h3 className="truncate text-lg font-black tracking-tight">{active}</h3><p className="text-xs text-muted-foreground">{total.toLocaleString()} {t.rowsLabel} · {columns.length} columns · click any cell to edit</p></div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live database</span>
      </div>
      {toolbar}
      <div className={`overflow-auto rounded-2xl border border-border/70 bg-card shadow-xl shadow-black/5 ring-1 ring-black/[0.02] ${full ? 'max-h-[calc(100dvh-250px)]' : ''}`}>
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></span><span className="text-xs text-muted-foreground">Loading records…</span></div>
        ) : rows.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Database className="h-6 w-6" /></span>{t.noRows}</div>
        ) : (
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 text-left backdrop-blur-xl">
              <tr>
                <th className="w-16 border-b border-r border-border/60 bg-muted/90 px-2 py-3 text-center"><label className="flex cursor-pointer items-center justify-center gap-1 text-[10px] text-muted-foreground"><input type="checkbox" aria-label="Select page" checked={rows.length > 0 && rows.every((r) => selected.has(Number(r.__rowid)))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => Number(r.__rowid))) : new Set())} className="h-3.5 w-3.5 accent-primary" />#</label></th>
                {columns.map((c) => (
                  <th key={c.name} className="whitespace-nowrap border-b border-r border-border/60 bg-muted/90 px-4 py-2.5 last:border-r-0">
                    <span className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-lg ${c.pk ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'}`}>{c.pk ? <KeyRound className="h-3.5 w-3.5" /> : <span className="text-[10px] font-black">{kindOf(c.type) === 'text' ? 'T' : '#'}</span>}</span><span><span className="block text-xs font-bold normal-case tracking-normal text-foreground">{c.name}</span><span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{c.type || 'ANY'}{c.notnull ? ' · required' : ''}</span></span></span>
                  </th>
                ))}
                <th className="sticky right-0 w-24 border-b border-l border-border/60 bg-muted/95 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={String(row.__rowid)} className="group/row transition-colors hover:bg-primary/[0.045]">
                  <td className="border-b border-r border-border/50 bg-muted/20 px-2 py-2 text-center font-mono text-[11px] text-muted-foreground group-hover/row:bg-primary/5"><label className="flex cursor-pointer items-center justify-center gap-1.5"><input type="checkbox" checked={selected.has(Number(row.__rowid))} onChange={(e) => setSelected((current) => { const next = new Set(current); if (e.target.checked) next.add(Number(row.__rowid)); else next.delete(Number(row.__rowid)); return next; })} className="h-3.5 w-3.5 accent-primary" /><span>{offset + rowIndex + 1}</span></label></td>
                  {columns.map((c) => (
                    <InlineCell
                      key={c.name}
                      column={c}
                      value={row[c.name]}
                      rowid={Number(row.__rowid)}
                      secret={SECRET.test(c.name)}
                      t={t}
                      onSave={updateCell}
                    />
                  ))}
                  <td className="sticky right-0 whitespace-nowrap border-b border-l border-border/50 bg-card/95 px-3 py-2 text-center backdrop-blur group-hover/row:bg-primary/[0.045]">
                    <button onClick={() => setEdit(row)} className="mr-1 rounded-xl border border-transparent p-2 text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary hover:shadow-sm" aria-label={t.edit}><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setConfirmDel(row)} className="rounded-xl border border-transparent p-2 text-muted-foreground transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 hover:shadow-sm" aria-label={t.delete}><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected.size > 0 && <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-3 shadow-lg shadow-primary/5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CheckSquare className="h-4 w-4" /></span><strong className="text-sm">Selected: {selected.size}</strong><Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button><Button variant="destructive" size="sm" disabled={bulkBusy} onClick={bulkDelete} className="ml-auto">{bulkBusy ? <Loader2 className="animate-spin" /> : <Trash2 />}Delete selected</Button></div>}
      <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <span>{t.total.replace('{n}', String(total))}{columns.length > 0 && ` · ${t.columnsLabel.replace('{n}', String(columns.length))}`}</span>
        <div className="flex items-center gap-2">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="rounded-lg border border-border/60 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setOffset(offset + PAGE)} className="rounded-lg border border-border/60 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );

  const tablesPanel = (withSearch: boolean) => (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 p-2 shadow-xl shadow-black/5 backdrop-blur-xl lg:h-max">
      <div className="mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20"><Database className="h-4 w-4" /></span>
        <div><p className="text-sm font-extrabold">Database</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{counts.length} tables</p></div>
      </div>
      {withSearch && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} placeholder={t.searchTables} className="h-9 pl-10" />
        </div>
      )}
      <ul className={`space-y-0.5 overflow-y-auto ${full ? 'max-h-[calc(100dvh-200px)]' : 'max-h-[75dvh]'}`}>
        {shownTables.map((c) => (
          <li key={c.name}>
            <button onClick={() => selectTable(c.name)}
              className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${active === c.name ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'hover:translate-x-0.5 hover:bg-muted'}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active === c.name ? 'bg-white/15' : 'bg-muted group-hover:bg-background'}`}><Table2 className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${active === c.name ? 'bg-white/15 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{c.count.toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const modals = (
    <>
      {edit && <RowModal mode="edit" table={active} columns={columns} row={edit} onClose={() => setEdit(null)} onSubmit={(v) => saveEdit(v, Number(edit.__rowid))} t={t} />}
      {adding && <RowModal mode="add" table={active} columns={columns} row={{}} onClose={() => setAdding(false)} onSubmit={doInsert} t={t} />}
      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)} t={t}>
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><AlertTriangle className="h-6 w-6" /></span>
            <h3 className="text-lg font-bold">{t.deleteRowTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.deleteRowDesc}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="ghost" onClick={() => setConfirmDel(null)}>{t.cancel}</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => doDelete(Number(confirmDel.__rowid))}>{t.delete}</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Database className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold leading-tight">{t.studioTitle}</h2>
            <p className="truncate text-xs text-muted-foreground">{t.tablesLabel.replace('{n}', String(counts.length))}{active && ` · ${active}`}</p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => setFull(false)} className="h-9 gap-1.5"><Minimize2 className="h-4 w-4" />{t.exitFullscreen}</Button>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden p-5 lg:grid-cols-[280px_1fr]">
          {tablesPanel(true)}
          {rowsPanel}
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setFull(true)} className="gap-1.5"><Maximize2 className="h-4 w-4" />{t.fullscreen}</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        {tablesPanel(false)}
        {rowsPanel}
      </div>
      {modals}
    </div>
  );
}

function InlineCell({ column, value, rowid, secret, t, onSave }: {
  column: Column; value: unknown; rowid: number; secret: boolean; t: Dict;
  onSave: (rowid: number, column: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cancelled = useRef(false);

  const begin = () => {
    if (column.pk) return;
    setDraft(String(value ?? ''));
    setError('');
    setEditing(true);
  };
  const save = async () => {
    if (cancelled.current) { cancelled.current = false; return; }
    const validationError = validate(column, draft, t);
    if (validationError) { setError(validationError); return; }
    if (draft === String(value ?? '')) { setEditing(false); return; }
    setSaving(true); setError('');
    try { await onSave(rowid, column.name, draft); setEditing(false); }
    catch { setError(t.opError); }
    finally { setSaving(false); }
  };

  if (editing) return (
    <td className="min-w-52 border-b border-r border-primary/40 bg-primary/[0.06] p-1.5 align-top shadow-[inset_0_0_0_1px_hsl(var(--primary)/.3)]">
      <div className="relative">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === 'Escape') { cancelled.current = true; setEditing(false); }
          }}
          className={`h-9 w-full rounded-xl border bg-background px-3 pr-9 font-mono text-xs shadow-lg outline-none transition-all ${error ? 'border-red-500 ring-4 ring-red-500/10' : 'border-primary ring-4 ring-primary/10'}`}
        />
        {saving ? <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-primary" /> : <Save className="absolute right-2.5 top-2.5 h-4 w-4 text-primary/50" />}
      </div>
      {error ? <p className="mt-1 px-1 text-[10px] font-medium text-red-500">{error}</p> : <p className="mt-1 px-1 text-[9px] text-muted-foreground">Enter to save · Esc to cancel</p>}
    </td>
  );

  return (
    <td
      onClick={begin}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !column.pk) begin(); }}
      tabIndex={column.pk ? -1 : 0}
      title={column.pk ? t.pkReadonly : secret ? '' : String(value ?? '')}
      className={`group/cell max-w-[300px] truncate border-b border-r border-border/50 px-4 py-3 font-mono text-xs outline-none transition-all ${column.pk ? 'cursor-default bg-amber-500/[0.025]' : 'cursor-text hover:bg-primary/[0.08] focus:bg-primary/[0.08] focus:ring-2 focus:ring-inset focus:ring-primary/30'}`}
    >
      <span className={`inline-flex max-w-full items-center rounded-lg px-1.5 py-0.5 transition-all ${column.pk ? 'font-semibold text-amber-700 dark:text-amber-300' : 'group-hover/cell:bg-background group-hover/cell:shadow-sm'}`}>
        {secret ? <span className="tracking-widest text-muted-foreground">••••••</span> : format(value)}
      </span>
    </td>
  );
}

function format(v: unknown) {
  if (v === null || v === undefined) return <span className="text-muted-foreground/50">null</span>;
  return String(v);
}

function Modal({ children, onClose, t, wide = false }: { children: React.ReactNode; onClose: () => void; t: Dict; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full overflow-hidden rounded-3xl border border-border bg-background shadow-2xl ${wide ? 'max-w-4xl' : 'max-w-lg p-6'}`}>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={t.close}><X className="h-5 w-5" /></button>
        {children}
      </div>
    </div>
  );
}

// Shared add/edit row modal with live per-field validation hints.
function RowModal({ mode, table, columns, row, onClose, onSubmit, t }: {
  mode: 'add' | 'edit'; table: string; columns: Column[]; row: Row;
  onClose: () => void; onSubmit: (values: Row) => Promise<void> | void; t: Dict;
}) {
  const [form, setForm] = useState<Row>(() => Object.fromEntries(columns.map((c) => [c.name, row[c.name] ?? ''])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState(0);
  const editableColumns = columns.filter((c) => !(c.pk && mode === 'edit'));
  const groups = Array.from({ length: Math.max(1, Math.ceil(editableColumns.length / 5)) }, (_, i) => editableColumns.slice(i * 5, i * 5 + 5));
  const reviewStep = groups.length;
  const totalSteps = groups.length + 1;
  const currentColumns = step < groups.length ? groups[step] : [];

  // pk column is read-only on edit; on add it is left for the DB (auto) unless typed.
  const errors: Record<string, string> = {};
  for (const c of columns) {
    if (c.pk && mode === 'edit') continue;
    const e = validate(c, String(form[c.name] ?? ''), t);
    if (e) errors[c.name] = e;
  }
  const hasErrors = Object.keys(errors).length > 0;
  const currentHasErrors = currentColumns.some((c) => Boolean(errors[c.name]));
  const changed = columns.filter((c) => !c.pk && String(form[c.name] ?? '') !== String(row[c.name] ?? ''));

  const submit = async () => {
    if (hasErrors) return;
    setBusy(true); setErr('');
    try {
      if (mode === 'edit') {
        const patch: Row = {};
        for (const c of columns) {
          if (c.pk) continue;
          if (String(form[c.name] ?? '') !== String(row[c.name] ?? '')) patch[c.name] = form[c.name];
        }
        await onSubmit(patch);
      } else {
        const values: Row = {};
        for (const c of columns) {
          const v = String(form[c.name] ?? '');
          if (c.pk && v === '') continue; // let auto/default fill in
          if (v !== '') values[c.name] = form[c.name];
        }
        await onSubmit(values);
      }
    } catch {
      setErr(t.opError);
    } finally { setBusy(false); }
  };

  const title = mode === 'add' ? t.addRowTitle.replace('{table}', table) : t.editRow.replace('{table}', table);
  const hint = mode === 'add' ? t.addRowHint : t.editHint;

  return (
    <Modal onClose={onClose} t={t} wide>
      <div className="grid min-h-[560px] md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border/60 bg-gradient-to-b from-primary/10 via-muted/30 to-background p-6 md:block">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Pencil className="h-5 w-5" /></span>
          <h3 className="text-lg font-black">Record wizard</h3><p className="mt-1 text-xs text-muted-foreground">{table} · row #{String(row.__rowid ?? 'new')}</p>
          <div className="mt-8 space-y-2">{Array.from({ length: totalSteps }, (_, i) => <button key={i} onClick={() => i <= step && setStep(i)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs transition-all ${i === step ? 'bg-primary text-primary-foreground shadow-md' : i < step ? 'text-foreground hover:bg-muted' : 'cursor-default text-muted-foreground/50'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold ${i === step ? 'bg-white/15' : i < step ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted'}`}>{i < step ? '✓' : i + 1}</span><span className="font-semibold">{i === reviewStep ? 'Review & save' : `Fields ${i * 5 + 1}–${Math.min((i + 1) * 5, editableColumns.length)}`}</span></button>)}</div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="border-b border-border/60 px-6 py-5 pr-14"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Step {step + 1} of {totalSteps}</p><h3 className="mt-1 text-xl font-black">{step === reviewStep ? 'Review changes' : title}</h3><p className="mt-1 text-xs text-muted-foreground">{step === reviewStep ? 'Check everything before applying changes to the database.' : hint}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} /></div></header>
          <main className="max-h-[60dvh] min-h-0 flex-1 overflow-y-auto p-6">
            {step < reviewStep ? <div className="grid gap-5 sm:grid-cols-2">{currentColumns.map((c) => { const fieldErr = errors[c.name]; const long = /json|data|doc|body|description/i.test(c.name) || String(form[c.name] ?? '').length > 60; return <div key={c.name} className={`space-y-2 ${long ? 'sm:col-span-2' : ''}`}><label className="flex items-center gap-2 text-xs font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] text-primary">{kindOf(c.type) === 'text' ? 'T' : '#'}</span>{c.name}<span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground">{c.type || 'ANY'}{c.notnull ? ' · required' : ''}</span></label><textarea autoFocus={c === currentColumns[0]} value={String(form[c.name] ?? '')} onChange={(e) => setForm((f) => ({ ...f, [c.name]: e.target.value }))} rows={long ? 5 : 1} placeholder={c.pk ? t.hintAuto : ''} className={`w-full resize-y rounded-xl border bg-muted/20 px-3 py-2.5 font-mono text-sm outline-none transition-all focus:bg-background focus:ring-4 ${fieldErr ? 'border-red-500 focus:ring-red-500/10' : 'border-border focus:border-primary focus:ring-primary/10'}`} /><p className={`text-[10px] ${fieldErr ? 'font-medium text-red-500' : 'text-muted-foreground'}`}>{fieldErr || fieldHint(c, t)}</p></div>; })}</div> : <div className="space-y-3">{mode === 'edit' && changed.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No fields were changed.</div> : (mode === 'edit' ? changed : editableColumns).map((c) => <div key={c.name} className="grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-[160px_1fr]"><div><p className="text-xs font-bold">{c.name}</p><p className="text-[9px] uppercase text-muted-foreground">{c.type || 'ANY'}</p></div><div className="min-w-0 font-mono text-xs">{mode === 'edit' && <p className="truncate text-red-500/70 line-through">{String(row[c.name] ?? 'NULL')}</p>}<p className="truncate font-semibold text-emerald-600">{String(form[c.name] ?? 'NULL')}</p></div></div>)}</div>}
            {err && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{err}</p>}
          </main>
          <footer className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-6 py-4"><Button variant="ghost" onClick={onClose}>{t.cancel}</Button>{step > 0 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}><ChevronLeft /> Back</Button>}<span className="flex-1" />{step < reviewStep ? <Button onClick={() => setStep((s) => s + 1)} disabled={currentHasErrors}>Next <ChevronRight /></Button> : <Button onClick={submit} disabled={busy || hasErrors || (mode === 'edit' && changed.length === 0)} className="min-w-32 gap-2">{busy ? <Loader2 className="animate-spin" /> : mode === 'add' ? <Plus /> : <Save />}{busy ? (mode === 'add' ? t.creating : t.saving) : mode === 'add' ? t.create : t.save}</Button>}</footer>
        </div>
      </div>
    </Modal>
  );
}
