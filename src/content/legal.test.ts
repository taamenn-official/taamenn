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

test('privacy copy describes opt-in Ahrefs and does not claim billing', () => {
  const combined = [...privacySections.en, ...privacySections.ar, ...termsSections.en, ...termsSections.ar]
    .map((section) => section.content)
    .join('\n');
  const analytics = privacySections.en.find((section) => section.id === 'analytics');
  assert.ok(analytics);
  assert.match(analytics.content, /analytics\.ahrefs\.com/);
  assert.match(analytics.content, /stays off until you turn it on/i);
  assert.equal(privacySections.ar.some((section) => section.id === 'analytics'), true);
  assert.doesNotMatch(combined, /Stripe|subscription|billing/i);
  assert.match(privacySections.en.map((section) => section.content).join('\n'), /IndexedDB and localStorage/);
  assert.match(privacySections.ar.map((section) => section.content).join('\n'), /IndexedDB وlocalStorage/);
});

test('privacy discloses Google advertising in Arabic and English without overclaiming', () => {
  for (const language of ['ar', 'en'] as const) {
    const section = privacySections[language].find((item) => item.id === 'advertising');
    assert.ok(section, language);
    assert.match(section.content, /Google/);
    assert.match(section.content, /https:\/\/policies\.google\.com\/privacy/);
    assert.match(section.content, /https:\/\/policies\.google\.com\/technologies\/ads/);
    assert.doesNotMatch(section.content, /GDPR|ca-pub-|all users are tracked|ad profile/i);
  }
  const english = privacySections.en.find((section) => section.id === 'advertising');
  assert.match(english?.content ?? '', /cookies or similar technologies/i);
  assert.match(english?.content ?? '', /personalized or non-personalized/i);
  assert.match(english?.content ?? '', /ad delivery, measurement, fraud prevention, and personalization/i);
  const arabic = privacySections.ar.find((section) => section.id === 'advertising');
  assert.match(arabic?.content ?? '', /ملفات تعريف الارتباط/);
  assert.match(arabic?.content ?? '', /مخصصة أو غير مخصصة/);
});
