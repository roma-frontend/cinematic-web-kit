import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Lightweight RAG over the project's internal docs so the STAFF assistant can
// answer ops questions ("how do I connect the domain / set up email / the free
// integrations") from the authoritative source instead of guessing. The corpus
// is tiny (~17KB), so we use deterministic lexical retrieval (heading-based
// chunks + multilingual keyword aliases) — no embeddings/vector store needed.
//
// These docs describe PLATFORM operations (Fly secrets, DNS, providers), so
// grounding is gated to staff in the API route; it is never shown to customers.

export interface DocSource {
  id: string;
  file: string;
  /** Human title shown in citations. */
  title: string;
  /** Multilingual aliases (ru/en/hy + technical terms) folded into matching. */
  keywords: string;
}

const DOCS: DocSource[] = [
  {
    id: 'connect-domain',
    file: 'CONNECT-DOMAIN.md',
    title: 'Подключение домена',
    keywords: 'домен domain դոմեն dns cname aaaa apex субдомен поддомен subdomain fly certs tls ssl сертификат cloudflare регистратор www',
  },
  {
    id: 'email-setup',
    file: 'EMAIL_SETUP.md',
    title: 'Настройка почты',
    keywords: 'почта email письма mail նամակ resend brevo smtp spf dkim mx routing отправка приём info support sales провайдер',
  },
  {
    id: 'integrations',
    file: 'INTEGRATIONS.md',
    title: 'Бесплатные интеграции',
    keywords: 'интеграции integrations ինտեգրացիա groq llm posthog аналитика analytics turnstile captcha workers ai embeddings sentry мониторинг sse realtime',
  },
  {
    id: 'onboarding-tours',
    file: 'ONBOARDING-TOURS.md',
    title: 'Onboarding-туры',
    keywords: 'тур tour туры onboarding онбординг շրջագայություն guide гайд spotlight walkthrough подсказки steps шаги',
  },
];

export interface DocChunk {
  docId: string;
  docTitle: string;
  /** Section heading (or the doc title for the preamble). */
  section: string;
  text: string;
  keywords: string;
}

export interface DocHit extends DocChunk {
  score: number;
  /** "Doc title — Section" label used for citations. */
  label: string;
}

/** Max characters kept per chunk body (keeps the injected prompt small). */
const CHUNK_MAX = 1200;

// Common ru/en stopwords stripped from queries so they don't create noise.
const STOP = new Set([
  'как','что','где','для','это','или','the','and','how','can','you','your','with',
  'from','что','чтобы','нужно','мне','я','a','an','to','of','in','on','is','do','i',
]);

// Common inflectional endings for Slavic (ru/hy case/number endings) and English
// plural/verb forms. Stripping them lets "почты" match "почта" and "domains"
// match "domain" without pulling in a full NLP stemmer.
const STEM_ENDINGS = [
  'инг','ингс','ед','ер','ерс','ест','с','ес','иес','ид','ли',
  'ами','ями','ах','ях','ам','ям','ов','ев','ей','ой','ый','ий','ая','яя',
  'ое','ее','ые','ие','ом','ем','ую','юю','его','ого','ему','ому','ет','ут',
  'ют','ит','ат','ят','ыл','ул','ил','ал','ы','и','а','я','о','е','у','ю',
];

/** Remove a common inflectional ending if the remaining stem is still useful. */
export function stemWord(word: string): string {
  for (const end of STEM_ENDINGS) {
    if (word.endsWith(end) && word.length - end.length >= 3) return word.slice(0, -end.length);
  }
  return word;
}

/** Split text into lowercased word tokens (unicode-aware), minus stopwords. */
export function tokenize(input: string): string[] {
  const raw = (input || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return raw.filter((t) => t.length >= 2 && !STOP.has(t));
}

/**
 * Split a markdown doc into chunks by heading. Everything before the first
 * heading becomes a preamble chunk titled with the doc title.
 */
export function chunkMarkdown(doc: DocSource, markdown: string): DocChunk[] {
  const lines = markdown.split(/\r?\n/);
  const chunks: DocChunk[] = [];
  let section = doc.title;
  let body: string[] = [];
  const flush = () => {
    const text = body.join('\n').trim().slice(0, CHUNK_MAX);
    if (text) chunks.push({ docId: doc.id, docTitle: doc.title, section, text, keywords: doc.keywords });
    body = [];
  };
  for (const line of lines) {
    const h = /^#{1,6}\s+(.*\S)\s*$/.exec(line);
    if (h) {
      flush();
      section = h[1].replace(/[#*`]/g, '').trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return chunks;
}

/**
 * Score chunks against a query and return the top-k above a relevance floor.
 * Pure (no fs) so it can be unit-tested with an in-memory corpus. Section-title
 * and keyword-alias hits weigh more than body hits, which lets a Russian query
 * match an English/technical doc via its multilingual keyword list.
 */
export function searchChunks(chunks: DocChunk[], query: string, k = 3): DocHit[] {
  const tokens = Array.from(new Set(tokenize(query)));
  if (tokens.length === 0) return [];
  const hits: DocHit[] = [];
  for (const c of chunks) {
    const titleHay = c.section.toLowerCase();
    const keyHay = c.keywords.toLowerCase();
    const bodyHay = c.text.toLowerCase();
    // Build stemmed vocabularies for inflection-tolerant matching.
    const titleStems = new Set(titleHay.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2).map(stemWord));
    const keyStems = new Set(keyHay.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2).map(stemWord));
    const bodyStems = new Set(bodyHay.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2).map(stemWord));
    let score = 0;
    for (const tk of tokens) {
      if (titleHay.includes(tk)) score += 3;
      else if (titleStems.has(stemWord(tk))) score += 2;
      if (keyHay.includes(tk)) score += 3;
      else if (keyStems.has(stemWord(tk))) score += 2;
      if (bodyHay.includes(tk)) score += 1;
      else if (bodyStems.has(stemWord(tk))) score += 1;
    }
    if (score > 0) hits.push({ ...c, score, label: `${c.docTitle} — ${c.section}` });
  }
  // Require a real signal (one strong hit, or several body hits) to avoid noise.
  return hits
    .filter((h) => h.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ── Index (lazily built from disk, cached for the process lifetime) ──────────

let cachedIndex: DocChunk[] | null = null;

function buildIndex(): DocChunk[] {
  const all: DocChunk[] = [];
  for (const doc of DOCS) {
    try {
      const md = readFileSync(join(process.cwd(), 'docs', doc.file), 'utf8');
      all.push(...chunkMarkdown(doc, md));
    } catch {
      /* a missing doc simply contributes nothing */
    }
  }
  return all;
}

export function getDocIndex(): DocChunk[] {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

/** Retrieve the most relevant doc chunks for a query (empty when none pass). */
export function retrieveDocs(query: string, k = 3): DocHit[] {
  return searchChunks(getDocIndex(), query, k);
}

/** Build the system-prompt KNOWLEDGE BASE block from retrieved hits. */
export function formatKnowledgeSection(hits: DocHit[]): string {
  if (!hits.length) return '';
  const blocks = hits
    .map((h, i) => `[${i + 1}] SOURCE: ${h.label}\n${h.text}`)
    .join('\n\n');
  return `
KNOWLEDGE BASE (authoritative internal docs — the ground truth for setup/ops
questions). Prefer these facts over your own assumptions; if they don't cover
the question, say so instead of inventing steps. Do NOT paste raw secrets/keys.
${blocks}`;
}

/** De-duplicated citation labels for the client "Sources" footer. */
export function sourceLabels(hits: DocHit[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hits) {
    if (seen.has(h.label)) continue;
    seen.add(h.label);
    out.push(h.label);
  }
  return out;
}
