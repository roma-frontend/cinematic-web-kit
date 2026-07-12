export function resolveBuilderRouteSiteId(
  querySiteId: string | null | undefined,
  contextSiteId: string | null | undefined,
): string | null {
  const explicit = (querySiteId ?? '').trim();
  if (explicit) return explicit;

  const fallback = (contextSiteId ?? '').trim();
  return fallback || null;
}
