import type { Match } from '../data/footballData';
import { createArchivedMatch, deleteMatch, listMatches } from './matchRepository';
import { canonicalStatus, isArchiveStatus } from './matchLifecycle';
import { legacyDurationMinutes, sanitizeStoredTiming } from '../domain/matches/matchTiming';
import { dateKeyToISO } from '../shared/formatting/dateTime';

/** Archive is a projection of the canonical local Match collection. */
export async function listCurrentArchive(): Promise<Match[]> {
  return (await listMatches())
    .filter(m => m.source !== 'legacy')
    .filter(m => m.visibility !== 'PRIVATE')
    .filter(m => isArchiveStatus(m.status))
    .sort((a,b)=>b.dateKey-a.dateKey);
}

/** Compatibility facade for older callers; writes the canonical matches store only. */
export async function addMatchToArchive(match: Match): Promise<Match> {
  if (match.visibility === 'PRIVATE' || match.source === 'legacy') throw new Error('invalid-current-record');
  return createArchivedMatch({
    team1:match.team1,
    team2:match.team2,
    score1:match.score1,
    score2:match.score2,
    date:match.dateISO?.slice(0,10)||dateKeyToISO(match.dateKey),
    time:match.time||'00:00',
    stadium:match.stadium,
    city:match.city,
    type:match.type,
    timing:sanitizeStoredTiming(match.timing)??{mode:'continuous',durationMinutes:legacyDurationMinutes(match.durationMinutes)},
  });
}

export async function savePublicArchive(m: Match) {
  if (m.visibility === 'PRIVATE' || m.source === 'legacy') throw new Error('invalid-current-record');
  if(canonicalStatus(m.status)!=='ARCHIVED')throw new Error('invalid-current-record');
  return addMatchToArchive(m);
}

export async function removePublicArchive(id: string) {
  await deleteMatch(id);
}
