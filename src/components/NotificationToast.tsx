import { useEffect, useRef, useState } from 'react';
import { Archive, Bell, Clock3, Swords } from 'lucide-react';
import type { AppNotification } from '../services/notificationService';
import { prefersReducedMotion } from '../motion/prefersReduced';

const TOAST_MS = 3000;

export function NotificationToast({
  language,
  onOpen,
}: {
  language: 'ar' | 'en';
  onOpen?: () => void;
}) {
  const ar = language === 'ar';
  const [item, setItem] = useState<AppNotification | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  const hideTimer = useRef(0);

  useEffect(() => {
    const clearTimers = () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(hideTimer.current);
    };
    const show = (next: AppNotification) => {
      clearTimers();
      setLeaving(false);
      setItem(next);
      timer.current = window.setTimeout(() => {
        if (prefersReducedMotion()) {
          setItem(null);
          return;
        }
        setLeaving(true);
        hideTimer.current = window.setTimeout(() => {
          setItem(null);
          setLeaving(false);
        }, 180);
      }, TOAST_MS);
    };
    const onNotification = (event: Event) => {
      const detail = (event as CustomEvent<AppNotification>).detail;
      if (!detail?.title || !detail.id) return;
      show(detail);
    };
    window.addEventListener('taamen-notification', onNotification);
    return () => {
      window.removeEventListener('taamen-notification', onNotification);
      clearTimers();
    };
  }, []);

  if (!item) return null;
  const title = ar ? (item.titleAr || item.title) : item.title;
  const body = ar ? (item.bodyAr || item.messageAr || item.body) : (item.body || item.message || '');
  const Icon = item.type === 'archive' ? Archive : item.type === 'tactical' ? Swords : item.type === 'match' ? Clock3 : Bell;

  return (
    <div className="notification-toast-host" data-taamen-toast="notification" aria-live="polite">
      <button
        type="button"
        className={`notification-toast${leaving ? ' is-leaving' : ''}`}
        onClick={onOpen}
      >
        <span className="notification-toast-icon" aria-hidden="true"><Icon size={16} /></span>
        <span>
          <strong>{title}</strong>
          {body && <p>{body}</p>}
        </span>
      </button>
    </div>
  );
}
