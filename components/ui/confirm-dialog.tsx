'use client';

// Promise-based confirmation dialog replacing window.confirm for destructive
// admin actions. Usage:
//   const { confirm, confirmDialog } = useConfirm();
//   if (!(await confirm({ title: '...', tone: 'danger' }))) return;
//   ...render {confirmDialog} once at the component root.

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { ui } from '@/lib/ui-dict';

export type ConfirmTone = 'danger' | 'warning' | 'neutral';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

const TONE_META: Record<ConfirmTone, {
  Icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  confirmVariant: 'destructive' | 'default';
}> = {
  danger: { Icon: Trash2, iconCls: 'bg-red-500/10 text-red-500', confirmVariant: 'destructive' },
  warning: { Icon: AlertTriangle, iconCls: 'bg-amber-500/10 text-amber-500', confirmVariant: 'destructive' },
  neutral: { Icon: ShieldQuestion, iconCls: 'bg-primary/10 text-primary', confirmVariant: 'default' },
};

function ConfirmPanel({ opts, onClose }: { opts: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const { Icon, iconCls, confirmVariant } = TONE_META[opts.tone ?? 'danger'];
  const t = ui(useLocale().locale);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => onClose(false)}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-label={opts.title}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug">{opts.title}</h2>
            {opts.description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{opts.description}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onClose(false)} autoFocus>
            {opts.cancelLabel ?? t.actions.cancel}
          </Button>
          <Button variant={confirmVariant} onClick={() => onClose(true)}>
            {opts.confirmLabel ?? t.actions.confirm}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Confirmation state + element for one component tree. */
export function useConfirm(): {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  confirmDialog: React.ReactNode;
} {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const close = useCallback((ok: boolean) => {
    setState((s) => { s?.resolve(ok); return null; });
  }, []);

  const confirmDialog = (
    <AnimatePresence>
      {state && <ConfirmPanel opts={state.opts} onClose={close} />}
    </AnimatePresence>
  );

  return { confirm, confirmDialog };
}
