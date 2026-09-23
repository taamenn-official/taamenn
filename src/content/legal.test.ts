import assert from 'node:assert/strict';
import test from 'node:test';
import { legalSections, privacySections, termsSections } from './legal.ts';

test('privacy and terms sections match across languages', () => {
  for (const document of ['privacy', 'terms'] as const) {
    const ar = legalSections(document, 'ar').map((section) => section.id);
    const en = legalSections(document, 'en').map((section) => section.id);
    assert.deepEqual(ar, en);
    assert.equal(new Set(ar).size, ar.length);
  }
});

test('privacy copy describes opt-in Ahrefs and does not claim ads or billing', () => {
  const combined = [...privacySections.en, ...privacySections.ar, ...termsSections.en, ...termsSections.ar]
    .map((section) => section.content)
    .join('\n');
  const analytics = privacySections.en.find((section) => section.id === 'analytics');
  assert.ok(analytics);
  assert.match(analytics.content, /analytics\.ahrefs\.com/);
  assert.match(analytics.content, /stays off until you turn it on/i);
  assert.equal(privacySections.ar.some((section) => section.id === 'analytics'), true);
  assert.doesNotMatch(combined, /AdSense|Stripe|subscription|billing/i);
});
