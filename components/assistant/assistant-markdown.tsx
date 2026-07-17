'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { MermaidBlock } from './mermaid-block';

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  if (language === 'mermaid') {
    return <MermaidBlock chart={children} />;
  }

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
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8em' }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
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
              return <CodeBlock language={match ? match[1] : ''}>{text}</CodeBlock>;
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
