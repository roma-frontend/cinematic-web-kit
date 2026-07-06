// Twitter card image — reuses the Open Graph renderer, but declares the route
// config literally (Turbopack must statically parse these).
import OpengraphImage from './opengraph-image';
import { SITE_NAME, DEFAULT_LOCALE } from '@/lib/seo';
import { ui } from '@/lib/ui-dict';

export const runtime = 'nodejs';
export const alt = `${SITE_NAME} — ${ui(DEFAULT_LOCALE).metaTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default OpengraphImage;
