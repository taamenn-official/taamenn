import { useRef, type RefObject } from 'react';
import { gsap, useGSAP } from './gsapRuntime';
import { EASE, TRAVEL, compact } from './tokens';
import { isCompactViewport, prefersReducedMotion } from './prefersReduced';
import { consumeHomeReveal } from './revealState';

const CLEAR = 'opacity,transform';

function pick(root: HTMLElement | null, selector: string): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

/**
 * Home entrance.
 *
 * Greeting, next match, then the widget grid. Travel stays short so Home
 * is usable immediately. Later visits use the same small fade.
 *
 * Only `opacity` and transforms are animated, and nothing is made
 * `visibility: hidden`, so the actions stay clickable the whole time.
 */
export function useHomeEntrance(root: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const el = root.current;
    if (!el) return;

    const reveal = consumeHomeReveal();
    const compactViewport = isCompactViewport();
    const scale = (distance: number) => (compactViewport ? compact(distance) : distance);

    const greeting = pick(el, '[data-ta-motion="greeting"]');
    const next = pick(el, '[data-ta-motion="next"]');
    const widgets = pick(el, '[data-ta-motion="widgets"]');
    const groups = [...greeting, ...next, ...widgets];

    if (prefersReducedMotion()) {
      if (groups.length) {
        gsap.fromTo(groups, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'none', clearProps: 'opacity' });
      }
      return;
    }

    const tl = gsap.timeline();

    const steps: Array<[HTMLElement[], number, number]> = compactViewport
      ? [[greeting, 0, 4], [next, 0.04, 4], [widgets, 0.08, 4]]
      : reveal === 'light'
        ? [[greeting, 0, 8], [next, 0.06, 8], [widgets, 0.1, 6]]
        : [[greeting, 0, 8], [next, 0.08, 8], [widgets, 0.14, 6]];
    for (const [nodes, at, travel] of steps) {
      if (!nodes.length) continue;
      tl.from(nodes, {
        opacity: 0,
        y: scale(travel),
        duration: compactViewport ? 0.16 : 0.28,
        ease: EASE.entrance,
        stagger: 0,
        clearProps: CLEAR,
      }, at);
    }
  }, { scope: root });
}

/**
 * Archive previews arrive after the entrance timeline, so they get their own
 * short stagger the first time they render.
 */
export function useHomeMatchReveal(root: RefObject<HTMLElement | null>, count: number) {
  const played = useRef(false);

  useGSAP(() => {
    if (played.current || count === 0) return;
    const cards = pick(root.current, '.home-match-list > *');
    if (!cards.length) return;
    played.current = true;

    if (prefersReducedMotion()) {
      gsap.fromTo(cards, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'none', clearProps: 'opacity' });
      return;
    }
    const compactViewport = isCompactViewport();
    gsap.from(cards, {
      opacity: 0,
      y: compactViewport ? 4 : TRAVEL.card,
      duration: compactViewport ? 0.18 : 0.4,
      ease: EASE.entrance,
      stagger: compactViewport ? 0.03 : 0.06,
      clearProps: CLEAR,
    });
  }, { dependencies: [count], scope: root });
}
