import { describe, it, expect } from 'vitest';
import {
  tokenize, stemWord, chunkMarkdown, searchChunks, formatKnowledgeSection, sourceLabels,
  retrieveDocs, getDocIndex, type DocSource,
} from '@/lib/assistant-rag';

const doc: DocSource = {
  id: 'connect-domain',
  file: 'CONNECT-DOMAIN.md',
  title: 'Подключение домена',
  keywords: 'домен domain դոմեն dns cname fly certs tls',
};

const markdown = `# Подключение домена
Вводный абзац про домен.

## 1. Домен → приложение Fly
Выполни fly certs add example.com и пропиши DNS-записи.

## 3. Почта info@ / support@
Настрой Cloudflare Email Routing для приёма писем.`;

describe('tokenize', () => {
  it('lowercases, splits on non-word chars and drops stopwords/short tokens', () => {
    expect(tokenize('Как подключить DOMAIN к Fly?')).toEqual(['подключить', 'domain', 'fly']);
  });
  it('returns [] for empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('  ??  ')).toEqual([]);
  });
});

describe('stemWord', () => {
  it('strips common Russian inflectional endings', () => {
    expect(stemWord('почты')).toBe('почт');
    expect(stemWord('домены')).toBe('домен');
    expect(stemWord('сертификатов')).toBe('сертификат');
    expect(stemWord('записях')).toBe('запис');
  });

  it('does not over-stem short words', () => {
    expect(stemWord('и')).toBe('и');
    expect(stemWord('to')).toBe('to');
    expect(stemWord('я')).toBe('я');
  });

  it('returns the original word when no ending matches', () => {
    expect(stemWord('fly')).toBe('fly');
    expect(stemWord('cname')).toBe('cname');
    expect(stemWord('domain')).toBe('domain');
  });
});

describe('chunkMarkdown', () => {
  it('splits by heading with a preamble chunk titled by the doc', () => {
    const chunks = chunkMarkdown(doc, markdown);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].section).toBe('Подключение домена');
    expect(chunks[1].section).toBe('1. Домен → приложение Fly');
    expect(chunks[2].section).toContain('Почта');
    // Every chunk carries the doc keywords for cross-lingual matching.
    expect(chunks[0].keywords).toContain('domain');
  });
});

describe('searchChunks', () => {
  const chunks = chunkMarkdown(doc, markdown);
  it('matches an English/technical query via keywords + body', () => {
    const hits = searchChunks(chunks, 'how to add fly certs for my domain');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].label).toContain('Подключение домена');
    expect(hits[0].score).toBeGreaterThanOrEqual(3);
  });
  it('matches a Russian query through the multilingual keyword list', () => {
    const hits = searchChunks(chunks, 'настройка почты и email');
    expect(hits.some((h) => h.section.includes('Почта'))).toBe(true);
  });
  it('returns [] when nothing clears the relevance floor', () => {
    expect(searchChunks(chunks, 'zzz totally unrelated quux')).toEqual([]);
  });
  it('respects the k limit and sorts by score desc', () => {
    const hits = searchChunks(chunks, 'домен dns fly certs почта email', 2);
    expect(hits.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });
});

describe('formatKnowledgeSection & sourceLabels', () => {
  const hits = searchChunks(chunkMarkdown(doc, markdown), 'fly certs domain dns');
  it('builds a KNOWLEDGE BASE block with numbered sources', () => {
    const section = formatKnowledgeSection(hits);
    expect(section).toContain('KNOWLEDGE BASE');
    expect(section).toContain('[1] SOURCE:');
  });
  it('returns empty section and labels when there are no hits', () => {
    expect(formatKnowledgeSection([])).toBe('');
    expect(sourceLabels([])).toEqual([]);
  });
  it('dedupes citation labels', () => {
    const dup = [...hits, ...hits];
    expect(sourceLabels(dup).length).toBe(sourceLabels(hits).length);
  });
});

describe('real doc index', () => {
  it('indexes the on-disk docs and retrieves domain guidance', () => {
    expect(getDocIndex().length).toBeGreaterThan(0);
    const hits = retrieveDocs('как подключить домен и выпустить сертификат');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].docId).toBe('connect-domain');
  });
});
