'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

export interface Command { label: string; hint?: string; run: () => void; icon: React.ComponentType<{ className?: string }> }

export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Resetting query/highlight happens in the event handlers (not an effect):
    // the palette always opens fresh, and resetting on close too is harmless.
    const reset = () => { setQ(''); setIdx(0); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        reset();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    const onOpen = () => { reset(); setOpen(true); };
    window.addEventListener('cwk:open-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('cwk:open-palette', onOpen); };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? commands.filter((c) => c.label.toLowerCase().includes(s) || c.hint?.toLowerCase().includes(s)) : commands;
  }, [q, commands]);

  if (!open) return null;

  const runAt = (i: number) => {
    const c = filtered[i];
    if (!c) return;
    setOpen(false);
    c.run();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[15vh]" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border/60 px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); runAt(idx); }
            }}
            placeholder="Поиск команд и разделов…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
          {filtered.map((c, i) => (
            <button
              key={c.label}
              onMouseEnter={() => setIdx(i)}
              onClick={() => runAt(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${i === idx ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
            >
              <c.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{c.label}</span>
              {c.hint && <span className="text-xs text-muted-foreground">{c.hint}</span>}
              {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
