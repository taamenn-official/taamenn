import assert from 'node:assert/strict';
import test from 'node:test';
import { spaFallbackNextPath } from './spaFallback.ts';

test('spa fallback restores a share path after a static 404 bounce to /', () => {
  const next = spaFallbackNextPath(
    'https://taamenn.com/share/profile/abc',
    'https://taamenn.com',
    'https://taamenn.com/',
  );
  assert.equal(next, '/share/profile/abc');
});

test('spa fallback ignores a stored URL from another origin', () => {
  assert.equal(
    spaFallbackNextPath('https://attacker.example/share/profile/abc', 'https://taamenn.com', 'https://taamenn.com/'),
    null,
  );
});

test('spa fallback is a no-op when the path is already restored', () => {
  assert.equal(
    spaFallbackNextPath(
      'https://taamenn.com/share/match/token',
      'https://taamenn.com',
      'https://taamenn.com/share/match/token',
    ),
    null,
  );
});

test('spa fallback restores /acquisition after a static 404 bounce to /', () => {
  assert.equal(
    spaFallbackNextPath(
      'https://taamenn.com/acquisition',
      'https://taamenn.com',
      'https://taamenn.com/',
    ),
    '/acquisition',
  );
});
