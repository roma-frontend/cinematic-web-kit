// Twitter card image — reuses the Open Graph renderer, but declares the route
// config literally (Turbopack must statically parse these).
import OpengraphImage from './opengraph-image';
import { SITE_NAME } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = `${SITE_NAME} — кинематографичный конструктор сайтов`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default OpengraphImage;
