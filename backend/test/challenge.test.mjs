import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleFetch } from '../src/routes.mjs';
import { createMemoryChallengeStore, setChallengeStore } from '../src/challenge/store.mjs';
import { setChallengeNow } from '../src/challenge/service.mjs';
import { takeDevOtp } from '../src/challenge/otpProvider.mjs';
import { hmacHex, normalizePhone } from '../src/challenge/crypto.mjs';

process.env.CHALLENGE_HASH_SECRET = 'test-hash-secret';
process.env.CHALLENGE_SESSION_SECRET = 'test-session-secret';
process.env.CHALLENGE_OPERATOR_TOKEN = 'test-operator-token';
process.env.CHALLENGE_OTP_PROVIDER = 'dev';

function useStore() {
  setChallengeStore(createMemoryChallengeStore());
}

async function call(method, path, body, cookie = '', extra = {}) {
  const headers = { 'x-taamen-requested': '1', ...extra };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const response = await handleFetch(new Request(`https://taamenn.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { ip: '203.0.113.20', encrypted: true });
  const payload = await response.json();
  return { status: response.status, body: payload, cookie: response.headers.get('set-cookie') || '' };
}

describe('challenge #01', { concurrency: false }, () => {
  test('migration keeps challenge data separate and constrained', () => {
    const sql = fs.readFileSync(new URL('../migrations/0001_challenge_init.sql', import.meta.url), 'utf8');
    assert.match(sql, /UNIQUE \(participant_id\)/);
    assert.match(sql, /UNIQUE \(campaign_id, phone_hash\)/);
    assert.match(sql, /UNIQUE \(campaign_id, participant_id, client_event_id\)/);
    assert.equal(sql.includes('CREATE TABLE IF NOT EXISTS matches'), false);
  });

  test('otp is single-use, progress is server-derived, and winner is operator-only', async () => {
    useStore();
    setChallengeNow(() => Date.parse('2026-11-02T12:00:00Z'));
    const early = await call('GET', '/api/challenge/config');
    assert.equal(early.body.phase, 'active');
    assert.equal(JSON.stringify(early.body).includes('test-hash-secret'), false);

    const requested = await call('POST', '/api/challenge/otp/request', { phone: '+970599000111', source: 'instagram' });
    assert.equal(requested.status, 200);
    assert.equal(requested.body.delivery, 'accepted');
    assert.equal(requested.body.code, undefined);
    const phoneHash = await hmacHex(normalizePhone('+970599000111'), process.env.CHALLENGE_HASH_SECRET);
    const code = takeDevOtp(phoneHash);
    assert.match(code, /^\d{6}$/);

    const verified = await call('POST', '/api/challenge/otp/verify', {
      phone: '+970599000111',
      code,
      displayName: 'Omar',
      source: 'instagram',
    });
    assert.equal(verified.status, 200);
    assert.match(verified.body.participantId, /^TM-/);
    assert.match(verified.cookie, /taamen_challenge_session=/);
    assert.equal(verified.body.tasks.find(task => task.id === 'phone_verified').state, 'complete');
    assert.equal(verified.body.percent, Math.round((1 / 7) * 100));
    const reused = await call('POST', '/api/challenge/otp/verify', { phone: '+970599000111', code, displayName: 'Omar' });
    assert.equal(reused.status, 400);

    const cookie = verified.cookie.split(';')[0];
    const first = await call('POST', '/api/challenge/events', {
      events: [{ type: 'match_created', eventKey: 'LOCAL-1', clientEventId: 'evt-local-1', metadata: { localMatchId: 'LOCAL-1' } }],
    }, cookie);
    const second = await call('POST', '/api/challenge/events', {
      events: [{ type: 'match_created', eventKey: 'LOCAL-1', clientEventId: 'evt-local-1b', metadata: { localMatchId: 'LOCAL-1' } }],
    }, cookie);
    assert.equal(first.body.accepted, 1);
    assert.equal(second.body.duplicate, 1);
    assert.equal(first.body.tasks.find(task => task.id === 'create_5_matches').count, 1);
    assert.equal(second.body.tasks.find(task => task.id === 'create_5_matches').count, 1);

    const spoof = await call('POST', '/api/challenge/operator/status', { participantId: verified.body.participantId, status: 'winner' });
    assert.equal(spoof.status, 404);
    const marked = await call('POST', '/api/challenge/operator/status', { participantId: verified.body.participantId, status: 'winner' }, '', { 'x-taamen-operator': 'test-operator-token' });
    assert.equal(marked.status, 200);
    assert.equal(marked.body.status, 'winner');
  });

  test('dates outside the Hebron window are not active', async () => {
    useStore();
    setChallengeNow(() => Date.parse('2026-10-30T12:00:00Z'));
    const before = await call('POST', '/api/challenge/otp/request', { phone: '+970599000111' });
    assert.equal(before.body.error, 'campaign_not_started');
    setChallengeNow(() => Date.parse('2026-11-16T12:00:00Z'));
    const after = await call('POST', '/api/challenge/otp/request', { phone: '+970599000111' });
    assert.equal(after.body.error, 'campaign_ended');
    setChallengeNow(() => Date.now());
  });
});
