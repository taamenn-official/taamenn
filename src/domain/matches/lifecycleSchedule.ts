import type { Match } from '../../data/footballData';
import { canonicalStatus, matchEndTime, matchStartTime } from '../../services/matchLifecycle.ts';

/** Approaching notifications open 24 hours before kickoff. */
export const APPROACHING_WINDOW_MS = 24 * 60 * 60 * 1000;

/** `setTimeout` cannot schedule past 2^31-1 ms. Wake once, then recompute. */
const MAX_TIMER_MS = 2_147_000_000;

/**
 * Milliseconds until the next real lifecycle boundary.
 * Boundaries are the approaching window, kickoff, and full time.
 * Returns null when nothing scheduled will change.
 */
export function nextLifecycleDelay(matches: Match[], now = Date.now()): number | null {
  let soonest = Infinity;
  for (const match of matches) {
    const status = canonicalStatus(match.status);
    if (status === 'COMPLETED_WITH_RESULT' || status === 'ARCHIVED' || status === 'COMPLETED_PENDING_RESULT') continue;
    const start = matchStartTime(match);
    if (!Number.isFinite(start)) continue;
    const end = matchEndTime(match);
    for (const at of [start - APPROACHING_WINDOW_MS, start, end]) {
      const delta = at - now;
      if (delta > 0 && delta < soonest) soonest = delta;
    }
  }
  if (!Number.isFinite(soonest)) return null;
  // Land just after the boundary so the projected status has flipped.
  return Math.min(soonest + 50, MAX_TIMER_MS);
}
