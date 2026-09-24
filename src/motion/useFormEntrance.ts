import { useRef, type RefObject } from 'react';
import { gsap, useGSAP } from './gsapRuntime';
import { EASE, MOTION, TRAVEL } from './tokens';
import { isCompactViewport, prefersReducedMotion } from './prefersReduced';

/**
 * A restrained entrance for panels that appear inside a page rather than as a
 * route: the panel settles, then its rows follow. Deliberately lighter than the
 * Home reveal so authenticated flows stay quick.
 */
export function useFormEntrance<T extends HTMLElement>(): RefObject<T | null> {
  const root = useRef<T | null>(null);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'none', clearProps: 'opacity' });
      return;
    }

    const compactViewport = isCompactViewport();
    const travel = compactViewport ? 4 : TRAVEL.page;
    const rows = el.querySelectorAll<HTMLElement>(':scope > *');
    const tl = gsap.timeline();
    tl.from(el, {
      opacity: 0,
      y: travel,
      duration: compactViewport ? 0.18 : MOTION.panel,
      ease: EASE.entrance,
      clearProps: 'opacity,transform',
    }, 0);
    if (compactViewport) return;
    if (rows.length > 1) {
      tl.from(rows, {
        opacity: 0,
        y: Math.round(travel * 0.6),
        duration: MOTION.panel,
        ease: EASE.entrance,
        stagger: 0.05,
        clearProps: 'opacity,transform',
      }, 0.08);
    }
  }, { scope: root });

  return root;
}
