import assert from 'node:assert/strict';
import test from 'node:test';
import { contributionCapacity, contributionsForSave, effectiveMatchFormat, sanitizeMatchFormat } from './matchFormat.ts';

test('a legacy match without a format is treated as 5v5', () => {
  assert.equal(effectiveMatchFormat(undefined), '5v5');
  assert.equal(sanitizeMatchFormat(undefined), undefined);
  assert.equal(sanitizeMatchFormat('11v11'), undefined);
});

test('5v5 allows five contributors and 7v7 allows seven', () => {
  assert.equal(contributionCapacity('5v5'), 5);
  assert.equal(contributionCapacity('7v7'), 7);
  const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.deepEqual(contributionsForSave(rows, '5v5'), rows.slice(0, 5));
  assert.deepEqual(contributionsForSave(rows, '7v7'), rows.slice(0, 7));
});
