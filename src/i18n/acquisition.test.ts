import assert from 'node:assert/strict';
import test from 'node:test';
import { acquisitionCopy } from './acquisition.ts';

function flatten(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flatten).join('\n');
  if (value && typeof value === 'object') return Object.values(value).map(flatten).join('\n');
  return '';
}

test('acquisition copy exists in both languages with matching keys', () => {
  assert.deepEqual(Object.keys(acquisitionCopy.ar).sort(), Object.keys(acquisitionCopy.en).sort());
  assert.equal(acquisitionCopy.en.commercial.length, 10);
  assert.equal(acquisitionCopy.ar.commercial.length, 10);
  assert.equal(acquisitionCopy.en.process.length, 4);
  assert.equal(acquisitionCopy.ar.process.length, 4);
});

test('acquisition copy does not invent traction, revenue, or sale banners', () => {
  const combined = `${flatten(acquisitionCopy.en)}\n${flatten(acquisitionCopy.ar)}`;
  assert.doesNotMatch(combined, /\b3,?500\b/);
  assert.doesNotMatch(combined, /\b3500\b/);
  assert.doesNotMatch(combined, /\bMAU\b/);
  assert.doesNotMatch(combined, /\bARR\b/);
  assert.doesNotMatch(combined, /\$100k/i);
  assert.doesNotMatch(combined, /military-grade/i);
  assert.doesNotMatch(combined, /fully secure/i);
  assert.doesNotMatch(combined, /currently used by/i);
  assert.doesNotMatch(combined, /SALE/);
  assert.match(combined, /USD 4,900/);
  assert.match(combined, /Pre-revenue|قبل الإيرادات/);
  assert.match(acquisitionCopy.en.trafficPhrase, /Public beta traffic began in September 2026/);
  assert.match(acquisitionCopy.en.lede, /designed for|local-first workspace/i);
  assert.match(acquisitionCopy.en.whatBody, /designed for/);
});

test('product-shot copy is bilingual, factual, and does not relabel Match Center as Archive', () => {
  assert.deepEqual(Object.keys(acquisitionCopy.ar.shots).sort(), Object.keys(acquisitionCopy.en.shots).sort());
  assert.deepEqual(Object.keys(acquisitionCopy.en.shots).sort(), [
    'home',
    'login',
    'matchCenter',
    'mobile',
    'profile',
    'stadiums',
    'tactical',
  ]);
  assert.equal('archive' in acquisitionCopy.en.shots, false);
  assert.match(acquisitionCopy.en.shotArchiveNote, /no Archive screenshot/i);
  assert.match(acquisitionCopy.ar.shotArchiveNote, /لا توجد لقطة لشاشة السجل/);
  assert.match(acquisitionCopy.en.shots.matchCenter.caption, /Match Center/);
  assert.match(acquisitionCopy.en.shots.matchCenter.caption, /not Archive/);
  assert.doesNotMatch(acquisitionCopy.en.shots.matchCenter.caption, /this is Archive/i);
  assert.match(acquisitionCopy.en.shots.tactical.caption, /not a screenshot/i);
  assert.match(acquisitionCopy.en.tacticalCaption, /Not a marketing screenshot/);
});
