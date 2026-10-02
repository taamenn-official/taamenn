import type { Match } from '../data/footballData';
import { matchEndTime, matchStartTime } from './matchLifecycle';
import { api } from './apiClient';
import { defaultPushPrefs, planReminderFacts, type PushPrefs } from './pushSchedule';

const ID_KEY = 'taamen-push-subscription-id';
const PREFS_KEY = 'taamen-push-prefs';
const OUTBOX_KEY = 'taamen-push-outbox';
const DEVICE_KEY = 'taamen-push-device';

export type PushSyncState = 'idle' | 'scheduled' | 'waiting' | 'failed' | 'not-configured';

type Outbox = {
  events: Array<{ matchId: string; team1: string; team2: string; kickoff: number; type: string }>;
  upcoming: Array<{ matchId: string; team1: string; team2: string; kickoff: number }>;
};

function storage() {
  try { return localStorage; } catch { return null; }
}

export function readPushPrefs(): PushPrefs {
  const raw = storage()?.getItem(PREFS_KEY);
  if (!raw) return defaultPushPrefs();
  try { return { ...defaultPushPrefs(), ...JSON.parse(raw) }; } catch { return defaultPushPrefs(); }
}

export function writePushPrefs(prefs: PushPrefs) {
  storage()?.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function pushSubscriptionId() {
  return storage()?.getItem(ID_KEY) || '';
}

export function deviceId() {
  const box = storage();
  if (!box) return 'device-local';
  const existing = box.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = `device-${crypto.randomUUID?.().replace(/-/g, '') || Math.random().toString(36).slice(2)}`.slice(0, 64);
  box.setItem(DEVICE_KEY, created);
  return created;
}

function readOutbox(): Outbox {
  try {
    const parsed = JSON.parse(storage()?.getItem(OUTBOX_KEY) || '');
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      upcoming: Array.isArray(parsed.upcoming) ? parsed.upcoming : [],
    };
  } catch {
    return { events: [], upcoming: [] };
  }
}

function writeOutbox(outbox: Outbox) {
  storage()?.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

export function rememberSubscription(id: string) {
  storage()?.setItem(ID_KEY, id);
}

export function forgetSubscription() {
  storage()?.removeItem(ID_KEY);
}

export async function flushPushOutbox(): Promise<PushSyncState> {
  const subscriptionId = pushSubscriptionId();
  if (!subscriptionId) return 'idle';
  const outbox = readOutbox();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'waiting';
  try {
    const result = await api.schedulePush({ subscriptionId, upcoming: outbox.upcoming, events: outbox.events });
    writeOutbox({ events: [], upcoming: outbox.upcoming });
    return result.configured ? 'scheduled' : 'not-configured';
  } catch {
    return 'failed';
  }
}

export async function scheduleMatchPush(match: Match, event: 'created' | 'updated' | 'result-pending' | 'sync') {
  const subscriptionId = pushSubscriptionId();
  if (!subscriptionId) return 'idle' as const;
  const kickoff = matchStartTime(match);
  if (!Number.isFinite(kickoff)) return 'idle' as const;
  const facts = planReminderFacts({
    matchId: match.id,
    team1: match.team1,
    team2: match.team2,
    kickoff,
    endAt: matchEndTime(match),
    status: match.status,
    event,
    prefs: readPushPrefs(),
    now: Date.now(),
  });
  const outbox = readOutbox();
  const immediate = facts.filter(fact => fact.type === 'created' || fact.type === 'updated' || fact.type === 'result-pending');
  const reminders = facts.filter(fact => fact.type === 'remind-30' || fact.type === 'remind-10');
  outbox.events.push(...immediate.map(({ matchId, team1, team2, kickoff: at, type }) => ({ matchId, team1, team2, kickoff: at, type })));
  if (reminders.length || match.status === 'UPCOMING') {
    outbox.upcoming = [
      ...outbox.upcoming.filter(item => item.matchId !== match.id),
      ...(match.status === 'UPCOMING' ? [{ matchId: match.id, team1: match.team1, team2: match.team2, kickoff }] : []),
    ].slice(-80);
  } else {
    outbox.upcoming = outbox.upcoming.filter(item => item.matchId !== match.id);
  }
  writeOutbox(outbox);
  return flushPushOutbox();
}

export async function cancelMatchPush(matchId: string) {
  const outbox = readOutbox();
  outbox.upcoming = outbox.upcoming.filter(item => item.matchId !== matchId);
  outbox.events = outbox.events.filter(item => item.matchId !== matchId);
  writeOutbox(outbox);
  return flushPushOutbox();
}

export async function syncUpcomingPushes(matches: Match[]) {
  const subscriptionId = pushSubscriptionId();
  if (!subscriptionId) return 'idle' as const;
  const upcoming = matches
    .filter(match => match.status === 'UPCOMING')
    .slice(0, 80)
    .map(match => ({ matchId: match.id, team1: match.team1, team2: match.team2, kickoff: matchStartTime(match) }))
    .filter(item => Number.isFinite(item.kickoff));
  const outbox = readOutbox();
  outbox.upcoming = upcoming;
  writeOutbox(outbox);
  return flushPushOutbox();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushPushOutbox(); });
}
