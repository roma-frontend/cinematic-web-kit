'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

// Client widget for Cloudflare Turnstile. Renders nothing unless
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so forms stay clean until you enable
// it. On success it writes the token into a hidden input named `cf-turnstile-response`
// (Cloudflare's convention) AND calls onVerify, so it works with both plain
// <form> POSTs and controlled React forms.

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** True when the public site key is present (widget will render). */
export function turnstileConfigured(): boolean {
  return Boolean(SITE_KEY);
}

export function Turnstile({
  onVerify,
  theme = 'auto',
  className,
}: {
  onVerify?: (token: string) => void;
  theme?: 'auto' | 'light' | 'dark';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const tryRender = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        theme,
        callback: (token: string) => onVerify?.(token),
      });
    };

    tryRender();
    // Script may load after mount — poll briefly until turnstile is available.
    const t = setInterval(() => {
      if (window.turnstile && !widgetId.current) tryRender();
      else if (widgetId.current) clearInterval(t);
    }, 300);

    return () => {
      cancelled = true;
      clearInterval(t);
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [onVerify, theme]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      {/* Cloudflare injects a hidden input named cf-turnstile-response inside this div,
          so a native <form> POST carries the token automatically. */}
      <div ref={ref} className={className} />
    </>
  );
}
