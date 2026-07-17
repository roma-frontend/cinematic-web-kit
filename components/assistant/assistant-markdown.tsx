'use client';

import { useState, lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Loader2 } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

const LazyCodeBlock = lazy(() => import('./code-block'));
const LazyMermaidBlock = lazy(() => import('./mermaid-block'));

function CodeFallback() {
  return (
    <div className="my-2 flex items-center justify-center rounded-lg border border-border/50 bg-muted/30 py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

function CodeWrapper({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const success = await copyToClipboard(children);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-border/50">
      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-muted"
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <Suspense fallback={<CodeFallback />}>
        {language === 'mermaid' ? (
          <LazyMermaidBlock chart={children} />
        ) : (
          <LazyCodeBlock language={language} code={children} />
        )}
      </Suspense>
    </div>
  );
}

export function AssistantMarkdown({ content, onNavigate }: { content: string; onNavigate?: (route: string) => void }) {
  const isInternal = (href?: string) => Boolean(href && /^\/(?!\/)/.test(href));
  return (
    <div className="assistant-md space-y-2 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ children, href }) =>
            isInternal(href) && onNavigate ? (
              <button type="button" onClick={() => onNavigate(href!)}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80">
                {children}
              </button>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:opacity-80">
                {children}
              </a>
            ),
          ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5 marker:text-primary/70">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5 marker:text-primary/70">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="mt-2 text-base font-bold tracking-tight">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-2 text-sm font-bold tracking-tight">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-2 text-sm font-semibold">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 text-muted-foreground">{children}</blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const text = String(children).replace(/\n$/, '');
            const isBlock = match || text.includes('\n');
            if (isBlock) {
              return <CodeWrapper language={match ? match[1] : ''}>{text}</CodeWrapper>;
            }
            const inlineText = String(children);
            if (onNavigate && /^\/[A-Za-z0-9/_-]*$/.test(inlineText) && inlineText.length > 1) {
              return (
                <button type="button" onClick={() => onNavigate(inlineText)}
                  className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.8em] text-primary underline-offset-2 hover:underline">
                  {inlineText}
                </button>
              );
            }
            return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em]" {...props}>{children}</code>;
          },
          hr: () => <hr className="my-3 border-border/60" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/70 shadow-sm">
              <table className="w-full border-collapse text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-primary/10 text-foreground">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-border/70 px-3 py-2 font-semibold tracking-wide">{children}</th>
          ),
          tr: ({ children }) => <tr className="border-b border-border/40 last:border-0 even:bg-muted/40">{children}</tr>,
          td: ({ children }) => <td className="px-3 py-2 align-top text-foreground/90">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
