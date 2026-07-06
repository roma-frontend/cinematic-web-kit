'use client';

// Superadmin storage indicator (R2 vs local) + manual orphaned-uploads cleanup.

import { useEffect, useState } from 'react';
import { Cloud, HardDrive, Loader2, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { staffDict } from '@/lib/staff-dict';

type Info = { mode: 'r2'; bucket: string; publicBase: string } | { mode: 'local' };

export function StoragePanel() {
  const t = staffDict(useLocale().locale).db;
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/storage').then((r) => r.json()).then((d) => setInfo(d.info ?? null)).catch(() => {});
  }, []);

  const gc = async () => {
    setBusy(true); setMsg('');
    const res = await fetch('/api/admin/storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'gc' }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? t.gcDone.replace('{n}', String(d.deleted ?? 0)) : (d.error || t.error));
  };

  const isR2 = info?.mode === 'r2';

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
      <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${isR2 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {isR2 ? <Cloud className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {t.storageLabel} {info === null ? '…' : isR2 ? t.r2 : t.local}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {info === null ? t.loading : isR2 ? t.bucketInfo.replace('{bucket}', info.bucket).replace('{base}', info.publicBase) : t.localInfo}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {msg && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-green-600" /> {msg}</span>}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={gc} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {t.gcButton}
        </Button>
      </div>
    </div>
  );
}
