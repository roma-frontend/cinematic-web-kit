'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renders assistant markdown with GitHub-flavored tables/lists styled like a
// clean printed document (PDF-like): bordered header band, zebra rows, tidy
// lists, code and links. Kept theme-aware via CSS tokens.
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
          code: ({ children }) => {
            const text = String(children);
            if (onNavigate && /^\/[A-Za-z0-9/_-]*$/.test(text) && text.length > 1) {
              return (
                <button type="button" onClick={() => onNavigate(text)}
                  className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.8em] text-primary underline-offset-2 hover:underline">
                  {text}
                </button>
              );
            }
            return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em]">{children}</code>;
          },
          hr: () => <hr className="my-3 border-border/60" />,
          // PDF-like table.
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
