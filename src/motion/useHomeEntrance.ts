import { useRef, type RefObject } from 'react';
import { gsap, useGSAP } from './gsapRuntime';
import { EASE, MOTION, STAGGER, TRAVEL, compact } from './tokens';
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
 * The full reveal runs once, immediately after profile setup: greeting, primary
 * actions, then the icons rising from below, then the cards. Every later visit
 * gets a restrained fade so returning to Home never feels repetitive.
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
    const cta = pick(el, '[data-ta-motion="cta"]');
    const cards = pick(el, '[data-ta-motion="card"]');
    const panel = pick(el, '[data-ta-motion="panel"]');
    const icons = pick(el, '[data-ta-icons] svg');
    const groups = [...greeting, ...cta, ...cards, ...panel];

    if (prefersReducedMotion()) {
      if (groups.length) {
        gsap.fromTo(groups, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'none', clearProps: 'opacity' });
      }
      return;
    }

    const tl = gsap.timeline();

    if (compactViewport) {
      const steps: Array<[HTMLElement[], number]> = [
        [greeting, 0],
        [cta, 0.05],
        [cards, 0.1],
        [panel, 0.16],
      ];
      for (const [nodes, at] of steps) {
        if (!nodes.length) continue;
        tl.from(nodes, {
          opacity: 0,
          y: 4,
          duration: 0.18,
          ease: EASE.entrance,
          stagger: nodes.length > 1 ? 0.03 : 0,
          clearProps: CLEAR,
        }, at);
      }
      return;
    }

    if (reveal === 'light') {
      if (greeting.length) {
        tl.from(greeting, {
          opacity: 0,
          y: scale(12),
          duration: MOTION.panel,
          ease: EASE.entrance,
          stagger: 0.05,
          clearProps: CLEAR,
        }, 0);
      }
      const rest = [...cta, ...cards, ...panel];
      if (rest.length) {
        tl.from(rest, {
          opacity: 0,
          y: scale(12),
          duration: MOTION.panel,
          ease: EASE.entrance,
          stagger: 0.05,
          clearProps: CLEAR,
        }, 0.1);
      }
      return;
    }

    if (greeting.length) {
      tl.from(greeting, {
        opacity: 0,
        y: scale(18),
        duration: MOTION.entrance,
        ease: EASE.entrance,
        stagger: 0.07,
        clearProps: CLEAR,
      }, 0);
    }
    if (cta.length) {
      tl.from(cta, {
        opacity: 0,
        y: scale(TRAVEL.card),
        duration: MOTION.entrance,
        ease: EASE.entrance,
        clearProps: CLEAR,
      }, 0.18);
    }
    // The required reveal: icons rise from below, one shortly after the other.
    if (icons.length) {
      tl.from(icons, {
        opacity: 0,
        y: scale(TRAVEL.icon),
        scale: 0.97,
        duration: MOTION.entrance,
        ease: EASE.entrance,
        stagger: compactViewport ? 0.06 : STAGGER.icons,
        clearProps: CLEAR,
      }, 0.3);
    }
    if (cards.length) {
      tl.from(cards, {
        opacity: 0,
        y: scale(TRAVEL.card),
        duration: 0.5,
        ease: EASE.entrance,
        stagger: compactViewport ? 0.07 : STAGGER.cards,
        clearProps: CLEAR,
      }, 0.36);
    }
    if (panel.length) {
      tl.from(panel, {
        opacity: 0,
        y: scale(TRAVEL.page),
        duration: 0.5,
        ease: EASE.entrance,
        clearProps: CLEAR,
      }, 0.6);
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
