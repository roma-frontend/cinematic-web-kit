'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Code, Eye, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Artifact {
  id: string;
  type: 'html' | 'react' | 'code' | 'markdown';
  title: string;
  content: string;
  language?: string;
}

interface ArtifactsCanvasProps {
  artifact: Artifact | null;
  onClose: () => void;
  dict: {
    close: string;
    preview: string;
    code: string;
    copy: string;
    copied: string;
  };
}

export function ArtifactsCanvas({ artifact, onClose, dict }: ArtifactsCanvasProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!artifact || viewMode !== 'preview' || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    if (artifact.type === 'html') {
      doc.open();
      doc.write(artifact.content);
      doc.close();
    } else if (artifact.type === 'react') {
      // Wrap React component in HTML with React CDN
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${artifact.content}
    
    // Try to render the component
    const root = ReactDOM.createRoot(document.getElementById('root'));
    if (typeof App !== 'undefined') {
      root.render(<App />);
    } else if (typeof Component !== 'undefined') {
      root.render(<Component />);
    } else {
      document.body.innerHTML = '<p style="color: #666;">Component not found. Define App or Component.</p>';
    }
  </script>
</body>
</html>`;
      doc.open();
      doc.write(html);
      doc.close();
    } else if (artifact.type === 'markdown') {
      // Simple markdown to HTML conversion
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
    code { 
      background: #f4f4f4; 
      padding: 2px 6px; 
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre { 
      background: #f4f4f4; 
      padding: 16px; 
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 16px;
      color: #666;
    }
  </style>
</head>
<body>
  ${markdownToHtml(artifact.content)}
</body>
</html>`;
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      // Code - just display with syntax highlighting
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <style>
    body { margin: 0; padding: 20px; background: #f8f8f8; }
    pre { margin: 0; }
  </style>
</head>
<body>
  <pre><code class="language-${artifact.language || 'plaintext'}">${escapeHtml(artifact.content)}</code></pre>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>`;
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [artifact, viewMode]);

  const handleCopy = async () => {
    if (!artifact) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(artifact.content);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = artifact.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!artifact) return null;

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Code className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{artifact.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                viewMode === 'preview'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Eye className="h-3 w-3" />
              {dict.preview}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                viewMode === 'code'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code className="h-3 w-3" />
              {dict.code}
            </button>
          </div>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={dict.copy}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={dict.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'preview' ? (
          <iframe
            ref={iframeRef}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title={artifact.title}
          />
        ) : (
          <div className="h-full overflow-auto bg-muted/20 p-4">
            <pre className="text-sm">
              <code className="font-mono text-foreground/90">{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(md: string): string {
  // Simple markdown conversion
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\n/gim, '<br>');
}
