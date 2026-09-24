import assert from 'node:assert/strict';
import test from 'node:test';
import { BackupError, assertBackupRecordsValid, collectBackupPuts, parseBackupEnvelope } from './localDb.ts';

test('parseBackupEnvelope accepts and normalizes legacy TAAMEN backups', () => {
  const envelope = parseBackupEnvelope({
    format: 'taamen-backup',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    stores: { matches: [{ id: 'LOCAL-1', team1: 'A' }] },
  });
  assert.equal(envelope.format, 'taamen-backup');
  assert.equal(envelope.version, 3);
  assert.equal(envelope.sourceVersion, 1);
});

test('parseBackupEnvelope rejects a missing format', () => {
  assert.throws(() => parseBackupEnvelope({ version: 2, stores: {} }), (error: unknown) => error instanceof BackupError && error.code === 'invalid');
});

test('parseBackupEnvelope rejects an unsupported version', () => {
  assert.throws(
    () => parseBackupEnvelope({ format: 'taamen-backup', version: 99, stores: {} }),
    (error: unknown) => error instanceof BackupError && error.code === 'unsupported-version',
  );
});

test('collectBackupPuts skips records without a string id', () => {
  const puts = collectBackupPuts({
    format: 'taamen-backup',
    version: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    stores: {
      matches: [{ id: 'keep-me' }, { team1: 'no-id' }, null, { id: '' }],
      archive: [{ id: 'arch-1' }],
    },
  });
  assert.deepEqual(puts.map((row) => `${row.store}:${row.item.id}`), ['matches:keep-me', 'matches:arch-1']);
});

test('malformed match records reject the backup before any write', () => {
  assert.throws(
    () => assertBackupRecordsValid({ matches: [{ id: 'LOCAL-1' }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => assertBackupRecordsValid({ matches: [{ team1: 'A', team2: 'B', dateKey: 20260101 }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.doesNotThrow(() => assertBackupRecordsValid({
    matches: [{ id: 'LOCAL-1', team1: 'A', team2: 'B', dateKey: 20260101 }],
  }));
});

test('malformed archive records reject the backup before any write', () => {
  assert.throws(
    () => assertBackupRecordsValid({ archive: [{ id: 'ARCH-1' }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.doesNotThrow(() => assertBackupRecordsValid({
    archive: [{ id: 'ARCH-1', team1: 'A', team2: 'B', dateKey: 20260101 }],
  }));
});

const validMatch = { id: 'LOCAL-1', team1: 'A', team2: 'B', dateKey: 20260101, visibility: 'LOCAL', source: 'local' };

test('backup import rejects arrays, pollution keys, private rows, and unknown stores', () => {
  assert.throws(
    () => parseBackupEnvelope({ format: 'taamen-backup', version: 3, stores: [] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => parseBackupEnvelope({ format: 'taamen-backup', version: 3, stores: { matches: { id: 'LOCAL-1' } } }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => parseBackupEnvelope(JSON.parse('{"format":"taamen-backup","version":3,"stores":{"__proto__":[{"id":"x"}]}}')),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => parseBackupEnvelope({
      format: 'taamen-backup',
      version: 3,
      stores: { matches: [{ ...validMatch, constructor: { prototype: { polluted: true } } }] },
    }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => parseBackupEnvelope({ format: 'taamen-backup', version: 3, stores: { notAStore: [] } }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => assertBackupRecordsValid({ matches: [{ ...validMatch, visibility: 'PRIVATE' }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => assertBackupRecordsValid({ archive: [{ ...validMatch, source: 'legacy' }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.throws(
    () => assertBackupRecordsValid({ matches: [{ ...validMatch, source: 'featured' }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.doesNotThrow(() => assertBackupRecordsValid({ matches: [validMatch] }));
});

test('malformed screenshot records reject the backup before any write', () => {
  assert.throws(
    () => assertBackupRecordsValid({ screenshots: [{ id: 'shot-1', createdAt: Date.now() }] }),
    (error: unknown) => error instanceof BackupError && error.code === 'invalid',
  );
  assert.doesNotThrow(() => assertBackupRecordsValid({
    screenshots: [{ id: 'shot-1', blob: new Blob(['png']), createdAt: Date.now() }],
  }));
});
