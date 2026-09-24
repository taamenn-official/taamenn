import test from 'node:test';
import assert from 'node:assert/strict';

process.env.REQUIRE_HTTPS = 'true';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = '';
process.env.TRUST_PROXY = 'false';

const { withTransportHeaders } = await import('../src/http.mjs');

test('HSTS is sent only when the request is secure and HTTPS is required', () => {
  const secure = withTransportHeaders(new Response('{}', { status: 200, headers: { 'Cache-Control': 'no-store' } }), true);
  assert.equal(secure.headers.get('strict-transport-security'), 'max-age=15552000');
  assert.equal(secure.headers.get('cache-control'), 'no-store');

  const plain = withTransportHeaders(new Response('{}', { status: 200 }), false);
  assert.equal(plain.headers.get('strict-transport-security'), null);
});
