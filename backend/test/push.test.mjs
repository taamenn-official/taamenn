import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyEnv } from '../src/config.mjs';
import { handleFetch } from '../src/routes.mjs';
import { createMemoryDocument, getPushStore, setPushStore } from '../src/pushStore.mjs';
import { processDuePushJobs } from '../src/pushDispatch.mjs';
import { bytesToBase64Url, decryptWebPush, encryptWebPush } from '../src/webPush.mjs';

function useMemory() {
  setPushStore(createMemoryDocument());
}

async function call(method, path, body, ip = '203.0.113.10') {
  const response = await handleFetch(new Request(`https://taamenn.test${path}`, {
    method,
    headers: body === undefined
      ? { 'x-taamen-requested': '1' }
      : { 'content-type': 'application/json', 'x-taamen-requested': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { ip, encrypted: true });
  const payload = await response.json();
  return { status: response.status, body: payload, raw: JSON.stringify(payload) };
}

async function subscriptionKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return {
    pair,
    raw,
    p256dh: bytesToBase64Url(raw),
    auth: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  };
}

describe('push delivery', { concurrency: false }, () => {
test('push config never returns the private key', async () => {
  applyEnv({ VAPID_PUBLIC_KEY: 'public-key-value', VAPID_PRIVATE_KEY: 'super-secret-private' });
  const response = await call('GET', '/api/push/config');
  assert.equal(response.status, 200);
  assert.equal(response.body.publicKey, 'public-key-value');
  assert.equal(response.raw.includes('super-secret-private'), false);
  applyEnv({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' });
  const missing = await call('GET', '/api/push/config');
  assert.equal(missing.body.configured, false);
  assert.equal(missing.body.publicKey, null);
});

test('subscription validation and idempotent reminder delivery', async () => {
  useMemory();
  const keys = await subscriptionKeys();
  const rejected = await call('POST', '/api/push/subscribe', {
    subscription: { endpoint: 'http://example.com/push', keys: { p256dh: keys.p256dh, auth: keys.auth } },
  });
  assert.equal(rejected.status, 400);

  const saved = await call('POST', '/api/push/subscribe', {
    deviceId: 'device-test-1234',
    preferences: { matchCreated: true, matchApproaching: true, remind30: true, remind10: true, resultPending: true, matchUpdated: false, system: false },
    subscription: { endpoint: 'https://push.example.test/subscription/1', keys: { p256dh: keys.p256dh, auth: keys.auth } },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.enabled, true);
  const kickoff = Date.now() + 60 * 60_000;
  const scheduled = await call('POST', '/api/push/schedule', {
    subscriptionId: saved.body.subscriptionId,
    upcoming: [{ matchId: 'LOCAL-1', team1: 'Team A', team2: 'Team B', kickoff }],
    events: [{ matchId: 'LOCAL-1', team1: 'Team A', team2: 'Team B', kickoff, type: 'created' }],
  });
  assert.equal(scheduled.status, 200);
  assert.ok(scheduled.body.queued >= 1);

  const sent = [];
  const sender = async (sub, message) => {
    sent.push({ endpoint: sub.endpoint, message });
    return { ok: true, gone: false, unconfigured: false, status: 201 };
  };
  const first = await processDuePushJobs(Date.now() + 1000, sender);
  const second = await processDuePushJobs(Date.now() + 1000, sender);
  assert.equal(first.sent, 1);
  assert.equal(second.sent, 0);
  assert.equal(sent.length, 1);
  assert.match(sent[0].message.body, /Team A × Team B/);
  assert.equal(sent[0].message.url, '/#match-center');

  const gone = [];
  await getPushStore().update(doc => {
    const job = Object.values(doc.jobs).find(item => item.type === 'remind-30');
    assert.ok(job);
    job.deliverAt = Date.now() - 1000;
    job.status = 'pending';
  });
  await processDuePushJobs(Date.now(), async () => {
    gone.push('send');
    return { ok: false, gone: true, unconfigured: false, status: 410 };
  });
  const disabled = await getPushStore().read(doc => doc.subscriptions[saved.body.subscriptionId].enabled);
  assert.equal(disabled, false);
  assert.equal(gone.length, 1);

  const removed = await call('POST', '/api/push/unsubscribe', { subscriptionId: saved.body.subscriptionId });
  assert.equal(removed.body.disabled, true);
});

test('web push payload round-trips without exposing the private key', async () => {
  const keys = await subscriptionKeys();
  const payload = new TextEncoder().encode(JSON.stringify({ title: 'TAAMEN', body: 'Your match starts in 30 minutes.' }));
  const body = await encryptWebPush(keys.raw, base64ToBytes(keys.auth), payload);
  const decoded = await decryptWebPush(body, keys.pair.privateKey, keys.raw, base64ToBytes(keys.auth));
  assert.match(decoded, /30 minutes/);
});

function base64ToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

test('scheduled processing uses the existing worker and KV push key', async () => {
  const source = fs.readFileSync(new URL('../../worker/index.js', import.meta.url), 'utf8');
  assert.match(source, /async scheduled/);
  assert.match(source, /processDuePushJobs/);
  const exampleData = JSON.parse(fs.readFileSync(new URL('../data.example.json', import.meta.url), 'utf8'));
  const { initWorkerRuntime } = await import('../src/workerAdapter.mjs');
  const map = new Map();
  const kv = {
    get: async key => map.get(key) ?? null,
    put: async (key, value) => { map.set(key, value); },
  };
  await initWorkerRuntime({ TAAMEN_KV: kv, TAAMEN_SEED_EXAMPLE: 'false' }, exampleData);
  const result = await processDuePushJobs(Date.now());
  assert.equal(result.sent, 0);
  assert.equal(map.has('push'), true);
  assert.equal(JSON.stringify([...map.values()]).includes('VAPID_PRIVATE'), false);
});
});
