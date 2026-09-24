import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from './gsapRuntime';
import { EASE, MOTION, TRAVEL, compact } from './tokens';
import { isCompactViewport, prefersReducedMotion } from './prefersReduced';

export type OverlayKind = 'modal' | 'drawer' | 'sheet';

type Vars = Parameters<typeof gsap.to>[1];

function travel(distance: number): number {
  return isCompactViewport() ? compact(distance) : distance;
}

/** Panels settle in from their own edge; the backdrop only ever fades. */
function panelFrom(kind: OverlayKind): Vars {
  const compact = isCompactViewport();
  if (kind === 'drawer') {
    const rtl = document.documentElement.dir === 'rtl';
    return compact ? { opacity: 0, x: rtl ? -8 : 8 } : { opacity: 0, xPercent: rtl ? -7 : 7 };
  }
  if (kind === 'sheet') return { opacity: 0, y: compact ? 4 : travel(TRAVEL.sheet) };
  return { opacity: 0, y: compact ? 4 : travel(TRAVEL.modal), scale: compact ? 1 : 0.985 };
}

function panelTo(kind: OverlayKind): Vars {
  const duration = isCompactViewport() ? 0.2 : MOTION.panel;
  if (kind === 'drawer') return { opacity: 1, x: 0, xPercent: 0, duration, ease: EASE.entrance };
  if (kind === 'sheet') return { opacity: 1, y: 0, duration, ease: EASE.entrance };
  return { opacity: 1, y: 0, scale: 1, duration, ease: EASE.entrance };
}

/**
 * Open and close motion for the existing overlays.
 *
 * Overlays are mounted conditionally by their parent, so the close animation
 * runs first and `onClose` is called when it finishes. Escape is handled here
 * unless the caller opts out (blocking consent).
 */
export function useOverlayPresence<B extends HTMLElement = HTMLElement, P extends HTMLElement = HTMLElement>(
  kind: OverlayKind,
  onClose: () => void,
  /** For overlays that stay mounted and render `null` while closed. */
  open = true,
  options: { closeOnEscape?: boolean } = {},
) {
  const backdropRef = useRef<B | null>(null);
  const panelRef = useRef<P | null>(null);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useGSAP(() => {
    if (!open) return;
    closing.current = false;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const reduced = prefersReducedMotion();

    const tl = gsap.timeline();
    if (backdrop) {
      tl.fromTo(backdrop, { opacity: 0 }, {
        opacity: 1,
        duration: reduced ? 0.12 : MOTION.ui,
        ease: reduced ? 'none' : EASE.hover,
        clearProps: 'opacity',
      }, 0);
    }
    if (panel) {
      if (reduced) {
        tl.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none', clearProps: 'opacity' }, 0);
      } else {
        tl.fromTo(panel, panelFrom(kind), { ...panelTo(kind), clearProps: 'opacity,transform' }, kind === 'drawer' ? 0 : 0.04);
      }
    }
  }, { dependencies: [open], revertOnUpdate: true });

  const requestClose = () => {
    // A second close (Escape then the X) must still unmount if the exit tween was killed.
    if (closing.current) {
      onCloseRef.current();
      return;
    }
    const backdrop = backdropRef.current;
    const panel = panelRef.current;

    if (prefersReducedMotion() || (!backdrop && !panel)) {
      onCloseRef.current();
      return;
    }

    closing.current = true;
    const finish = () => onCloseRef.current();
    const tl = gsap.timeline({ onComplete: finish });
    if (panel) tl.to(panel, { ...panelFrom(kind), duration: MOTION.ui, ease: EASE.exit }, 0);
    if (backdrop) tl.to(backdrop, { opacity: 0, duration: MOTION.ui, ease: EASE.exit }, 0);
  };

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const closeOnEscape = options.closeOnEscape !== false;

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeOnEscape]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return { backdropRef, panelRef, requestClose };
}
