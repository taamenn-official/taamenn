import type { HomeSummary } from './matchSelectors.ts';

/**
 * Version 1 glance payload for a future native home-screen widget.
 * Match facts only. No profile, session, tokens, cookies, or secrets.
 */
export type TaamenWidgetSnapshot = {
  version: 1;
  generatedAt: string;
  scope: 'local' | 'featured';
  nextMatch: null | {
    id: string;
    team1: string;
    team2: string;
    stadium?: string;
    city?: string;
    dateISO?: string;
    time?: string;
    status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED_PENDING_RESULT';
    score1: number;
    score2: number;
  };
  upcoming: Array<{
    id: string;
    team1: string;
    team2: string;
    dateISO?: string;
    time?: string;
  }>;
  recentResult: null | {
    id: string;
    team1: string;
    team2: string;
    score1: number;
    score2: number;
    dateISO?: string;
  };
  archive: {
    total: number;
    decided: number;
    draws: number;
    pending: number;
  };
};

const FORBIDDEN = ['token', 'cookie', 'email', 'password', 'member', 'session', 'phone', 'avatar'];

export function buildWidgetSnapshot(summary: HomeSummary, generatedAt = new Date().toISOString()): TaamenWidgetSnapshot {
  const dominant = summary.activeMatch ?? summary.nextMatch ?? summary.pendingMatch;
  const dominantStatus = summary.activeMatch
    ? 'ACTIVE'
    : summary.nextMatch
      ? 'UPCOMING'
      : summary.pendingMatch
        ? 'COMPLETED_PENDING_RESULT'
        : null;
  const snapshot: TaamenWidgetSnapshot = {
    version: 1,
    generatedAt,
    scope: summary.scope,
    nextMatch: dominant && dominantStatus ? {
      id: dominant.id,
      team1: dominant.team1,
      team2: dominant.team2,
      stadium: dominant.stadium,
      city: dominant.city,
      dateISO: dominant.dateISO,
      time: dominant.time,
      status: dominantStatus,
      score1: dominant.score1,
      score2: dominant.score2,
    } : null,
    upcoming: summary.upcoming.slice(0, 2).map(match => ({
      id: match.id,
      team1: match.team1,
      team2: match.team2,
      dateISO: match.dateISO,
      time: match.time,
    })),
    recentResult: summary.recent ? {
      id: summary.recent.id,
      team1: summary.recent.team1,
      team2: summary.recent.team2,
      score1: summary.recent.score1,
      score2: summary.recent.score2,
      dateISO: summary.recent.dateISO,
    } : null,
    archive: { ...summary.archive },
  };
  return snapshot;
}

export function snapshotHasPrivateMaterial(snapshot: TaamenWidgetSnapshot): boolean {
  const text = JSON.stringify(snapshot).toLowerCase();
  return FORBIDDEN.some(word => text.includes(word));
}
