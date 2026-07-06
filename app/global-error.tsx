'use client';

// Global error boundary — catches errors thrown in the root layout itself.
// Must render its own <html>/<body> because the root layout has failed.

import { useEffect } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            padding: 16,
            background: '#0a0a0a',
            color: '#fafafa',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              height: 96,
              width: 96,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              background: 'rgba(220,38,38,0.15)',
            }}
          >
            <AlertOctagon style={{ height: 48, width: 48, color: '#f87171' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Критическая ошибка</h1>
            <p style={{ maxWidth: 520, color: '#a1a1aa', marginTop: 8 }}>
              Приложение не смогло загрузиться. Пожалуйста, обновите страницу.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#71717a', marginTop: 16, fontFamily: 'monospace' }}>
                Код: {error.digest}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                background: '#fafafa',
                color: '#0a0a0a',
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RefreshCw style={{ height: 16, width: 16 }} />
              Обновить
            </button>
            {/* global-error replaces the whole app shell, so the router may be
                broken — a plain <a> forcing a full reload is the safe way home. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                border: '1px solid #3f3f46',
                color: '#fafafa',
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <Home style={{ height: 16, width: 16 }} />
              На главную
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
