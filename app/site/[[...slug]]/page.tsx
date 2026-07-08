import { notFound } from 'next/navigation';

// The file-based demo document (data/builder.json) is no longer exposed under
// the public /site slug. It now serves a single purpose: the starter template
// that seeds a tenant's first site (see lib/sites.ts → createSite). Any direct
// visit to /site* returns 404 so the demo is never shown anywhere.
export const dynamic = 'force-dynamic';

export default function SitePage() {
  notFound();
}
