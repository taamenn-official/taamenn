import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareEnvironment, seedDataset, writeDataset } from './helpers.mjs';

prepareEnvironment('ratelimit');

const { hashPassword } = await import('../src/passwords.mjs');
writeDataset(seedDataset(hashPassword));

const { createRateLimiter } = await import('../src/rateLimit.mjs');
const { createServer } = await import('../src/server.mjs');
const { store } = await import('../src/store.mjs');
await store.load();

const { startTestServer } = await import('./helpers.mjs');
const api = await startTestServer(createServer);
test.after(() => api.close());

test('repeated failed recognition attempts are eventually blocked', async () => {
  let sawLimit = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await api.post('/api/featured/member', { body: { memberCode: `user#WRONG${attempt}` } });
    if (response.status === 429) {
      sawLimit = true;
      assert.match(response.body.error, /too many/i);
      break;
    }
    assert.equal(response.status, 401);
  }
  assert.ok(sawLimit, 'brute-force attempts must be rate limited');
});

test('the limiter blocks after the configured number of attempts', () => {
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 3, cooldownMs: 5000, maxEntries: 10 });
  const now = Date.now();
  assert.equal(limiter.check('a', now), true);
  assert.equal(limiter.check('a', now), true);
  assert.equal(limiter.check('a', now), true);
  assert.equal(limiter.check('a', now), false, 'the fourth attempt exceeds the budget');
  assert.equal(limiter.check('b', now), true, 'other callers are unaffected');
});

test('a blocked caller stays blocked for the cooldown and recovers after it', () => {
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 1, cooldownMs: 5000, maxEntries: 10 });
  const now = Date.now();
  assert.equal(limiter.check('a', now), true);
  assert.equal(limiter.check('a', now), false);
  assert.equal(limiter.check('a', now + 4999), false, 'still cooling down');
  assert.equal(limiter.check('a', now + 5001), true, 'the budget is restored');
});

test('a successful attempt clears the caller budget', () => {
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 2, cooldownMs: 5000, maxEntries: 10 });
  const now = Date.now();
  limiter.check('a', now);
  limiter.check('a', now);
  limiter.reset('a');
  assert.equal(limiter.check('a', now), true, 'a legitimate success must not leave a penalty');
});

test('the entry map is bounded no matter how many distinct callers appear', () => {
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 5, cooldownMs: 1000, maxEntries: 50 });
  const now = Date.now();
  for (let index = 0; index < 5000; index += 1) limiter.check(`caller-${index}`, now);
  assert.ok(limiter.size <= 50, `the limiter map must stay bounded (was ${limiter.size})`);
});

test('idle entries are swept once their window and cooldown have passed', () => {
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 5, cooldownMs: 1000, maxEntries: 100 });
  const now = Date.now();
  for (let index = 0; index < 20; index += 1) limiter.check(`caller-${index}`, now);
  assert.equal(limiter.size, 20);
  limiter.check('later', now + 10_000);
  assert.equal(limiter.size, 1, 'stale entries must not accumulate');
});

test('forwarded client-IP headers are ignored unless the proxy is trusted', async () => {
  // TRUST_PROXY is false in this environment, so rotating the header must not
  // hand an attacker a fresh budget.
  let blocked = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await api.post('/api/featured/member', {
      headers: { 'X-Forwarded-For': `10.0.0.${attempt}` },
      body: { memberCode: `user#SPOOF${attempt}` },
    });
    if (response.status === 429) { blocked = true; break; }
  }
  assert.ok(blocked, 'a spoofed forwarded address must not bypass the limiter');
});

test('a spoofed CF-Connecting-IP does not refresh the rate limit', async () => {
  let blocked = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await api.post('/api/featured/member', {
      headers: { 'CF-Connecting-IP': `203.0.113.${attempt % 250}` },
      body: { memberCode: `user#CFSPOOF${attempt}` },
    });
    if (response.status === 429) { blocked = true; break; }
  }
  assert.ok(blocked, 'a spoofed Cloudflare client IP must not bypass the limiter');
});
