import { api, ApiError } from './apiClient';

const KEY = 'taamen-challenge-queue';

export type QueuedChallengeEvent = {
  clientEventId: string;
  type: 'match_created' | 'match_shared' | 'pwa_install_claimed' | 'instagram_follow_claimed' | 'whatsapp_channel_claimed';
  eventKey: string;
  occurredAt: number;
  metadata?: { localMatchId?: string };
};

function read(): QueuedChallengeEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pendingChallengeEvents() {
  return read().length;
}

export function enqueueChallengeEvent(event: QueuedChallengeEvent) {
  if (typeof localStorage === 'undefined') return;
  const items = read();
  if (items.some(item => item.clientEventId === event.clientEventId || (item.type === event.type && item.eventKey === event.eventKey))) return;
  items.push(event);
  localStorage.setItem(KEY, JSON.stringify(items.slice(-40)));
  void flushChallengeQueue();
}

export async function flushChallengeQueue() {
  const items = read();
  if (!items.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
  try {
    await api.challengeEvents(items);
    localStorage.setItem(KEY, '[]');
    return true;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false;
    return false;
  }
}

export function rememberChallengeEvent(type: QueuedChallengeEvent['type'], eventKey: string, metadata?: QueuedChallengeEvent['metadata']) {
  const id = (globalThis.crypto?.randomUUID?.() || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).replace(/-/g, '').slice(0, 40);
  enqueueChallengeEvent({
    clientEventId: `evt${id}`.slice(0, 40),
    type,
    eventKey: eventKey.slice(0, 80),
    occurredAt: Date.now(),
    metadata,
  });
}
