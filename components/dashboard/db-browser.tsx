'use client';

// Superadmin database browser: pick a table on the left, view/search/paginate
// its rows on the right, edit a row in a modal or delete it. All mutations go
// through /api/admin/db (superadmin-only, parameterized, rowid-addressed).

import { useCallback, useEffect, useState } from 'react';
import { Table2, Loader2, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Column = { name: string; type: string; notnull: boolean; pk: boolean };
type Row = Record<string, unknown>;
const PAGE = 50;
const SECRET = /password|hash|token|secret/i;

export function DbBrowser({ tables }: { tables: { name: string; count: number }[] }) {
  const [active, setActive] = useState<string>(tables[0]?.name ?? '');
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);
  const [counts, setCounts] = useState(tables);

  const load = useCallback((table: string, off: number, query: string) => {
    if (!table) return;
    setLoading(true);
    const url = `/api/admin/db?table=${encodeURIComponent(table)}&offset=${off}&q=${encodeURIComponent(query)}`;
    fetch(url).then((r) => r.json()).then((d) => {
      setColumns(d.columns ?? []); setRows(d.rows ?? []); setTotal(d.total ?? 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // `q` is deliberately not a dep — the search only fires on submit.
  useEffect(() => { load(active, offset, q); }, [active, offset, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTable = (name: string) => { setActive(name); setOffset(0); setQ(''); };
  const search = () => { setOffset(0); load(active, 0, q); };
  const refresh = () => { load(active, offset, q); fetch('/api/admin/db').then((r) => r.json()).then((d) => d.tables && setCounts(d.tables)).catch(() => {}); };

  const saveEdit = async (patch: Row, rowid: number) => {
    await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', table: active, rowid, patch }) });
    setEdit(null); refresh();
  };
  const doDelete = async (rowid: number) => {
    await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', table: active, rowid }) });
    setConfirmDel(null); refresh();
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Tables */}
      <div className="rounded-2xl border border-border/60 bg-card p-2 lg:h-max">
        <ul className="max-h-[75dvh] space-y-0.5 overflow-y-auto">
          {counts.map((t) => (
            <li key={t.name}>
              <button onClick={() => selectTable(t.name)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active === t.name ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <Table2 className="h-4 w-4 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                <span className="flex-none rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{t.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Rows */}
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder={`Поиск в ${active}…`} className="h-10 pl-10" />
          </div>
          <Button variant="outline" size="sm" onClick={search}>Найти</Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/60">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Нет строк.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {columns.map((c) => <th key={c.name} className="whitespace-nowrap px-3 py-2 font-semibold">{c.name}{c.pk ? ' 🔑' : ''}</th>)}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={String(row.__rowid)} className="hover:bg-muted/20">
                    {columns.map((c) => (
                      <td key={c.name} className="max-w-[240px] truncate px-3 py-2" title={SECRET.test(c.name) ? '' : String(row[c.name] ?? '')}>
                        {SECRET.test(c.name) ? <span className="text-muted-foreground">••••••</span> : format(row[c.name])}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button onClick={() => setEdit(row)} className="mr-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Изменить"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setConfirmDel(row)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500" aria-label="Удалить"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Всего: {total}</span>
          <div className="flex items-center gap-2">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="rounded-lg border border-border/60 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setOffset(offset + PAGE)} className="rounded-lg border border-border/60 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {edit && <EditModal table={active} columns={columns} row={edit} onClose={() => setEdit(null)} onSave={saveEdit} />}
      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)}>
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><AlertTriangle className="h-6 w-6" /></span>
            <h3 className="text-lg font-bold">Удалить строку?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Действие необратимо. Связанные записи могут удалиться каскадно.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="ghost" onClick={() => setConfirmDel(null)}>Отмена</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => doDelete(Number(confirmDel.__rowid))}>Удалить</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function format(v: unknown) {
  if (v === null || v === undefined) return <span className="text-muted-foreground/50">null</span>;
  return String(v);
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Закрыть"><X className="h-5 w-5" /></button>
        {children}
      </div>
    </div>
  );
}

function EditModal({ table, columns, row, onClose, onSave }: { table: string; columns: Column[]; row: Row; onClose: () => void; onSave: (patch: Row, rowid: number) => void }) {
  const editable = columns.filter((c) => c.name !== 'id' || !c.pk); // pk 'id' shown read-only below
  const [form, setForm] = useState<Row>(() => Object.fromEntries(columns.map((c) => [c.name, row[c.name] ?? ''])));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const patch: Row = {};
    for (const c of columns) {
      if (c.pk) continue;
      if (String(form[c.name] ?? '') !== String(row[c.name] ?? '')) patch[c.name] = form[c.name];
    }
    await onSave(patch, Number(row.__rowid));
    setBusy(false);
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 text-lg font-bold">Изменить строку · {table}</h3>
      <p className="mb-4 text-xs text-muted-foreground">Пустое поле сохранится как NULL. Первичный ключ менять нельзя.</p>
      <div className="max-h-[60dvh] space-y-3 overflow-y-auto pr-1">
        {editable.map((c) => (
          <div key={c.name} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{c.name} <span className="opacity-60">· {c.type || 'ANY'}{c.pk ? ' · pk' : ''}</span></label>
            {c.pk ? (
              <Input value={String(row[c.name] ?? '')} disabled className="h-10 opacity-60" />
            ) : (
              <textarea
                value={String(form[c.name] ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, [c.name]: e.target.value }))}
                rows={String(form[c.name] ?? '').length > 60 ? 3 : 1}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={submit} disabled={busy} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Сохранить</Button>
      </div>
    </Modal>
  );
}
