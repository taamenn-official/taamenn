import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  ACQUISITION_ASSETS_BASE,
  ACQUISITION_LISTING_URL,
  ACQUISITION_OG_IMAGE,
  ACQUISITION_PRICE_LABEL,
  ACQUISITION_PRICE_USD,
  ACQUISITION_PRODUCT_SHOTS,
  ACQUISITION_TRAFFIC_LABEL,
  ACQUISITION_TRAFFIC_PHRASE,
  ACQUISITION_VERSION,
} from './acquisition.ts';

test('acquisition commercial constants stay honest', () => {
  assert.equal(ACQUISITION_PRICE_USD, 4900);
  assert.equal(ACQUISITION_PRICE_LABEL, 'USD 4,900');
  assert.equal(ACQUISITION_VERSION, '2.0.0');
  assert.equal(ACQUISITION_LISTING_URL, 'https://www.sideprojectors.com/project/95526/taamen-20');
  assert.equal(ACQUISITION_OG_IMAGE, 'https://taamenn.com/assets/taamen-brand-mark.png');
});

test('launch telemetry phrasing is not unique-user language', () => {
  assert.equal(
    ACQUISITION_TRAFFIC_PHRASE,
    'Public beta traffic began in September 2026, with production requests first observed around 16 September 2026.',
  );
  assert.equal(ACQUISITION_TRAFFIC_LABEL, 'Cloudflare-observed traffic since launch');
  assert.doesNotMatch(ACQUISITION_TRAFFIC_PHRASE, /unique|MAU|users/i);
});

test('product shots are seven local files with no invented Archive capture', () => {
  assert.equal(ACQUISITION_ASSETS_BASE, '/acquisition-assets');
  assert.equal(Object.keys(ACQUISITION_PRODUCT_SHOTS).length, 7);
  assert.ok(!('archive' in ACQUISITION_PRODUCT_SHOTS));
  const assets = path.join(process.cwd(), 'public/acquisition-assets');
  for (const shot of Object.values(ACQUISITION_PRODUCT_SHOTS)) {
    assert.doesNotMatch(shot.file, /archive/i);
    assert.equal(fs.existsSync(path.join(assets, `${shot.file}.webp`)), true);
    assert.equal(fs.existsSync(path.join(assets, `${shot.file}.png`)), true);
  }
  assert.equal(fs.existsSync(path.join(assets, 'archive.png')), false);
  assert.equal(fs.existsSync(path.join(assets, 'archive.webp')), false);
});
