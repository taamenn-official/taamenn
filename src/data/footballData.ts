/**
 * Shared match domain model.
 *
 * This file holds types only. It previously also exported seed arrays that were a
 * second copy of the real private archive; those were unreferenced and were removed.
 * Match data reaches the UI from IndexedDB (local records) or the API (private records).
 */

export type MatchType = 'strong' | 'normal' | 'friendly' | 'competitive' | 'tournament';
export type MatchStatus =
  | 'UPCOMING'
  | 'ACTIVE'
  | 'COMPLETED_PENDING_RESULT'
  | 'COMPLETED_WITH_RESULT'
  | 'ARCHIVED';
export type LegacyMatchStatus = 'STARTING_SOON' | 'LIVE' | 'FINISHED' | 'انتهت';

export type MatchStats = {
  possession: number;
  shots: number;
  onTarget: number;
  saves: number;
  assists: number;
  passes: number;
  fouls: number;
  corners: number;
};

export type PlayerContribution = {
  playerName: string;
  goals: number;
  assists: number;
};

/**
 * Optional schedule structure. Missing `timing` means a legacy continuous match
 * whose `durationMinutes` is both playing time and the occupied window.
 * `durationMinutes` on the match itself stays the occupied window so older
 * lifecycle code still ends the match at the real finish.
 */
export type MatchTiming =
  | { mode: 'continuous'; durationMinutes: number }
  | { mode: 'periods'; periodCount: number; periodMinutes: number; breakMinutes: number };

export type Match = {
  createdBy?: string;
  id: string;
  type: MatchType;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  status: MatchStatus | LegacyMatchStatus;
  dateLabel: string;
  dateKey: number;
  dateISO?: string;
  story: string;
  title?: string;
  stadium?: string;
  city?: string;
  time?: string;
  timezone?: string;
  durationMinutes?: number;
  timing?: MatchTiming;
  visibility?: 'LOCAL'|'PUBLIC'|'PRIVATE';
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number;
  resultRecordedAt?: number;
  archivedAt?: number;
  /** Stable identity across shares. Equals `id` when the match is created locally. */
  originId?: string;
  sharedFingerprint?: string;
  source?: 'legacy'|'local';
  details?: { team1: MatchStats; team2: MatchStats };
  playerContributions?: {
    team1: PlayerContribution[];
    team2: PlayerContribution[];
  };
};

/**
 * `x` and `y` are percentages of the pitch bounds and are the only record of where a
 * player stands. The position label (GK, CB, ST ...) is derived from them by
 * `services/tacticalBoard`, so it is not part of the stored shape.
 */
export type TacticalPlayer = {
  id: string;
  team: 'home' | 'away';
  name: string;
  x: number;
  y: number;
  teamRole: string;
  instruction: string;
  captain: boolean;
};
