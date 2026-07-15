'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Database, History, Loader2, RefreshCw, RotateCcw, Rows3, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Diagnostics = { integrity: string; sizeBytes: number; foreignKeyIssues: number; indexes: number; tables: number; rows: number; journalMode: string };
type Change = { id: number; tableName: string; rowid: number; operation: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; actor: string; createdAt: number; undoneAt: number | null };

export function DbToolbox() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [history, setHistory] = useState<Change[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const load = () => Promise.all([
    fetch('/api/admin/db?view=diagnostics').then((r) => r.json()),
    fetch('/api/admin/db?view=history&limit=30').then((r) => r.json()),
  ]).then(([d, h]) => { setDiagnostics(d.diagnostics ?? null); setHistory(h.history ?? []); }).catch(() => {});
  useEffect(() => { void load(); }, []);
  const undo = async (id: number) => {
    setBusy(id);
    const response = await fetch('/api/admin/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'undo', changeId: id }) });
    setBusy(null); if (response.ok) { await load(); window.dispatchEvent(new Event('db-refresh')); }
  };
  const healthy = diagnostics?.integrity === 'ok' && diagnostics.foreignKeyIssues === 0;
  const formatBytes = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

  return <section className="mb-6 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-xl shadow-black/5">
    <div className="grid gap-px bg-border/40 sm:grid-cols-2 lg:grid-cols-5">
      <Stat icon={healthy ? CheckCircle2 : TriangleAlert} label="Integrity" value={healthy ? 'Healthy' : 'Attention'} accent={healthy ? 'emerald' : 'amber'} />
      <Stat icon={Database} label="Database size" value={diagnostics ? formatBytes(diagnostics.sizeBytes) : '…'} />
      <Stat icon={Rows3} label="Records" value={diagnostics?.rows.toLocaleString() ?? '…'} />
      <Stat icon={Activity} label="Indexes" value={String(diagnostics?.indexes ?? '…')} />
      <Stat icon={ShieldCheck} label="Journal" value={(diagnostics?.journalMode ?? '…').toUpperCase()} />
    </div>
    <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 border-t border-border/50 px-5 py-3 text-left transition-colors hover:bg-muted/40"><History className="h-4 w-4 text-primary" /><span className="flex-1 text-sm font-bold">Change history & Undo</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{history.length}</span></button>
    {open && <div className="max-h-80 overflow-auto border-t border-border/50 p-3">
      {history.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Changes will appear here.</p> : <div className="space-y-1.5">{history.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/60 p-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.operation === 'delete' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}><History className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold"><span className="uppercase text-muted-foreground">{item.operation}</span> · {item.tableName} #{item.rowid}</p><p className="truncate text-[10px] text-muted-foreground">{item.actor || 'superadmin'} · {new Date(item.createdAt).toLocaleString()}</p></div>
        <Button variant="outline" size="sm" disabled={Boolean(item.undoneAt) || busy === item.id} onClick={() => undo(item.id)} className="h-8 gap-1.5">{busy === item.id ? <Loader2 className="animate-spin" /> : item.undoneAt ? <CheckCircle2 /> : <RotateCcw />}{item.undoneAt ? 'Undone' : 'Undo'}</Button>
      </div>)}</div>}
      <Button variant="ghost" size="sm" onClick={() => void load()} className="mt-2 w-full"><RefreshCw /> Refresh history</Button>
    </div>}
  </section>;
}

function Stat({ icon: Icon, label, value, accent = 'primary' }: { icon: typeof Database; label: string; value: string; accent?: 'primary' | 'emerald' | 'amber' }) {
  const color = accent === 'emerald' ? 'text-emerald-500 bg-emerald-500/10' : accent === 'amber' ? 'text-amber-500 bg-amber-500/10' : 'text-primary bg-primary/10';
  return <div className="flex items-center gap-3 bg-card/80 p-4"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-sm font-black">{value}</p></div></div>;
}
