/** Public documents worth listing. Share tokens and API routes are not public pages. */
export const PUBLIC_ORIGIN = 'https://taamenn.com';

export const PUBLIC_SITEMAP_PATHS = ['/', '/acquisition', '/privacy', '/terms'] as const;

export function legalDocumentForPath(pathname: string): 'privacy' | 'terms' | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  return null;
}

export function publicPageUrl(pathname: string): string {
  if (pathname === '/') return `${PUBLIC_ORIGIN}/`;
  return `${PUBLIC_ORIGIN}${pathname}`;
}
