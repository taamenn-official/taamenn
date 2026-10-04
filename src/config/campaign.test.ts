import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignPhase, isCampaignActive, readCampaignSource } from './campaign.ts';

test('the home campaign is active only from 31 October through 15 November 2026 in Asia/Hebron', () => {
  assert.equal(campaignPhase(new Date('2026-10-30T12:00:00Z')), 'before');
  assert.equal(isCampaignActive(new Date('2026-10-30T12:00:00Z')), false);
  assert.equal(campaignPhase(new Date('2026-10-31T12:00:00Z')), 'active');
  assert.equal(campaignPhase(new Date('2026-11-15T12:00:00Z')), 'active');
  assert.equal(campaignPhase(new Date('2026-11-16T12:00:00Z')), 'ended');
  assert.equal(isCampaignActive(new Date('2026-11-16T12:00:00Z')), false);
});

test('campaign source values stay on the known list', () => {
  assert.equal(readCampaignSource('instagram'), 'instagram');
  assert.equal(readCampaignSource(' VENUE '), 'venue');
  assert.equal(readCampaignSource('javascript:alert(1)'), null);
  assert.equal(readCampaignSource(''), null);
});
