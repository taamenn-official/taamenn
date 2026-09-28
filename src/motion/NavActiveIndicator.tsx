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
 * A fixed-size marker that only translates. Sidebar uses a short edge bar;
 * the bottom nav uses a short underline. Physical coordinates stay in viewport
 * space so RTL is handled explicitly.
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
      const bottom = el.classList.contains('is-bottom');
      const hidden = !active || active.getClientRects().length === 0;
      if (hidden) {
        nav.classList.remove('has-nav-indicator');
        el.style.opacity = '0';
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const itemBox = active.getBoundingClientRect();
      const navStyle = getComputedStyle(nav);
      const borderLeft = parseFloat(navStyle.borderLeftWidth || '0');
      const borderTop = parseFloat(navStyle.borderTopWidth || '0');
      const rtl = document.documentElement.dir === 'rtl';
      const x = bottom
        ? itemBox.left - navBox.left - borderLeft + (itemBox.width - 18) / 2
        : rtl
          ? itemBox.right - navBox.left - borderLeft - 3
          : itemBox.left - navBox.left - borderLeft;
      const y = bottom
        ? itemBox.bottom - navBox.top - borderTop - 5
        : itemBox.top - navBox.top - borderTop + (itemBox.height - 22) / 2;

      nav.classList.add('has-nav-indicator');
      const reduce = !animate || prefersReducedMotion();
      el.style.transition = reduce ? 'none' : '';
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      el.style.opacity = '1';
    };

    const show = (animate: boolean) => {
      window.clearTimeout(introTimer);
      if (!settled.current && introDelay > 0 && !prefersReducedMotion()) {
        introTimer = window.setTimeout(() => place(false), introDelay);
      } else {
        place(animate);
      }
      settled.current = true;
    };

    show(!settled.current ? false : true);
    sidebarTimer = window.setTimeout(() => place(false), 340);

    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(false));
    };
    const direction = new MutationObserver(() => place(false));
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
