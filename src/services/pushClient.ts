import { api, ApiError } from './apiClient';
import { defaultPushPrefs, type PushPrefs } from './pushSchedule';
import { deviceId, forgetSubscription, pushSubscriptionId, rememberSubscription, writePushPrefs } from './pushScheduleClient';

export type PushSupport = {
  supported: boolean;
  secure: boolean;
  ios: boolean;
  standalone: boolean;
  permission: NotificationPermission | 'unsupported';
};

export function detectPushSupport(): PushSupport {
  const secure = typeof window !== 'undefined' && window.isSecureContext;
  const sw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const push = typeof window !== 'undefined' && 'PushManager' in window;
  const notification = typeof window !== 'undefined' && 'Notification' in window;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ios = /iPad|iPhone|iPod/.test(ua);
  const standalone = typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches === true
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
  return {
    supported: Boolean(secure && sw && push && notification && (!ios || standalone)),
    secure,
    ios,
    standalone,
    permission: notification ? Notification.permission : 'unsupported',
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type EnableResult =
  | { ok: true; subscriptionId: string; configured: boolean }
  | { ok: false; reason: 'unsupported' | 'install-required' | 'denied' | 'default' | 'not-configured' | 'failed' };

export async function enableBackgroundPush(prefs: PushPrefs = defaultPushPrefs()): Promise<EnableResult> {
  const support = detectPushSupport();
  if (support.ios && !support.standalone) return { ok: false, reason: 'install-required' };
  if (!support.supported) return { ok: false, reason: 'unsupported' };
  writePushPrefs(prefs);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission === 'denied' ? 'denied' : 'default' };
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const ready = await navigator.serviceWorker.ready;
    const config = await api.pushConfig();
    if (!config.publicKey) return { ok: false, reason: 'not-configured' };
    const subscription = await (ready || registration).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
    const json = subscription.toJSON();
    const saved = await api.savePushSubscription({
      deviceId: deviceId(),
      preferences: prefs,
      subscription: { endpoint: json.endpoint, keys: json.keys },
    });
    rememberSubscription(saved.subscriptionId);
    return { ok: true, subscriptionId: saved.subscriptionId, configured: saved.configured };
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) return { ok: false, reason: 'not-configured' };
    return { ok: false, reason: 'failed' };
  }
}

export type DisableResult = { ok: true; server: boolean } | { ok: false; reason: 'failed' };

export async function disableBackgroundPush(): Promise<DisableResult> {
  const id = pushSubscriptionId();
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const current = await registration?.pushManager.getSubscription();
    await current?.unsubscribe();
  } catch { /* the server record is the source of truth */ }
  if (!id) {
    forgetSubscription();
    return { ok: true, server: true };
  }
  try {
    const result = await api.disablePushSubscription(id);
    forgetSubscription();
    return { ok: true, server: result.disabled || result.found === false };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export async function sendBackgroundTest() {
  const id = pushSubscriptionId();
  if (!id) throw new ApiError(404, 'No active push subscription.');
  return api.sendTestPush(id);
}
