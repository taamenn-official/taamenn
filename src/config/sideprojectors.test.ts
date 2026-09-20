import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SIDEPROJECTORS_BADGE_HEIGHT,
  SIDEPROJECTORS_BADGE_SRC,
  SIDEPROJECTORS_BADGE_WIDTH,
  SIDEPROJECTORS_LISTING_URL,
  sideprojectorsCopy,
} from './sideprojectors.ts';

test('SideProjectors listing points at the official TAAMEN 2.0 project', () => {
  assert.equal(SIDEPROJECTORS_LISTING_URL, 'https://www.sideprojectors.com/project/95526/taamen-20');
  assert.equal(SIDEPROJECTORS_BADGE_SRC, 'https://www.sideprojectors.com/img/badges/badge_2_red.png');
  assert.equal(SIDEPROJECTORS_BADGE_WIDTH, 45);
  assert.equal(SIDEPROJECTORS_BADGE_HEIGHT, 115);
});

test('SideProjectors copy is the safe listed-for-sale claim only', () => {
  assert.equal(sideprojectorsCopy.ar.label, 'معروض للبيع على SideProjectors');
  assert.equal(sideprojectorsCopy.en.label, 'Listed for sale on SideProjectors');
  const combined = `${sideprojectorsCopy.ar.label} ${sideprojectorsCopy.ar.alt} ${sideprojectorsCopy.en.label} ${sideprojectorsCopy.en.alt}`;
  assert.doesNotMatch(combined, /MRR|revenue|users|subscribers/i);
});
