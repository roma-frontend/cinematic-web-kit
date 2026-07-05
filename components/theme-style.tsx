import { getTheme, themeCss, type Theme } from '@/lib/themes';

/**
 * Applies a theme's palette / radius / display font by injecting a scoped
 * <style> with `:root` and `.dark` overrides. Rendered inside the page body so
 * it wins over the defaults in globals.css. Server component → no flash.
 *
 * Pass either a resolved `theme` or a theme `id`.
 */
export function ThemeStyle({ theme, id }: { theme?: Theme; id?: string }) {
  const resolved = theme ?? getTheme(id ?? 'modern-clean');
  return <style dangerouslySetInnerHTML={{ __html: themeCss(resolved) }} />;
}
