import assert from 'node:assert/strict';
import test from 'node:test';
import { exportFilename, sanitizeAccountName } from './exportFilename.ts';

const at = new Date(2026, 9, 2, 14, 35, 22);

test('export filename uses the account name and local stamp', () => {
  assert.equal(exportFilename('Omar', at), 'TAAMEN_Omar_2026-10-02_14-35-22.json');
  assert.equal(exportFilename('يوسف علي', at), 'TAAMEN_يوسف_علي_2026-10-02_14-35-22.json');
});

test('export filename sanitizes spaces and illegal characters and keeps the extension', () => {
  assert.equal(sanitizeAccountName('Omar  Ali'), 'Omar_Ali');
  assert.equal(exportFilename('A/B:C*?"<>|', at, 'json'), 'TAAMEN_ABC_2026-10-02_14-35-22.json');
  assert.equal(exportFilename('Omar', at, '.json'), 'TAAMEN_Omar_2026-10-02_14-35-22.json');
});

test('an empty account name falls back to Profile', () => {
  assert.equal(exportFilename('   ', at), 'TAAMEN_Profile_2026-10-02_14-35-22.json');
  assert.equal(exportFilename('///', at), 'TAAMEN_Profile_2026-10-02_14-35-22.json');
});
