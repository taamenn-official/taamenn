import assert from 'node:assert/strict';
import test from 'node:test';
import { POLICY_VERSION } from './consent.ts';

test('consent uses one canonical policy version string', () => {
  assert.equal(POLICY_VERSION, '2.1');
  assert.match(POLICY_VERSION, /^\d+\.\d+$/);
});
