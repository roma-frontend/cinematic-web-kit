import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listSitesForUser } from '@/lib/sites';
import { onNotify } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Unified Server-Sent Events stream powering the header notification bell.
// Streams every dashboard-relevant event the signed-in user should hear about:
//  • form submissions + pending member requests on sites they OWN, and
//  • new organization requests (superadmin only).
// Owner-scoped events are filtered to the user's own sites; platform events go
// to superadmins. In-process pub/sub — no external service (see lib/realtime).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const ownedSiteIds = new Set(listSitesForUser(user.id).map((s) => s.id));
  const canSuper = isSuperadmin(user);
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

      send(`retry: 5000\n: connected\n\n`);

      const unsub = onNotify((evt) => {
        const forOwner = evt.siteId ? ownedSiteIds.has(evt.siteId) : false;
        const forSuper = evt.superadmin === true && canSuper;
        if (!forOwner && !forSuper) return;
        send(`event: notify\ndata: ${JSON.stringify(evt)}\n\n`);
      });

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
