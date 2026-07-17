'use client';

import { useEffect, useRef, useState } from 'react';

export function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        const { svg: rendered } = await mermaid.render(`mermaid-${Date.now()}`, chart);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Render error');
      }
    })();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="my-2 overflow-hidden rounded-lg border border-border/50">
        <div className="bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">mermaid</div>
        <pre className="overflow-x-auto bg-muted/30 p-3 text-xs text-muted-foreground">{chart}</pre>
        <p className="border-t border-border/50 bg-red-500/5 px-3 py-1.5 text-[11px] text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border/50">
      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span>mermaid</span>
      </div>
      <div ref={ref} className="flex justify-center bg-card/60 p-4" dangerouslySetInnerHTML={{ __html: svg || '<span class=&quot;text-xs text-muted-foreground&quot;>Rendering...</span>' }} />
    </div>
  );
}
