import assert from 'node:assert/strict';
import test from 'node:test';
import type { Match } from '../../data/footballData.ts';
import { zonedDateTimeToEpoch } from '../../shared/formatting/dateTime.ts';
import { installBannerMode } from '../../infrastructure/pwa/installService.ts';
import { displayModeFromSignals } from '../../mobile/useDisplayMode.ts';
import { getDeepLinkForRoute, parseAppDeepLink } from '../../mobile/deepLinks.ts';
import { nextLifecycleDelay } from './lifecycleSchedule.ts';

const fixture = (patch: Partial<Match> = {}): Match => ({
  id: 'LOCAL-1',
  type: 'friendly',
  team1: 'TAAMEN',
  team2: 'Guests',
  score1: 0,
  score2: 0,
  status: 'UPCOMING',
  dateLabel: '',
  dateISO: '2026-09-24',
  dateKey: 20260924,
  time: '18:00',
  timezone: 'Asia/Jerusalem',
  durationMinutes: 60,
  visibility: 'LOCAL',
  source: 'local',
  story: '',
  ...patch,
});

test('display mode is browser or standalone from the display signals', () => {
  assert.equal(displayModeFromSignals(false, false), 'browser');
  assert.equal(displayModeFromSignals(true, false), 'standalone');
  assert.equal(displayModeFromSignals(false, true), 'standalone');
});

test('install banner shows a real prompt or iOS guidance, and hides when dismissed or installed', () => {
  assert.equal(installBannerMode('installable', false, false), 'install');
  assert.equal(installBannerMode('installable', true, false), 'hidden');
  assert.equal(installBannerMode('ios-guidance', false, false), 'ios');
  assert.equal(installBannerMode('ios-guidance', false, true), 'hidden');
  assert.equal(installBannerMode('installed', false, false), 'hidden');
  assert.equal(installBannerMode('unavailable', false, false), 'hidden');
});

test('lifecycle waits for the next real boundary instead of a 15s loop', () => {
  const start = zonedDateTimeToEpoch('2026-09-24', '18:00', 'Asia/Jerusalem');
  const now = start - 42 * 60 * 1000;
  const delay = nextLifecycleDelay([fixture({ time: '18:00' })], now);
  assert.ok(delay);
  assert.ok(delay > 41 * 60 * 1000 && delay < 43 * 60 * 1000);
  assert.notEqual(delay, 15_000);
  const far = zonedDateTimeToEpoch('2026-09-26', '18:00', 'Asia/Jerusalem');
  const farDelay = nextLifecycleDelay([fixture({ dateISO: '2026-09-26', dateKey: 20260926, time: '18:00' })], far - 30 * 60 * 60 * 1000);
  assert.ok(farDelay);
  assert.ok(farDelay > 5 * 60 * 60 * 1000);
  assert.equal(nextLifecycleDelay([fixture({ status: 'ARCHIVED', score1: 1, score2: 0 })], now), null);
});

test('deep links stay on the hash router and the existing public paths', () => {
  assert.equal(getDeepLinkForRoute('match-center'), '/#match-center');
  assert.equal(getDeepLinkForRoute('archive'), '/#archive');
  assert.equal(getDeepLinkForRoute('tactical'), '/#tactical');
  assert.deepEqual(parseAppDeepLink('https://taamenn.com/#match-center'), { kind: 'route', route: 'match-center' });
  assert.deepEqual(parseAppDeepLink('/#archive'), { kind: 'route', route: 'archive' });
  assert.deepEqual(parseAppDeepLink('https://taamenn.com/'), { kind: 'route', route: 'home' });
  assert.equal(parseAppDeepLink('/share/match/abc%20d').kind, 'share');
  assert.deepEqual(parseAppDeepLink('/acquisition'), { kind: 'acquisition' });
  assert.deepEqual(parseAppDeepLink('/trophy?src=instagram'), { kind: 'trophy' });
  assert.deepEqual(parseAppDeepLink('/privacy'), { kind: 'legal', document: 'privacy' });
  assert.deepEqual(parseAppDeepLink('/terms'), { kind: 'legal', document: 'terms' });
});
