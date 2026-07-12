'use client';

import * as Sentry from '@sentry/nextjs';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracked = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);

function deviceClass() {
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/** Sends real-user Web Vitals with route and device context when Sentry is enabled. */
export function VitalsReporter() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    if (!dsn || !tracked.has(metric.name)) return;

    Sentry.captureMessage(`web-vital:${metric.name}`, {
      level: 'info',
      tags: {
        metric: metric.name,
        route: pathname,
        device: deviceClass(),
        rating: metric.rating,
      },
      extra: {
        value: metric.value,
        delta: metric.delta,
        navigationType: metric.navigationType,
        metricId: metric.id,
      },
    });
  });

  return null;
}
