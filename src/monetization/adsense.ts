/**
 * Official AdSense loader. Isolated from analytics.
 * Inserts the Google script only for a validated publisher id, once per document.
 */
import { isPublisherId } from './placements.ts';

export const ADSENSE_SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
export const ADSENSE_SCRIPT_ID = 'taamen-adsense';

export type AdSenseScriptElement = {
  id: string;
  src: string;
  async: boolean;
  crossOrigin: string;
  onerror: (() => void) | null;
};

export type AdSenseDocument = {
  getElementById(id: string): unknown;
  querySelector(selector: string): unknown;
  createElement(tag: string): AdSenseScriptElement;
  head: { appendChild(node: AdSenseScriptElement): void };
};

let started = false;

export function resetAdSenseForTests(): void {
  started = false;
}

export function adsenseScriptUrl(clientId: string): string | null {
  if (!isPublisherId(clientId)) return null;
  return `${ADSENSE_SCRIPT_BASE}?client=${encodeURIComponent(clientId.trim())}`;
}

function documentAlreadyLoadsAdSense(target: AdSenseDocument, src: string): boolean {
  return Boolean(
    target.getElementById(ADSENSE_SCRIPT_ID)
    || target.querySelector(`script[src="${src}"]`)
    || target.querySelector(`script[src^="${ADSENSE_SCRIPT_BASE}"]`),
  );
}

/** Returns true only when this call inserted the script. */
export function ensureAdSenseScript(clientId: string | undefined, doc?: AdSenseDocument): boolean {
  const src = clientId ? adsenseScriptUrl(clientId) : null;
  if (!src) return false;
  const target = doc ?? (typeof document === 'undefined' ? undefined : document as unknown as AdSenseDocument);
  if (!target) return false;
  if (started || documentAlreadyLoadsAdSense(target, src)) {
    started = true;
    return false;
  }
  try {
    const script = target.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      /* Google being blocked or offline must not surface into the product. */
    };
    target.head.appendChild(script);
    started = true;
    return true;
  } catch {
    return false;
  }
}

/** One push per mounted unit. A thrown or blocked push must not break the page. */
export function pushAdSenseUnit(target?: { adsbygoogle?: unknown[] }): boolean {
  const win = target ?? (globalThis as { adsbygoogle?: unknown[] });
  try {
    win.adsbygoogle = win.adsbygoogle || [];
    win.adsbygoogle.push({});
    return true;
  } catch {
    return false;
  }
}
