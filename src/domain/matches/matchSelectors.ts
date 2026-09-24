import type { Match, MatchStatus } from '../../data/footballData';
import {
  hasRecordedResult,
  isArchiveStatus,
  matchEndTime,
  matchStartTime,
  projectedStatus,
} from '../../services/matchLifecycle.ts';

export type HomeScope = 'local' | 'featured';

export type ArchiveSummary = {
  total: number;
  decided: number;
  draws: number;
  pending: number;
};

export type CountdownPhase = 'upcoming' | 'live' | 'pending' | 'none';

export type NextMatchCountdownState = {
  phase: CountdownPhase;
  remainingMs: number;
  minute: number | null;
};

export type HomeSummary = {
  scope: HomeScope;
  nextMatch: Match | null;
  upcoming: Match[];
  latestResults: Match[];
  recent: Match | null;
  archive: ArchiveSummary;
  activeMatch: Match | null;
  pendingMatch: Match | null;
};

/** Local home never reads featured/private rows. Featured home uses only its own list. */
export function homeVisibleMatches(matches: Match[], scope: HomeScope): Match[] {
  if (scope === 'featured') return matches.slice();
  return matches.filter(match => match.visibility !== 'PRIVATE' && match.source !== 'legacy');
}

export function getUpcomingMatches(matches: Match[], now = Date.now()): Match[] {
  return matches
    .filter(match => projectedStatus(match, now) === 'UPCOMING')
    .sort((a, b) => matchStartTime(a) - matchStartTime(b) || a.id.localeCompare(b.id));
}

export function getNextMatch(matches: Match[], now = Date.now()): Match | null {
  return getUpcomingMatches(matches, now)[0] ?? null;
}

export function getActiveMatch(matches: Match[], now = Date.now()): Match | null {
  const active = matches.filter(match => projectedStatus(match, now) === 'ACTIVE');
  active.sort((a, b) => matchStartTime(b) - matchStartTime(a));
  return active[0] ?? null;
}

export function getPendingResults(matches: Match[], now = Date.now()): Match[] {
  return matches
    .filter(match => projectedStatus(match, now) === 'COMPLETED_PENDING_RESULT')
    .sort((a, b) => matchEndTime(b) - matchEndTime(a));
}

export function getRecentRecordedMatches(matches: Match[], limit = 3): Match[] {
  return matches
    .filter(match => hasRecordedResult(match))
    .sort((a, b) => (b.dateKey - a.dateKey) || ((b.resultRecordedAt || 0) - (a.resultRecordedAt || 0)) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export function getArchiveSummary(matches: Match[], now = Date.now()): ArchiveSummary {
  const archived = matches.filter(match => isArchiveStatus(projectedStatus(match, now)));
  const recorded = archived.filter(match => hasRecordedResult(match));
  return {
    total: archived.length,
    decided: recorded.filter(match => match.score1 !== match.score2).length,
    draws: recorded.filter(match => match.score1 === match.score2).length,
    pending: archived.filter(match => projectedStatus(match, now) === 'COMPLETED_PENDING_RESULT').length,
  };
}

export function getNextMatchCountdownState(match: Match | null, now = Date.now()): NextMatchCountdownState {
  if (!match) return { phase: 'none', remainingMs: 0, minute: null };
  const status = projectedStatus(match, now);
  const start = matchStartTime(match);
  const end = matchEndTime(match);
  if (status === 'ACTIVE') {
    const duration = Math.max(1, match.durationMinutes || 60);
    const minute = Number.isFinite(start) ? Math.min(duration, Math.max(0, Math.floor((now - start) / 60_000))) : null;
    return { phase: 'live', remainingMs: Number.isFinite(end) ? Math.max(0, end - now) : 0, minute };
  }
  if (status === 'COMPLETED_PENDING_RESULT') return { phase: 'pending', remainingMs: 0, minute: null };
  if (status === 'UPCOMING') {
    return { phase: 'upcoming', remainingMs: Number.isFinite(start) ? Math.max(0, start - now) : 0, minute: null };
  }
  return { phase: 'none', remainingMs: 0, minute: null };
}

/** One derived home model. Callers pass a single repository or featured read. */
export function summarizeHome(matches: Match[], scope: HomeScope, now = Date.now()): HomeSummary {
  const visible = homeVisibleMatches(matches, scope);
  const upcoming = getUpcomingMatches(visible, now);
  const latestResults = getRecentRecordedMatches(visible, 3);
  const pending = getPendingResults(visible, now);
  return {
    scope,
    nextMatch: upcoming[0] ?? null,
    upcoming,
    latestResults,
    recent: latestResults[0] ?? null,
    archive: getArchiveSummary(visible, now),
    activeMatch: getActiveMatch(visible, now),
    pendingMatch: pending[0] ?? null,
  };
}

export function dominantStatus(summary: HomeSummary, now = Date.now()): MatchStatus | 'EMPTY' {
  if (summary.activeMatch) return projectedStatus(summary.activeMatch, now);
  if (summary.nextMatch) return 'UPCOMING';
  if (summary.pendingMatch) return 'COMPLETED_PENDING_RESULT';
  return 'EMPTY';
}
