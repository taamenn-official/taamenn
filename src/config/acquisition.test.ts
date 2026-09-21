import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACQUISITION_LISTING_URL,
  ACQUISITION_OG_IMAGE,
  ACQUISITION_PRICE_LABEL,
  ACQUISITION_PRICE_USD,
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
