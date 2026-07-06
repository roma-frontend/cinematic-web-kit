import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireStaff, forbidden } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';
// This route shells out to the media pipeline (ffmpeg + optional muapi.ai call
// using the server's MUAPI_KEY). It is intended for LOCAL/dev use — do not
// expose it publicly without auth. Inputs are passed as an argv array (never a
// shell string), so there is no command injection.
//
// The response is a *stream* of newline-delimited JSON (NDJSON). Each line is
// one event so the client can render ffmpeg/generation logs live:
//   {"type":"log","line":"[optimize] hero.webm (VP9, CRF 34)"}
//   {"type":"done","entry":{...}}          ← final success, carries the entry
//   {"type":"error","error":"..."}         ← failure, carries a message

const SECTIONS = ['hero', 'background', 'card'] as const;
type Section = (typeof SECTIONS)[number];

interface GenerateBody {
  prompt?: string;
  from?: string;
  section?: Section;
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaHref?: string;
  aspect?: string;
  slug?: string;
  duration?: number;
  style?: string;
  negative?: string;
}

function argsFrom(body: GenerateBody): string[] {
  const a: string[] = [];
  const push = (flag: string, val?: string | number) => {
    if (val === undefined || val === null || val === '') return;
    a.push(flag, String(val));
  };
  push('--prompt', body.prompt?.trim());
  push('--from', body.from?.trim());
  push('--section', SECTIONS.includes(body.section as Section) ? body.section : 'card');
  push('--title', body.title?.trim());
  push('--subtitle', body.subtitle?.trim());
  push('--cta', body.cta?.trim());
  push('--ctaHref', body.ctaHref?.trim());
  push('--aspect', body.aspect?.trim());
  push('--slug', body.slug?.trim());
  push('--duration', body.duration);
  push('--style', body.style?.trim());
  push('--negative', body.negative?.trim());
  return a;
}

export async function POST(request: Request) {
  // Spawns the media pipeline and spends the server's MUAPI credits — staff only.
  const user = await requireStaff();
  if (!user) return forbidden();
  const t = apiErrors(await getLocale());
  // Each run is a long ffmpeg/muapi job — cap runs per user, not per IP.
  if (!rateLimit(`generate:${user.id}`, 5)) {
    return NextResponse.json({ error: t.tooManyGenerations }, { status: 429 });
  }
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.prompt?.trim() && !body.from?.trim()) {
    return NextResponse.json({ error: 'Provide a "prompt" (to generate) or "from" (local file).' }, { status: 400 });
  }

  const root = process.cwd();
  const script = path.join(root, 'scripts', 'media-pipeline', 'run.mjs');
  const args = [script, ...argsFrom(body)];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const child = spawn(process.execPath, args, {
        cwd: root,
        env: process.env,
        timeout: 1000 * 60 * 30,
      });

      // Buffer partial lines from each stream so we emit clean, whole log lines.
      let outBuf = '';
      let errBuf = '';
      const flush = (chunk: string, which: 'stdout' | 'stderr') => {
        let buf = which === 'stdout' ? outBuf + chunk : errBuf + chunk;
        let idx: number;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).replace(/\r$/, '');
          buf = buf.slice(idx + 1);
          send({ type: 'log', line, stream: which });
        }
        if (which === 'stdout') outBuf = buf;
        else errBuf = buf;
      };

      child.stdout.on('data', (d: Buffer) => flush(d.toString(), 'stdout'));
      child.stderr.on('data', (d: Buffer) => flush(d.toString(), 'stderr'));

      child.on('error', (err) => {
        send({ type: 'error', error: err.message });
        close();
      });

      child.on('close', async (code) => {
        // Emit any trailing partial lines.
        if (outBuf.trim()) send({ type: 'log', line: outBuf.replace(/\r$/, ''), stream: 'stdout' });
        if (errBuf.trim()) send({ type: 'log', line: errBuf.replace(/\r$/, ''), stream: 'stderr' });

        if (code !== 0) {
          send({ type: 'error', error: `Pipeline exited with code ${code ?? 'unknown'}` });
          close();
          return;
        }

        // Return the freshly written entry: prefer the one matching this slug/
        // title, else fall back to the last item.
        let entry: unknown = null;
        try {
          const data = JSON.parse(await readFile(path.join(root, 'data', 'media.json'), 'utf8'));
          if (Array.isArray(data) && data.length) {
            const wantTitle = (body.title || body.prompt || '').trim();
            entry =
              data.find(
                (m: { title?: string }) => wantTitle && m.title === wantTitle,
              ) ?? data[data.length - 1];
          }
        } catch {
          /* ignore */
        }

        send({ type: 'done', entry });
        close();
      });

      // If the client disconnects, kill the child process.
      request.signal.addEventListener('abort', () => {
        child.kill();
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
