import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('the usage guide does not teach the tactical board', () => {
  const guide = fs.readFileSync(fileURLToPath(new URL('./HowToGuide.tsx', import.meta.url)), 'utf8');
  assert.equal(/tactical|تكتيك|الملعب التكتيكي|playground/i.test(guide), false);
  assert.match(guide, /Finished — result pending|النتيجة معلّقة/);
  assert.match(guide, /Stadiums|الملاعب/);
  assert.match(guide, /How TAAMEN works|كيف يعمل TAAMEN/);
});
