import assert from 'node:assert/strict';
import test from 'node:test';
import { PHASE1_MONETIZATION_ENABLED, placementEnabled } from './placements.ts';

test('phase 1 does not enable any sponsored placement', () => {
  assert.equal(PHASE1_MONETIZATION_ENABLED, false);
  assert.equal(placementEnabled('AdSlot'), false);
  assert.equal(placementEnabled('SponsoredCard'), false);
  assert.equal(placementEnabled('SponsoredVenue'), false);
  assert.equal(placementEnabled('SponsoredMatch'), false);
  assert.equal(placementEnabled('PartnerCard'), false);
});
