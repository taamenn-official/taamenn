import type { Match } from '../data/footballData';
import { sanitizeStoredTiming } from '../domain/matches/matchTiming.ts';

export function isPublicSafeMatch(m: Match) {
  return m.visibility === 'PUBLIC' || m.visibility === 'LOCAL';
}

export function publicMatches(matches: Match[]) {
  return matches.filter(isPublicSafeMatch);
}

export function publicMatchDto(m: Match): Match {
  return {
    id: m.id, type: m.type, team1: m.team1, team2: m.team2, score1: m.score1, score2: m.score2,
    status: m.status, dateLabel: m.dateLabel, dateKey: m.dateKey, story: m.story,
    title: m.title, stadium: m.stadium, city: m.city, time: m.time, timezone: m.timezone,
    durationMinutes: m.durationMinutes, timing: sanitizeStoredTiming(m.timing) ?? undefined,
    visibility: m.visibility === 'LOCAL' ? 'LOCAL' : 'PUBLIC',
    createdAt: m.createdAt, updatedAt: m.updatedAt,
  };
}
