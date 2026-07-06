import { FullPageLoader } from '@/components/ui/loader';
import { getLocale } from '@/lib/i18n';
import { ui } from '@/lib/ui-dict';

// Root-level loading UI — shown during route transitions / server data fetches.
export default async function Loading() {
  const t = ui(await getLocale()).errors;
  return <FullPageLoader message={t.loading} />;
}
