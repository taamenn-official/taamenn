import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cookieFrom, prepareEnvironment,
  seedDataset, startTestServer, writeDataset,
} from './helpers.mjs';

prepareEnvironment('auth');

const { hashPassword } = await import('../src/passwords.mjs');
writeDataset(seedDataset(hashPassword));

const { createServer } = await import('../src/server.mjs');
const { store } = await import('../src/store.mjs');
await store.load();

const api = await startTestServer(createServer);
test.after(() => api.close());

async function recognitionSession(code = 'user#MEMBER1') {
  const response = await api.post('/api/featured/member', { body: { memberCode: code } });
  assert.equal(response.status, 200, 'recognition should succeed');
  return cookieFrom(response);
}

const removedCircleRoutes = [
  '/api/auth/login',
  '/api/private/circle/matches',
  '/api/private/circle/players',
  '/api/private/circle/statistics',
  '/api/private/circle/notifications',
  '/api/private/circle/tactical',
  '/api/owner/overview',
];

test('the root and health contracts prove the process and API router are alive', async () => {
  const root = await api.get('/');
  assert.equal(root.status, 200);
  assert.equal(root.body.name, 'TAAMEN API');
  assert.equal(root.body.status, 'ok');
  assert.equal(root.body.emailjsPrivateKey, undefined);
  assert.equal(root.body.members, undefined);

  const health = await api.get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.service, 'taamen-api');
  assert.equal(typeof health.body.emailConfigured, 'boolean');
  assert.equal(health.body.EMAILJS_PRIVATE_KEY, undefined);
  assert.equal(health.body.emailjsPrivateKey, undefined);
});

test('anonymous session is a deterministic unauthenticated response', async () => {
  const response = await api.get('/api/auth/session');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { authenticated: false });
});

test('anonymous callers cannot read private historical data', async () => {
  const response = await api.get('/api/private/historical');
  assert.equal(response.status, 401);
  assert.equal(response.body.items, undefined);
});

test('Private Circle and owner routes are gone', async () => {
  for (const route of removedCircleRoutes) {
    const method = route === '/api/auth/login' ? 'POST' : 'GET';
    const response = method === 'POST'
      ? await api.post(route, { body: { name: 'test-member', password: 'x' } })
      : await api.get(route);
    assert.equal(response.status, 404, `${route} must not exist`);
  }
});

test('an unknown recognition code is rejected without revealing whether it exists', async () => {
  const response = await api.post('/api/featured/member', { body: { memberCode: 'user#NOPE' } });
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Invalid member ID.');
  assert.equal(cookieFrom(response), '', 'no session cookie may be issued');
  const serialized = JSON.stringify(response.body);
  assert.ok(!serialized.includes('user#MEMBER1'));
  assert.ok(!serialized.includes('test-member'));
});

test('a deactivated member cannot be recognized', async () => {
  const response = await api.post('/api/featured/member', { body: { memberCode: 'user#GONE1' } });
  assert.equal(response.status, 401);
});

test('a valid recognition code creates a session and never returns the code', async () => {
  const response = await api.post('/api/featured/member', { body: { memberCode: 'user#MEMBER1' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.authMethod, 'code');
  assert.equal(response.body.member.displayName, 'Test Member');
  assert.equal(response.body.member.username, 'test-member');
  assert.equal(response.body.member.role, 'MEMBER');

  const serialized = JSON.stringify(response.body);
  assert.ok(!serialized.includes('user#MEMBER1'), 'the recognition code must not be echoed');
  assert.ok(!serialized.includes('passwordHash'), 'credential material must not be returned');

  const cookie = response.setCookie.find(value => value.startsWith('taamen_session='));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
});

test('a recognition session can read historical data but not removed Circle routes', async () => {
  const cookie = await recognitionSession();

  const historical = await api.get('/api/private/historical', { cookie });
  assert.equal(historical.status, 200);
  assert.equal(historical.body.items.length, 2);
  assert.equal(historical.body.items[0].details, undefined);
  assert.equal(historical.body.items[0].visibility, undefined);

  for (const route of removedCircleRoutes) {
    const response = route === '/api/auth/login'
      ? await api.post(route, { cookie, body: { name: 'test-member', password: 'x' } })
      : await api.get(route, { cookie });
    assert.equal(response.status, 404, `${route} must be absent even for a recognition session`);
  }
});

test('a recognition session cannot escalate by sending role or identity fields', async () => {
  const cookie = await recognitionSession();
  const escalation = await api.post('/api/featured/member', {
    cookie,
    body: { memberCode: 'user#MEMBER1', role: 'OWNER', authMethod: 'password', isOwner: true, memberId: 'member-owner' },
  });
  assert.equal(escalation.status, 200);
  assert.equal(escalation.body.authMethod, 'code', 'authMethod is decided by the server');
  assert.equal(escalation.body.member.role, 'MEMBER', 'the role comes from the member record');
});

test('logout invalidates the server session and clears the cookie', async () => {
  const cookie = await recognitionSession();
  const before = await api.get('/api/auth/session', { cookie });
  assert.equal(before.status, 200);
  assert.equal(before.body.authenticated, true);

  const logout = await api.post('/api/auth/logout', { cookie });
  assert.equal(logout.status, 200);
  assert.match(logout.setCookie[0], /taamen_session=;/);
  assert.match(logout.setCookie[0], /Max-Age=0/);
  assert.match(logout.setCookie[0], /HttpOnly/);

  const after = await api.get('/api/auth/session', { cookie });
  assert.equal(after.status, 200);
  assert.deepEqual(after.body, { authenticated: false });
  assert.equal((await api.get('/api/private/historical', { cookie })).status, 401);
});

test('a forged or unknown session token is rejected', async () => {
  const forged = `taamen_session=${'a'.repeat(64)}`;
  const session = await api.get('/api/auth/session', { cookie: forged });
  assert.equal(session.status, 200);
  assert.deepEqual(session.body, { authenticated: false });
  assert.equal((await api.get('/api/private/historical', { cookie: forged })).status, 401);
});

test('mutating requests without the CSRF header are refused', async () => {
  const response = await api.post('/api/featured/member', {
    csrf: false,
    body: { memberCode: 'user#MEMBER1' },
  });
  assert.equal(response.status, 403);
  assert.match(response.body.error, /header/i);

  const logout = await api.post('/api/auth/logout', { csrf: false });
  assert.equal(logout.status, 403, 'logout is also protected against cross-site submission');
});

test('wrong HTTP methods are refused with an Allow header', async () => {
  const response = await api.get('/api/auth/logout');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('security headers are present and API responses are not cacheable', async () => {
  const response = await api.get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(response.headers.get('strict-transport-security'), null, 'plain HTTP must not send HSTS');
});

test('CORS credentials are granted only to allow-listed origins', async () => {
  const allowed = await api.get('/api/health', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(allowed.headers.get('cross-origin-resource-policy'), 'cross-origin');

  const foreign = await api.get('/api/health', { headers: { Origin: 'https://attacker.example' } });
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
  assert.equal(foreign.headers.get('cross-origin-resource-policy'), 'same-origin');

  for (const origin of ['null', '*', 'http://localhost:5173.evil.com', 'http://127.0.0.1:5173']) {
    const malformed = await api.get('/api/health', { headers: { Origin: origin } });
    assert.equal(malformed.headers.get('access-control-allow-origin'), null, origin);
    assert.equal(malformed.headers.get('access-control-allow-credentials'), null, origin);
  }
});

test('oversized and malformed request bodies are rejected', async () => {
  const oversized = await fetch(`${api.base}/api/featured/member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-TAAMEN-Requested': '1' },
    body: JSON.stringify({ memberCode: 'x'.repeat(200_000) }),
  });
  assert.equal(oversized.status, 413);

  const malformed = await fetch(`${api.base}/api/featured/member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-TAAMEN-Requested': '1' },
    body: '{not json',
  });
  assert.equal(malformed.status, 400);

  const arrayBody = await api.post('/api/featured/member', { body: ['user#MEMBER1'] });
  assert.equal(arrayBody.status, 400);
});

test('unknown routes do not leak internals', async () => {
  const response = await api.get('/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.deepEqual(Object.keys(response.body), ['error']);
  assert.ok(!/[/\\]/.test(response.body.error), 'no filesystem path may appear in the error');
});
