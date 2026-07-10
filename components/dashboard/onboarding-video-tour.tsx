'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { useMounted } from '@/hooks/use-mounted';
import { mediaUrl } from '@/lib/media-url';

const COPY = {
  ru: {
    eyebrow: 'Видео-тур',
    title: 'Посмотрите, с чего начать',
    desc: 'Короткий ролик покажет дашборд, быстрый старт, конструктор, публикацию, заявки и подписку.',
    watch: 'Смотреть видео-тур',
    close: 'Закрыть',
  },
  en: {
    eyebrow: 'Video tour',
    title: 'See where to start',
    desc: 'A short video walks through the dashboard, quick start, builder, publishing, leads, and billing.',
    watch: 'Watch video tour',
    close: 'Close',
  },
  hy: {
    eyebrow: 'Վիդեո շրջայց',
    title: 'Տեսեք՝ որտեղից սկսել',
    desc: 'Կարճ հոլովակը ցույց կտա վահանակը, արագ մեկնարկը, կառուցիչը, հրապարակումը, հայտերը և բաժանորդագրությունը։',
    watch: 'Դիտել վիդեո շրջայցը',
    close: 'Փակել',
  },
} as const;

export function OnboardingVideoTour() {
  const { locale } = useLocale();
  const lang = (locale as keyof typeof COPY) in COPY ? (locale as keyof typeof COPY) : 'en';
  const c = COPY[lang];
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const closeRef = useRef<HTMLButtonElement>(null);
  const src = mediaUrl(`/media/onboarding-video/assembled/onboarding_${lang}_light.mp4`);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-card p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <PlayCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {c.eyebrow}
            </p>
            <h2 className="text-base font-bold tracking-tight">{c.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{c.desc}</p>
          </div>
        </div>
        <Button type="button" onClick={() => setOpen(true)} className="mt-4 w-full gap-2 sm:mt-0 sm:w-auto">
          <PlayCircle className="h-4 w-4" /> {c.watch}
        </Button>
      </div>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={c.title}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
              aria-label={c.close}
              title={c.close}
            >
              <X className="h-5 w-5" />
            </button>
            <video src={src} controls autoPlay playsInline className="aspect-video w-full bg-black" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
