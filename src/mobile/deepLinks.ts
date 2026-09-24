import type { RouteId } from '../config/routes.ts';
import { legalDocumentForPath } from '../config/publicRoutes.ts';

const ROUTES: RouteId[] = [
  'home',
  'archive',
  'match-center',
  'historical-match-center',
  'tactical',
  'profile',
  'support',
  'settings',
  'stadiums',
];

const ROUTE_SET = new Set<string>(ROUTES);

export type ParsedDeepLink =
  | { kind: 'route'; route: RouteId }
  | { kind: 'share'; share: 'match' | 'profile'; token: string }
  | { kind: 'acquisition' }
  | { kind: 'legal'; document: 'privacy' | 'terms' }
  | { kind: 'unknown' };

/** Hash route used by the existing shell. Home is explicit so shortcuts stay stable. */
export function getDeepLinkForRoute(route: RouteId): string {
  return `/#${route}`;
}

export function parseAppDeepLink(input: string): ParsedDeepLink {
  let url: URL;
  try {
    url = new URL(input, 'https://taamenn.com');
  } catch {
    return { kind: 'unknown' };
  }
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const share = path.match(/^\/share\/(match|profile)\/([^/]+)$/);
  if (share) {
    return { kind: 'share', share: share[1] as 'match' | 'profile', token: decodeURIComponent(share[2]) };
  }
  if (path === '/acquisition') return { kind: 'acquisition' };
  const legal = legalDocumentForPath(path);
  if (legal) return { kind: 'legal', document: legal };
  const hash = decodeURIComponent(url.hash.replace(/^#/, ''));
  if (hash && ROUTE_SET.has(hash)) return { kind: 'route', route: hash as RouteId };
  if (!hash && (path === '/' || path === '/index.html')) return { kind: 'route', route: 'home' };
  return { kind: 'unknown' };
}
