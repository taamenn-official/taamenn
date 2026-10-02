import assert from 'node:assert/strict';
import test from 'node:test';
import { pendingSectionStartsOpen } from './archivePending.ts';

test('an empty pending section stays closed', () => {
  assert.equal(pendingSectionStartsOpen(0, false), false);
});

test('pending matches open the section until the user closes it', () => {
  assert.equal(pendingSectionStartsOpen(2, false), true);
  assert.equal(pendingSectionStartsOpen(2, true), false);
});
