'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <SyntaxHighlighter
      language={language || 'text'}
      style={oneDark}
      customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8em' }}
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  );
}
