/**
 * URL-prefix determines public site language (matches BaseLayout html lang).
 * Extend when adding locales, e.g. `/es` for Spanish.
 */
export type SiteLocale = 'sv' | 'en' | 'es';

export function getSiteLocale(pathname: string): SiteLocale {
  if (pathname.startsWith('/en')) return 'en';
  if (pathname.startsWith('/es')) return 'es';
  return 'sv';
}
