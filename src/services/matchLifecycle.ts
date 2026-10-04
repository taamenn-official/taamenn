import type { Match, MatchStatus } from '../data/footballData';
import { sanitizeMatchFormat } from '../domain/matches/matchFormat.ts';
import { legacyDurationMinutes, sanitizeStoredTiming, scheduleFromTiming } from '../domain/matches/matchTiming.ts';
import {
  dateISOToKey,
  dateKeyToISO,
  PALESTINE_TIMEZONE,
  zonedDateTimeToEpoch,
} from '../shared/formatting/dateTime.ts';

const CANONICAL = new Set<MatchStatus>([
  'UPCOMING',
  'ACTIVE',
  'COMPLETED_PENDING_RESULT',
  'COMPLETED_WITH_RESULT',
  'ARCHIVED',
]);

export function canonicalStatus(status: Match['status'] | string | undefined): MatchStatus {
  if (CANONICAL.has(status as MatchStatus)) return status as MatchStatus;
  if (status === 'LIVE') return 'ACTIVE';
  if (status === 'FINISHED' || status === 'انتهت') return 'COMPLETED_WITH_RESULT';
  return 'UPCOMING';
}

export function normalizeMatch(record: Match): Match {
  const dateISO = /^\d{4}-\d{2}-\d{2}/.test(record.dateISO || '')
    ? record.dateISO!.slice(0, 10)
    : dateKeyToISO(Number(record.dateKey));
  const dateKey = dateISOToKey(dateISO);
  const status = canonicalStatus(record.status);
  const score1 = Math.max(0, Math.trunc(Number(record.score1) || 0));
  const score2 = Math.max(0, Math.trunc(Number(record.score2) || 0));
  const timing = sanitizeStoredTiming(record.timing);
  const durationMinutes = timing
    ? scheduleFromTiming(timing).scheduledMinutes
    : legacyDurationMinutes(record.durationMinutes);
  const normalized: Match = {
    ...record,
    dateISO,
    dateKey,
    score1,
    score2,
    status,
    timezone: record.timezone || PALESTINE_TIMEZONE,
    durationMinutes,
    visibility: record.visibility || 'LOCAL',
    source: record.source || 'local',
    originId: record.originId || record.id,
    resultRecordedAt: status === 'COMPLETED_WITH_RESULT' || status === 'ARCHIVED'
      ? record.resultRecordedAt || record.updatedAt || record.createdAt
      : undefined,
  };
  if (timing) normalized.timing = timing;
  else delete normalized.timing;
  const matchFormat = sanitizeMatchFormat(record.matchFormat);
  if (matchFormat) normalized.matchFormat = matchFormat;
  else delete normalized.matchFormat;
  return normalized;
}

export function matchStartTime(match: Match): number {
  const normalized = normalizeMatch(match);
  return zonedDateTimeToEpoch(
    normalized.dateISO!,
    normalized.time || '00:00',
    normalized.timezone || PALESTINE_TIMEZONE,
  );
}

export function matchEndTime(match: Match): number {
  const normalized = normalizeMatch(match);
  return matchStartTime(normalized) + (normalized.durationMinutes || 60) * 60_000;
}

export function projectedStatus(match: Match, now = Date.now()): MatchStatus {
  const status = canonicalStatus(match.status);
  if (status === 'COMPLETED_PENDING_RESULT' || status === 'COMPLETED_WITH_RESULT' || status === 'ARCHIVED') {
    return status;
  }
  const start = matchStartTime(match);
  if (!Number.isFinite(start)) return status;
  if (now >= matchEndTime(match)) return 'COMPLETED_PENDING_RESULT';
  if (now >= start) return 'ACTIVE';
  return 'UPCOMING';
}

export function isMatchCenterStatus(status: Match['status'] | string | undefined): boolean {
  const value = canonicalStatus(status);
  return value === 'UPCOMING' || value === 'ACTIVE';
}

export function isArchiveStatus(status: Match['status'] | string | undefined): boolean {
  const value = canonicalStatus(status);
  return value === 'COMPLETED_PENDING_RESULT' || value === 'COMPLETED_WITH_RESULT' || value === 'ARCHIVED';
}

export function hasRecordedResult(matchOrStatus: Match | Match['status'] | string | undefined): boolean {
  const status = matchOrStatus && typeof matchOrStatus === 'object' ? matchOrStatus.status : matchOrStatus;
  const value = canonicalStatus(status);
  return value === 'COMPLETED_WITH_RESULT' || value === 'ARCHIVED';
}

/** Recording a score must not demote an already-archived match. */
export function statusAfterResult(status: Match['status'] | string | undefined): MatchStatus {
  return canonicalStatus(status) === 'ARCHIVED' ? 'ARCHIVED' : 'COMPLETED_WITH_RESULT';
}

export function validScore(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 99;
}
