import { useEffect, useRef, type RefObject } from 'react';
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
 * Kept so navigation geometry still resolves in physical coordinates.
 * The active state is the lime icon and label, so this marker stays invisible.
 * Physical coordinates stay in viewport space so RTL does not mirror them.
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

  useEffect(() => {
    let frame = 0;
    let sidebarTimer = 0;
    let introTimer = 0;

    const place = (animate: boolean) => {
      const nav = navRef.current;
      const el = pill.current;
      if (!nav || !el) return;

      const active = nav.querySelector<HTMLElement>('.is-active');
      if (!active || !active.offsetParent) {
        nav.classList.remove('has-nav-indicator');
        el.style.opacity = '0';
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const itemBox = active.getBoundingClientRect();
      const navStyle = getComputedStyle(nav);
      // Absolute children sit against the padding box, so borders are removed
      // here rather than assuming offsetLeft/offsetTop. Works in RTL too.
      const x = itemBox.left - navBox.left - parseFloat(navStyle.borderLeftWidth || '0');
      const y = itemBox.top - navBox.top - parseFloat(navStyle.borderTopWidth || '0');

      nav.classList.remove('has-nav-indicator');
      const reduce = !animate || prefersReducedMotion();
      if (reduce) el.style.transition = 'none';
      el.style.width = '0px';
      el.style.height = '0px';
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.background = 'transparent';
      el.style.boxShadow = 'none';
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      if (reduce) {
        requestAnimationFrame(() => {
          if (pill.current) pill.current.style.transition = '';
        });
      }
    };

    if (!settled.current) {
      settled.current = true;
      place(false);
    } else {
      place(true);
      if (pill.current) pill.current.style.opacity = '0';
      // The sidebar width transition finishes after this effect, so re-measure.
      sidebarTimer = window.setTimeout(() => place(false), 340);
    }

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
      window.clearTimeout(sidebarTimer);
      window.clearTimeout(introTimer);
    };
    // watch values are geometry inputs, not a live list identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, introDelay, navRef, ...watch]);

  return <span ref={pill} className={`nav-active-indicator ${className}`.trim()} aria-hidden="true" />;
}
