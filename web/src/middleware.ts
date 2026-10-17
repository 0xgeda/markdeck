import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for API, static assets, and files with an extension
  matcher: ['/((?!api|_next|_vercel|opengraph-image|sitemap.xml|robots.txt|icon.svg|.*\\..*).*)'],
};
