import { useRef, type RefObject } from 'react';
import { gsap, useGSAP } from './gsapRuntime';
import { EASE, MOTION } from './tokens';
import { prefersReducedMotion } from './prefersReduced';

type NavActiveIndicatorProps = {
  navRef: RefObject<HTMLElement | null>;
  /** Changing this slides the pill to the newly active item. */
  activeKey: string;
  /** Values that change nav geometry without changing the active item. */
  watch?: unknown[];
  /** Holds the first appearance back so it settles after page content. */
  introDelay?: number;
  className?: string;
};

/**
 * One shared pill per navigation. It slides between items instead of each item
 * animating its own highlight, which keeps the active state continuous across
 * routes. Purely decorative: the button keeps the label, focus and semantics.
 */
export default function NavActiveIndicator({
  navRef,
  activeKey,
  watch = [],
  introDelay = 0,
  className = '',
}: NavActiveIndicatorProps) {
  const pill = useRef<HTMLSpanElement>(null);
  const settled = useRef(false);

  useGSAP(() => {
    const place = (animate: boolean) => {
      const nav = navRef.current;
      const el = pill.current;
      if (!nav || !el) return;

      const active = nav.querySelector<HTMLElement>('.is-active');
      if (!active || !active.offsetParent) {
        nav.classList.remove('has-nav-indicator');
        gsap.set(el, { autoAlpha: 0 });
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const itemBox = active.getBoundingClientRect();
      const navStyle = getComputedStyle(nav);
      // Absolute children sit against the padding box, so borders are removed
      // here rather than assuming offsetLeft/offsetTop. Works in RTL too.
      const x = itemBox.left - navBox.left - parseFloat(navStyle.borderLeftWidth || '0');
      const y = itemBox.top - navBox.top - parseFloat(navStyle.borderTopWidth || '0');

      nav.classList.add('has-nav-indicator');
      gsap.set(el, { width: itemBox.width, height: itemBox.height });

      if (animate && !prefersReducedMotion()) {
        gsap.to(el, { x, y, duration: MOTION.ui, ease: EASE.hover, overwrite: 'auto' });
        return;
      }
      gsap.set(el, { x, y });
    };

    if (!settled.current) {
      settled.current = true;
      place(false);
      const el = pill.current;
      if (el) {
        if (prefersReducedMotion()) gsap.set(el, { autoAlpha: 1 });
        else gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: MOTION.ui, delay: introDelay, ease: 'none' });
      }
    } else {
      place(true);
      gsap.set(pill.current, { autoAlpha: 1 });
      // The sidebar width transition finishes after this effect, so re-measure.
      gsap.delayedCall(0.34, () => place(false));
    }

    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(false));
    };
    const onDirection = () => place(false);
    const direction = new MutationObserver(onDirection);
    direction.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      direction.disconnect();
      cancelAnimationFrame(frame);
    };
  }, { dependencies: [activeKey, ...watch] });

  return <span ref={pill} className={`nav-active-indicator ${className}`.trim()} aria-hidden="true" />;
}
