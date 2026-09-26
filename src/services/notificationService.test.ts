import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationLedgerDecision, notificationShouldAnnounce } from './notificationService.ts';

test('a disabled notification preference does not consume the event ledger', () => {
  assert.equal(notificationLedgerDecision(false, false), 'skip-disabled');
  assert.equal(notificationLedgerDecision(false, true), 'skip-known');
  assert.equal(notificationLedgerDecision(true, false), 'emit');
  assert.equal(notificationLedgerDecision(true, true), 'skip-known');
});

test('only a real emit is announced as a toast', () => {
  assert.equal(notificationShouldAnnounce('emit'), true);
  assert.equal(notificationShouldAnnounce('skip-known'), false);
  assert.equal(notificationShouldAnnounce('skip-disabled'), false);
});
