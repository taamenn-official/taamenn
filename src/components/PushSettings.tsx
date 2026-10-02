import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { detectPushSupport, disableBackgroundPush, enableBackgroundPush, sendBackgroundTest, type PushSupport } from '../services/pushClient';
import { defaultPushPrefs, type PushPrefs } from '../services/pushSchedule';
import { flushPushOutbox, pushSubscriptionId, readPushPrefs, syncUpcomingPushes, writePushPrefs, type PushSyncState } from '../services/pushScheduleClient';
import { listMatches } from '../services/matchRepository';

type StatusCopy = { title: string; detail: string };

function describe(language: 'ar' | 'en', support: PushSupport, active: boolean, sync: PushSyncState, denied: boolean): StatusCopy {
  const ar = language === 'ar';
  if (!support.secure || support.permission === 'unsupported') {
    return {
      title: ar ? 'غير مدعوم' : 'Unsupported',
      detail: ar ? 'إشعارات الخلفية غير مدعومة في هذا المتصفح.' : 'Background notifications are not supported in this browser.',
    };
  }
  if (support.ios && !support.standalone) {
    return {
      title: ar ? 'يلزم التثبيت' : 'Requires installation',
      detail: ar ? 'على iOS أضف TAAMEN إلى الشاشة الرئيسية ثم فعّل الإشعارات من هنا.' : 'On iOS, add TAAMEN to the Home Screen, then enable notifications here.',
    };
  }
  if (denied || support.permission === 'denied') {
    return {
      title: ar ? 'مرفوض' : 'Denied',
      detail: ar ? 'الإشعارات محظورة من إعدادات المتصفح أو الجهاز.' : 'Notifications are blocked by your browser or device settings.',
    };
  }
  if (!active) {
    return {
      title: ar ? 'الإشعارات متوقفة' : 'Notifications are disabled',
      detail: ar ? 'استلم تذكير المباراة حتى عندما لا يكون TAAMEN مفتوحًا.' : 'Receive match reminders even when TAAMEN is not open.',
    };
  }
  if (sync === 'not-configured') {
    return {
      title: ar ? 'الاشتراك محفوظ' : 'Subscription saved',
      detail: ar ? 'الخادم لم يُعد بعد بمفاتيح الإرسال. لن يُرسل تذكير حتى تُضاف.' : 'The server does not have push keys yet. A reminder is not sent until they are set.',
    };
  }
  if (sync === 'waiting') {
    return {
      title: ar ? 'بانتظار الاتصال' : 'Waiting to sync',
      detail: ar ? 'التفضيل محفوظ. جدولة التذكير تتم عند عودة الاتصال.' : 'The preference is saved. Reminder scheduling runs when you are back online.',
    };
  }
  if (sync === 'failed') {
    return {
      title: ar ? 'لم تكتمل المزامنة' : 'Sync did not finish',
      detail: ar ? 'الاشتراك المحلي باقٍ. أعد المحاولة عندما يعود الخادم.' : 'The local preference remains. Try again when the server is reachable.',
    };
  }
  return {
    title: ar ? 'الإشعارات مفعّلة' : 'Notifications are enabled',
    detail: ar ? 'تذكير المباراة يمكن أن يصل حتى إذا كان TAAMEN مغلقًا، عندما يدعم الجهاز Web Push.' : 'Match reminders can arrive even when TAAMEN is closed, when this device supports Web Push.',
  };
}

export function PushSettings({ language }: { language: 'ar' | 'en' }) {
  const ar = language === 'ar';
  const [support, setSupport] = useState<PushSupport>(() => detectPushSupport());
  const [prefs, setPrefs] = useState<PushPrefs>(() => readPushPrefs());
  const [active, setActive] = useState(() => Boolean(pushSubscriptionId()));
  const [sync, setSync] = useState<PushSyncState>('idle');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => { setSupport(detectPushSupport()); }, []);

  const refresh = () => setSupport(detectPushSupport());

  const enable = async () => {
    setBusy(true);
    setNote('');
    const result = await enableBackgroundPush(prefs);
    refresh();
    if (!result.ok) {
      setActive(false);
      setNote(result.reason);
      setBusy(false);
      return;
    }
    setActive(true);
    const matches = await listMatches().catch(() => []);
    const state = await syncUpcomingPushes(matches);
    setSync(result.configured ? state : 'not-configured');
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    const result = await disableBackgroundPush();
    setActive(false);
    setSync('idle');
    setNote(result.ok ? '' : 'server-pending');
    refresh();
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setNote('');
    try {
      const result = await sendBackgroundTest();
      setNote(result.ok ? 'tested' : 'test-failed');
    } catch {
      setNote('test-failed');
    }
    setBusy(false);
  };

  const toggle = (key: keyof PushPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    writePushPrefs(next);
    if (active) void flushPushOutbox().then(setSync);
  };

  const status = describe(language, support, active, sync, note === 'denied');
  const permission = support.permission === 'granted' ? (ar ? 'مسموح' : 'Granted') : support.permission === 'denied' ? (ar ? 'مرفوض' : 'Denied') : support.permission === 'unsupported' ? (ar ? 'غير مدعوم' : 'Unsupported') : (ar ? 'لم يُطلب' : 'Default');
  const background = !support.supported ? (support.ios && !support.standalone ? (ar ? 'يلزم التثبيت' : 'Requires installation') : (ar ? 'غير مدعوم' : 'Unsupported')) : support.permission !== 'granted' ? (ar ? 'يلزم الإذن' : 'Requires permission') : active ? (ar ? 'جاهز' : 'Ready') : (ar ? 'غير مفعّل' : 'Not active');

  const options: Array<{ key: keyof PushPrefs; ar: string; en: string }> = [
    { key: 'matchCreated', ar: 'إنشاء مباراة', en: 'Match created' },
    { key: 'matchUpdated', ar: 'تحديث مباراة', en: 'Match updated' },
    { key: 'matchApproaching', ar: 'اقتراب المباراة', en: 'Match approaching' },
    { key: 'remind30', ar: 'قبل 30 دقيقة', en: '30 minutes before' },
    { key: 'remind10', ar: 'قبل 10 دقائق', en: '10 minutes before' },
    { key: 'resultPending', ar: 'نتيجة معلّقة', en: 'Result pending' },
    { key: 'system', ar: 'تنبيهات النظام', en: 'System notices' },
  ];

  return (
    <section className="panel settings-panel push-settings">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">NOTIFICATIONS</p>
          <h2>{ar ? 'تذكير المباراة' : 'Match notifications'}</h2>
        </div>
        {active ? <Bell size={18} aria-hidden="true" /> : <BellOff size={18} aria-hidden="true" />}
      </div>
      <p className="settings-note">{status.detail}</p>
      <p className="push-status" role="status"><strong>{status.title}</strong></p>
      <dl className="push-diagnostics">
        <div><dt>{ar ? 'دعم الإشعارات' : 'Notification support'}</dt><dd>{support.supported || support.permission !== 'unsupported' ? (ar ? 'مدعوم' : 'Supported') : (ar ? 'غير مدعوم' : 'Unsupported')}</dd></div>
        <div><dt>{ar ? 'الإذن' : 'Permission'}</dt><dd>{permission}</dd></div>
        <div><dt>{ar ? 'اشتراك الدفع' : 'Push subscription'}</dt><dd>{active ? (ar ? 'نشط' : 'Active') : (ar ? 'غير نشط' : 'Not active')}</dd></div>
        <div><dt>{ar ? 'إشعار الخلفية' : 'Background notification'}</dt><dd>{background}</dd></div>
      </dl>
      <div className="push-options">
        {options.map(option => (
          <label key={option.key}>
            <input type="checkbox" checked={prefs[option.key]} onChange={() => toggle(option.key)} />
            <span>{ar ? option.ar : option.en}</span>
          </label>
        ))}
      </div>
      <div className="push-actions">
        {!active
          ? <button type="button" className="primary-action" onClick={enable} disabled={busy}>{ar ? 'تفعيل إشعارات المباراة' : 'Enable match notifications'}</button>
          : <button type="button" className="dark-action" onClick={disable} disabled={busy}>{ar ? 'إيقاف الإشعارات' : 'Disable notifications'}</button>}
        <button type="button" className="dark-action" onClick={test} disabled={busy || !active}>{ar ? 'إشعار تجريبي' : 'Test notification'}</button>
      </div>
      {note === 'server-pending' && <p className="settings-note" role="alert">{ar ? 'أُوقف الاشتراك على هذا الجهاز. حذف سجل الخادم لم يكتمل بعد.' : 'This device is unsubscribed. The server record was not fully removed yet.'}</p>}
      {note === 'not-configured' && <p className="settings-note" role="status">{ar ? 'هذا المتصفح يستطيع طلب الإذن، لكن خادم الإرسال غير مهيأ.' : 'This browser can ask for permission, but the push server is not configured.'}</p>}
      {note === 'tested' && <p className="settings-note" role="status">{ar ? 'أُرسل إشعار تجريبي عبر خادم الدفع.' : 'A test notification was sent through the push server.'}</p>}
      {note === 'test-failed' && <p className="settings-note" role="alert">{ar ? 'لم يُسلَّم الإشعار التجريبي.' : 'The test notification was not delivered.'}</p>}
      {note === 'failed' && <p className="settings-note" role="alert">{ar ? 'تعذّر تسجيل الاشتراك.' : 'The subscription could not be registered.'}</p>}
    </section>
  );
}
