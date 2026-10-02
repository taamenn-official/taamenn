const MAX_SUBSCRIPTIONS = 2000;
const MAX_JOBS = 5000;
const MAX_UPCOMING = 80;
const STALE_MS = 2 * 60 * 60 * 1000;
const MINUTE = 60_000;

const TYPES = new Set(['created', 'updated', 'remind-30', 'remind-10', 'result-pending', 'test']);
const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const KEY_RE = /^[A-Za-z0-9_-]{16,200}$/;

let pushStore = null;

export function setPushStore(store) {
  pushStore = store;
}

export function getPushStore() {
  if (!pushStore) throw new Error('TAAMEN push store is not initialized.');
  return pushStore;
}

export function emptyPushDocument() {
  return { subscriptions: {}, jobs: {} };
}

export function validatePushDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid push document');
  if (!value.subscriptions || typeof value.subscriptions !== 'object' || Array.isArray(value.subscriptions)) {
    throw new Error('invalid push subscriptions');
  }
  if (!value.jobs || typeof value.jobs !== 'object' || Array.isArray(value.jobs)) {
    throw new Error('invalid push jobs');
  }
  return value;
}

export function createMemoryDocument(initial = emptyPushDocument()) {
  let state = validatePushDocument(initial);
  let queue = Promise.resolve();
  return {
    async load() { return state; },
    read(reader) {
      const run = queue.then(async () => reader(state));
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
    update(mutator) {
      const run = queue.then(async () => {
        const result = await mutator(state);
        return result;
      });
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}

export function normalizePrefs(input) {
  const source = input && typeof input === 'object' ? input : {};
  const flag = (key, fallback) => (typeof source[key] === 'boolean' ? source[key] : fallback);
  return {
    matchCreated: flag('matchCreated', true),
    matchUpdated: flag('matchUpdated', true),
    matchApproaching: flag('matchApproaching', true),
    resultPending: flag('resultPending', true),
    system: flag('system', false),
    remind30: flag('remind30', true),
    remind10: flag('remind10', true),
  };
}

function cleanText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

export function validateSubscriptionBody(body) {
  const subscription = body?.subscription;
  const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint : '';
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('endpoint'); }
  if (url.protocol !== 'https:' || url.username || url.password || endpoint.length > 2000) throw new Error('endpoint');
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !KEY_RE.test(p256dh) || !KEY_RE.test(auth)) {
    throw new Error('keys');
  }
  const deviceId = typeof body.deviceId === 'string' && ID_RE.test(body.deviceId) ? body.deviceId : '';
  return {
    endpoint,
    keys: { p256dh, auth },
    deviceId,
    preferences: normalizePrefs(body.preferences),
  };
}

function subscriptionIdFor(endpoint) {
  let hash = 2166136261;
  for (let i = 0; i < endpoint.length; i += 1) {
    hash ^= endpoint.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sub-${(hash >>> 0).toString(16)}`;
}

export function jobId(matchId, type, deliverAt, subscriptionId) {
  return `${matchId}:${type}:${deliverAt}:${subscriptionId}`;
}

function routeFor(type) {
  if (type === 'result-pending') return '/#archive';
  if (type === 'test') return '/#settings';
  return '/#match-center';
}

function copyFor(type, team1, team2, kickoff) {
  const teams = `${team1} × ${team2}`;
  const when = Number.isFinite(kickoff)
    ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jerusalem' }).format(new Date(kickoff))
    : '';
  if (type === 'remind-30') return { title: 'TAAMEN', body: `Your match starts in 30 minutes. ${teams}${when ? ` — ${when}` : ''}` };
  if (type === 'remind-10') return { title: 'TAAMEN', body: `Your match starts in 10 minutes. ${teams}${when ? ` — ${when}` : ''}` };
  if (type === 'created') return { title: 'TAAMEN', body: `Match created. ${teams}` };
  if (type === 'updated') return { title: 'TAAMEN', body: `Your match has been updated. ${teams}` };
  if (type === 'result-pending') return { title: 'TAAMEN', body: `Your match needs a result. ${teams}` };
  return { title: 'TAAMEN', body: 'TAAMEN notification test.' };
}

function allowType(prefs, type) {
  if (type === 'created') return prefs.matchCreated;
  if (type === 'updated') return prefs.matchUpdated;
  if (type === 'result-pending') return prefs.resultPending;
  if (type === 'remind-30') return prefs.matchApproaching && prefs.remind30;
  if (type === 'remind-10') return prefs.matchApproaching && prefs.remind10;
  if (type === 'test') return true;
  return false;
}

function prune(doc) {
  const jobs = Object.values(doc.jobs);
  if (jobs.length <= MAX_JOBS) return;
  const removable = jobs
    .filter(job => job.status === 'sent' || job.status === 'expired' || job.status === 'dropped')
    .sort((a, b) => (a.sentAt || a.deliverAt) - (b.sentAt || b.deliverAt));
  while (Object.keys(doc.jobs).length > MAX_JOBS && removable.length) {
    delete doc.jobs[removable.shift().id];
  }
}

export async function saveSubscription(body, now = Date.now()) {
  const parsed = validateSubscriptionBody(body);
  const store = getPushStore();
  return store.update(doc => {
    const id = subscriptionIdFor(parsed.endpoint);
    const existing = doc.subscriptions[id];
    if (!existing && Object.keys(doc.subscriptions).length >= MAX_SUBSCRIPTIONS) {
      const error = new Error('capacity');
      error.code = 'capacity';
      throw error;
    }
    doc.subscriptions[id] = {
      id,
      endpoint: parsed.endpoint,
      keys: parsed.keys,
      deviceId: parsed.deviceId,
      createdAt: existing?.createdAt || now,
      lastSeenAt: now,
      enabled: true,
      preferences: parsed.preferences,
    };
    return { subscriptionId: id, enabled: true };
  });
}

export async function disableSubscription(subscriptionId) {
  if (!ID_RE.test(String(subscriptionId || ''))) throw new Error('subscription');
  const store = getPushStore();
  return store.update(doc => {
    const current = doc.subscriptions[subscriptionId];
    if (!current) return { found: false, disabled: false };
    current.enabled = false;
    current.lastSeenAt = Date.now();
    for (const job of Object.values(doc.jobs)) {
      if (job.subscriptionId === subscriptionId && job.status === 'pending') job.status = 'dropped';
    }
    return { found: true, disabled: true };
  });
}

function readFact(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!ID_RE.test(String(raw.matchId || '')) || !TYPES.has(raw.type) || raw.type === 'test') return null;
  const kickoff = Number(raw.kickoff);
  if (!Number.isFinite(kickoff)) return null;
  const horizon = 60 * 24 * 60 * MINUTE;
  const now = Date.now();
  if (kickoff < now - horizon || kickoff > now + horizon) return null;
  return {
    matchId: String(raw.matchId),
    team1: cleanText(raw.team1, 48) || 'Team A',
    team2: cleanText(raw.team2, 48) || 'Team B',
    kickoff,
    type: raw.type,
  };
}

function deliverAtFor(type, kickoff, now) {
  if (type === 'remind-30') return kickoff - 30 * MINUTE;
  if (type === 'remind-10') return kickoff - 10 * MINUTE;
  return now;
}

export async function replaceSchedule(body, now = Date.now()) {
  const subscriptionId = String(body?.subscriptionId || '');
  if (!ID_RE.test(subscriptionId)) throw new Error('subscription');
  const upcoming = Array.isArray(body.upcoming) ? body.upcoming.slice(0, MAX_UPCOMING) : [];
  const events = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
  const store = getPushStore();
  return store.update(doc => {
    const sub = doc.subscriptions[subscriptionId];
    if (!sub || !sub.enabled) return { ok: false, reason: 'inactive' };
    sub.lastSeenAt = now;
    const prefs = sub.preferences;
    const live = new Set();
    const accepted = [];
    for (const raw of upcoming) {
      const fact = readFact({ ...raw, type: 'remind-30' });
      if (!fact) continue;
      live.add(fact.matchId);
      for (const type of ['remind-30', 'remind-10']) {
        if (!allowType(prefs, type)) continue;
        const deliverAt = deliverAtFor(type, fact.kickoff, now);
        if (deliverAt < now - MINUTE) continue;
        accepted.push({ ...fact, type, deliverAt });
      }
    }
    for (const raw of events) {
      const fact = readFact(raw);
      if (!fact || !allowType(prefs, fact.type)) continue;
      accepted.push({ ...fact, deliverAt: deliverAtFor(fact.type, fact.kickoff, now) });
      if (fact.type === 'remind-30' || fact.type === 'remind-10') live.add(fact.matchId);
    }
    for (const job of Object.values(doc.jobs)) {
      if (job.subscriptionId !== subscriptionId || job.status !== 'pending') continue;
      if ((job.type === 'remind-30' || job.type === 'remind-10') && !live.has(job.matchId)) job.status = 'dropped';
      if (!allowType(prefs, job.type) && job.type !== 'test') job.status = 'dropped';
    }
    let queued = 0;
    for (const fact of accepted) {
      const id = jobId(fact.matchId, fact.type, fact.deliverAt, subscriptionId);
      const existing = doc.jobs[id];
      if (existing?.status === 'sent') continue;
      const copy = copyFor(fact.type, fact.team1, fact.team2, fact.kickoff);
      doc.jobs[id] = {
        id,
        subscriptionId,
        matchId: fact.matchId,
        type: fact.type,
        deliverAt: fact.deliverAt,
        title: copy.title,
        body: copy.body.slice(0, 180),
        url: routeFor(fact.type),
        status: 'pending',
      };
      queued += 1;
    }
    prune(doc);
    return { ok: true, queued };
  });
}

export async function enqueueTest(subscriptionId, now = Date.now()) {
  if (!ID_RE.test(String(subscriptionId || ''))) throw new Error('subscription');
  const store = getPushStore();
  return store.update(doc => {
    const sub = doc.subscriptions[subscriptionId];
    if (!sub || !sub.enabled) return { ok: false, reason: 'inactive' };
    const id = jobId('test', 'test', now, subscriptionId);
    if (doc.jobs[id]?.status === 'sent') return { ok: true, duplicate: true, id };
    const copy = copyFor('test', '', '', NaN);
    doc.jobs[id] = {
      id,
      subscriptionId,
      matchId: 'test',
      type: 'test',
      deliverAt: now,
      title: copy.title,
      body: copy.body,
      url: routeFor('test'),
      status: 'pending',
    };
    return { ok: true, duplicate: false, id };
  });
}

export function dueJobs(doc, now) {
  return Object.values(doc.jobs).filter(job => job.status === 'pending' && job.deliverAt <= now);
}

export { STALE_MS, copyFor, routeFor };
