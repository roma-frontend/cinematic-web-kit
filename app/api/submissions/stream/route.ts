import { getCurrentUser } from '@/lib/auth';
import { listSitesForUser } from '@/lib/sites';
import { onSubmission } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-Sent Events stream of live form submissions for the signed-in user's
// sites. The dashboard subscribes and refreshes when a new lead arrives — no
// polling, no external service. Filtered to sites the user owns.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const ownedSiteIds = new Set(listSitesForUser(user.id).map((s) => s.id));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          /* stream already closed */
        }
      };

      // Initial comment + retry hint so the browser reconnects gracefully.
      send(`retry: 5000\n: connected\n\n`);

      const unsub = onSubmission((evt) => {
        if (!ownedSiteIds.has(evt.siteId)) return; // only the user's sites
        send(`event: submission\ndata: ${JSON.stringify(evt)}\n\n`);
      });

      // Heartbeat keeps proxies (Fly/Cloudflare) from closing an idle stream.
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);

      const close = () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
