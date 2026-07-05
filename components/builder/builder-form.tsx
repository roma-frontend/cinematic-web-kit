'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';

// Wraps builder-generated form fields (native <input>/<textarea> with name)
// and submits them to /api/form. Success/error state is shown inline.
export function BuilderForm({
  formId,
  submitText,
  successMsg,
  children,
}: {
  formId: string;
  submitText: string;
  successMsg: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('busy');
    const form = e.currentTarget; // currentTarget is nulled after the handler yields
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, ...data }),
      });
      setStatus(res.ok ? 'done' : 'error');
      if (res.ok) form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm font-medium text-green-600 dark:text-green-400">
        <Check className="h-5 w-5" /> {successMsg}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      {children}
      <Button type="submit" disabled={status === 'busy'} className="gap-2 self-start">
        {status === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitText}
      </Button>
      {status === 'error' && (
        <p className="text-sm text-red-500">Не удалось отправить. Попробуйте ещё раз.</p>
      )}
    </form>
  );
}
