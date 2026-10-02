import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SIDEPROJECTORS_LISTING_URL, sideprojectorsCopy } from './sideprojectors.ts';

test('SideProjectors listing points at the official TAAMEN 2.0 project', () => {
  assert.equal(SIDEPROJECTORS_LISTING_URL, 'https://www.sideprojectors.com/project/95526/taamen-20');
  const badge = fs.readFileSync(fileURLToPath(new URL('../components/SideProjectorsBadge.tsx', import.meta.url)), 'utf8');
  const css = fs.readFileSync(fileURLToPath(new URL('../styles/global.css', import.meta.url)), 'utf8');
  assert.equal(badge.includes('badge_2_red.png'), false);
  assert.equal(badge.includes('<img'), false);
  assert.equal(css.includes('image-rendering: pixelated'), false);
  assert.match(badge, /SIDEPROJECTORS_LISTING_URL/);
});

test('SideProjectors copy is a calm acquisition label, not a sales claim', () => {
  assert.match(sideprojectorsCopy.ar.label, /SideProjectors/);
  assert.match(sideprojectorsCopy.en.label, /SideProjectors/);
  assert.equal(sideprojectorsCopy.ar.title, 'تأمين متاح للاستحواذ');
  assert.equal(sideprojectorsCopy.en.title, 'TAAMEN for acquisition');
  assert.equal(sideprojectorsCopy.en.hint, 'Official listing');
  const combined = `${sideprojectorsCopy.ar.label} ${sideprojectorsCopy.en.label} ${sideprojectorsCopy.en.title}`;
  assert.doesNotMatch(combined, /MRR|revenue|users|subscribers|guaranteed/i);
});
