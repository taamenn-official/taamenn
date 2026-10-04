import type { Match, MatchFormat, MatchTiming, MatchType, PlayerContribution } from '../data/footballData';
import { contributionCapacity, sanitizeMatchFormat } from '../domain/matches/matchFormat.ts';
import { sanitizeStoredTiming, scheduleFromMatch, scheduleFromTiming, timingFingerprint } from '../domain/matches/matchTiming.ts';
import { formatClockRange } from '../shared/formatting/matchPresentation.ts';
import { dateKeyToISO, PALESTINE_TIMEZONE } from '../shared/formatting/dateTime.ts';
import { canonicalStatus, hasRecordedResult, normalizeMatch } from './matchLifecycle.ts';
import { emitMatchNotification } from './notificationService.ts';

const VERSION = 5;
const MAX_PAYLOAD = 16 * 1024;
const MATCH_TYPES: MatchType[] = ['strong', 'normal', 'friendly', 'competitive', 'tournament'];
const IDENTITY_RE = /^[A-Za-z0-9._:-]{1,80}$/;

/**
 * Share tokens are local, client-readable, and client-editable.
 * `allowSave` is an application-level import gate (UI + write path), not
 * cryptographic authorization. Do not add a backend merely to make this token
 * authoritative.
 */
export type MatchSharePayload = {
  v: 2 | 3 | 4 | 5;
  id?: string;
  originId?: string;
  allowSave: boolean;
  type: MatchType;
  team1: string;
  team2: string;
  title?: string;
  score1: number;
  score2: number;
  status: string;
  dateLabel: string;
  dateKey: number;
  stadium?: string;
  city?: string;
  time?: string;
  /** Occupied window in minutes. Older links omit it and stay on the legacy 60-minute fallback. */
  durationMinutes?: number;
  /** Enough structure to rebuild periods and breaks. Absent on links created before v5. */
  timing?: MatchTiming;
  story?: string;
  matchFormat?: MatchFormat;
  visibility: 'PUBLIC';
  playerContributions?: {
    team1: PlayerContribution[];
    team2: PlayerContribution[];
  };
};

export type SharedImportKind = 'new' | 'up-to-date' | 'update-available' | 'collision';

export type SharedImportDecision = {
  kind: SharedImportKind;
  local?: Match;
  incoming: Match;
};

function asType(value: unknown): MatchType {
  return MATCH_TYPES.includes(value as MatchType) ? (value as MatchType) : 'normal';
}

function clipIdentity(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clipped = value.trim().slice(0, 80);
  return IDENTITY_RE.test(clipped) ? clipped : undefined;
}

function shareTiming(match: Match): MatchTiming {
  return sanitizeStoredTiming(match.timing)
    ?? { mode: 'continuous', durationMinutes: scheduleFromMatch(match).playingMinutes };
}

function clipContributions(list: unknown, limit = 5): PlayerContribution[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, limit).map((row) => {
    const item = row as Partial<PlayerContribution>;
    return {
      playerName: String(item.playerName || '').slice(0, 60),
      goals: Number(item.goals) || 0,
      assists: Number(item.assists) || 0,
    };
  }).filter((row) => row.playerName);
}

function safe(m: Match, options: { includeContributions?: boolean; allowSave?: boolean } = {}): MatchSharePayload {
  if (m.visibility === 'PRIVATE') throw new Error('Private matches cannot be publicly shared.');
  const match = normalizeMatch(m);
  const originId = clipIdentity(match.originId || match.id) || match.id.slice(0, 80);
  const base: MatchSharePayload = {
    v: VERSION,
    id: match.id.slice(0, 80),
    originId,
    allowSave: options.allowSave === true,
    type: asType(match.type),
    team1: String(match.team1).slice(0, 120),
    team2: String(match.team2).slice(0, 120),
    title: match.title ? String(match.title).slice(0, 160) : undefined,
    score1: Number(match.score1) || 0,
    score2: Number(match.score2) || 0,
    status: canonicalStatus(match.status),
    dateLabel: String(match.dateLabel || '').slice(0, 100),
    dateKey: Number(match.dateKey),
    stadium: match.stadium ? String(match.stadium).slice(0, 120) : undefined,
    city: match.city ? String(match.city).slice(0, 120) : undefined,
    time: match.time ? String(match.time).slice(0, 10) : undefined,
    durationMinutes: scheduleFromMatch(match).scheduledMinutes,
    timing: shareTiming(match),
    story: match.story ? String(match.story).slice(0, 500) : undefined,
    matchFormat: sanitizeMatchFormat(match.matchFormat),
    visibility: 'PUBLIC',
  };
  if (options.includeContributions && match.playerContributions) {
    const limit = contributionCapacity(sanitizeMatchFormat(match.matchFormat) ?? '5v5');
    return {
      ...base,
      playerContributions: {
        team1: clipContributions(match.playerContributions.team1, limit),
        team2: clipContributions(match.playerContributions.team2, limit),
      },
    };
  }
  return base;
}

function encode(raw: string) {
  const bytes = new TextEncoder().encode(raw);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decode(payload: string) {
  const pad = payload + '='.repeat((4 - payload.length % 4) % 4);
  const bin = atob(pad.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function fnv1a(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function sharedMatchFingerprint(payload: Pick<MatchSharePayload, 'team1' | 'team2' | 'dateKey' | 'time' | 'score1' | 'score2' | 'stadium'> & Partial<Pick<MatchSharePayload, 'type' | 'title' | 'status' | 'story' | 'playerContributions' | 'timing'>>): string {
  const key = JSON.stringify([
    payload.team1, payload.team2, payload.dateKey, payload.time || '', payload.score1, payload.score2,
    payload.stadium || '', payload.type || '', payload.title || '', payload.status || '', payload.story || '',
    payload.playerContributions || null,
    timingFingerprint(payload.timing),
  ]);
  return `${fnv1a(key)}${fnv1a([...key].reverse().join(''))}`;
}

export function matchOriginId(match: Pick<Match, 'id' | 'originId'>): string {
  return match.originId || match.id;
}

export function contentFingerprint(match: Match): string {
  return sharedMatchFingerprint({
    team1: match.team1,
    team2: match.team2,
    dateKey: match.dateKey,
    time: match.time,
    score1: match.score1,
    score2: match.score2,
    stadium: match.stadium,
    type: match.type,
    title: match.title,
    status: String(canonicalStatus(match.status)),
    story: match.story,
    playerContributions: match.playerContributions,
    timing: sanitizeStoredTiming(match.timing) ?? undefined,
  });
}

export function classifySharedImport(incoming: Match, locals: Match[]): SharedImportDecision {
  const origin = matchOriginId(incoming);
  const byOrigin = locals.find((item) => matchOriginId(item) === origin);
  if (byOrigin) {
    if (contentFingerprint(byOrigin) === contentFingerprint(incoming)) {
      return { kind: 'up-to-date', local: byOrigin, incoming };
    }
    return { kind: 'update-available', local: byOrigin, incoming };
  }
  const byId = locals.find((item) => item.id === incoming.id);
  if (byId) return { kind: 'collision', local: byId, incoming };
  return { kind: 'new', incoming };
}

function explicitDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 1 || value > 1440) return null;
  return value;
}

function materializedTiming(payload: MatchSharePayload): { durationMinutes: number; timing?: MatchTiming } {
  const timing = sanitizeStoredTiming(payload.timing);
  if (timing) return { timing, durationMinutes: scheduleFromTiming(timing).scheduledMinutes };
  const durationMinutes = explicitDuration(payload.durationMinutes);
  if (durationMinutes === null) return { durationMinutes: 60 };
  return { durationMinutes, timing: { mode: 'continuous', durationMinutes } };
}

export function materializeSharedMatch(payload: MatchSharePayload): Match {
  const now = Date.now();
  const fingerprint = sharedMatchFingerprint(payload);
  const originId = clipIdentity(payload.originId)
    || (payload.v >= 4 ? clipIdentity(payload.id) : undefined)
    || `share:${fingerprint}`;
  const id = payload.v >= 4
    ? (clipIdentity(payload.id) || `SHARED-${fingerprint}`)
    : `SHARED-${fingerprint}`;
  const contributions = payload.playerContributions
    ? {
        team1: clipContributions(payload.playerContributions.team1),
        team2: clipContributions(payload.playerContributions.team2),
      }
    : undefined;
  return {
    id,
    originId,
    type: asType(payload.type),
    team1: payload.team1,
    team2: payload.team2,
    score1: Number(payload.score1) || 0,
    score2: Number(payload.score2) || 0,
    status: canonicalStatus(payload.status || 'UPCOMING'),
    dateLabel: payload.dateLabel || '',
    dateISO: dateKeyToISO(Number(payload.dateKey)),
    dateKey: Number(payload.dateKey),
    timezone: PALESTINE_TIMEZONE,
    story: payload.story || '',
    matchFormat: sanitizeMatchFormat(payload.matchFormat),
    title: payload.title,
    stadium: payload.stadium,
    city: payload.city,
    time: payload.time,
    ...materializedTiming(payload),
    visibility: 'LOCAL',
    source: 'local',
    sharedFingerprint: fingerprint,
    createdAt: now,
    updatedAt: now,
    playerContributions: contributions,
  };
}

export function encodeMatchShare(m: Match, options?: { includeContributions?: boolean; allowSave?: boolean }) {
  const token = encode(JSON.stringify(safe(m, options)));
  if (token.length > MAX_PAYLOAD) throw new Error('Share payload too large');
  return token;
}

export function decodeMatchShare(payload: string): MatchSharePayload | null {
  try {
    if (!payload || payload.length > MAX_PAYLOAD) return null;
    const x = JSON.parse(decode(payload)) as Partial<MatchSharePayload> & { v?: unknown; visibility?: unknown };
    const version = x.v === 2 || x.v === 3 || x.v === 4 || x.v === 5 ? x.v : null;
    if (version === null || x.visibility !== 'PUBLIC' || typeof x.team1 !== 'string' || typeof x.team2 !== 'string' || !/^\d{8}$/.test(String(Number(x.dateKey)))) return null;
    if (x.team1.length > 120 || x.team2.length > 120) return null;
    const timing = sanitizeStoredTiming(x.timing) ?? undefined;
    const durationMinutes = explicitDuration(x.durationMinutes) ?? undefined;
    return {
      v: version,
      id: clipIdentity(x.id),
      originId: clipIdentity(x.originId),
      allowSave: version === 2 ? true : x.allowSave === true,
      type: asType(x.type),
      team1: x.team1,
      team2: x.team2,
      title: x.title ? String(x.title).slice(0, 160) : undefined,
      score1: Number(x.score1) || 0,
      score2: Number(x.score2) || 0,
      status: canonicalStatus(String(x.status || 'UPCOMING') as Match['status']),
      dateLabel: String(x.dateLabel || '').slice(0, 100),
      dateKey: Number(x.dateKey),
      stadium: x.stadium ? String(x.stadium).slice(0, 120) : undefined,
      city: x.city ? String(x.city).slice(0, 120) : undefined,
      time: x.time ? String(x.time).slice(0, 10) : undefined,
      durationMinutes,
      timing,
      story: x.story ? String(x.story).slice(0, 500) : undefined,
      matchFormat: sanitizeMatchFormat(x.matchFormat),
      visibility: 'PUBLIC',
      playerContributions: x.playerContributions
        ? {
            team1: clipContributions(x.playerContributions.team1, contributionCapacity(sanitizeMatchFormat(x.matchFormat) ?? '5v5')),
            team2: clipContributions(x.playerContributions.team2, contributionCapacity(sanitizeMatchFormat(x.matchFormat) ?? '5v5')),
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

export function requireShareSave(payload: MatchSharePayload) {
  if (!payload.allowSave) throw new Error('share-view-only');
}

export function matchShareUrl(m: Match, options?: { includeContributions?: boolean; allowSave?: boolean }) {
  return `${location.origin}/share/match/${encodeMatchShare(m, options)}`;
}

export async function shareMatch(m: Match, options?: { includeContributions?: boolean; allowSave?: boolean }) {
  const url = matchShareUrl(m, options);
  try {
    if (navigator.share) {
      await navigator.share({ title: `${m.team1} × ${m.team2}`, text: m.title || 'TAAMEN match', url });
      await emitMatchNotification(m, 'shared');
      return { method: 'shared' as const, url };
    }
  } catch {
    /* fall through to clipboard / visible URL */
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      await emitMatchNotification(m, 'shared');
      return { method: 'copied' as const, url };
    }
  } catch {
    /* the URL is still shown in the share sheet */
  }
  await emitMatchNotification(m, 'shared');
  return { method: 'url' as const, url };
}

export function matchShareSvg(m: Match) {
  const title = m.title || `${m.team1} × ${m.team2}`;
  const score = hasRecordedResult(m.status) ? `${escapeXml(String(m.score1))} : ${escapeXml(String(m.score2))}` : 'VS';
  const when = m.time ? formatClockRange(m.time, scheduleFromMatch(m).scheduledMinutes, 'en') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#193940"/><stop offset="1" stop-color="#0c2025"/></linearGradient></defs><rect width="1200" height="630" rx="48" fill="url(#g)"/><circle cx="1030" cy="110" r="120" fill="#9BF272" opacity=".08"/><text x="120" y="100" fill="#BAC8D9" font-family="Arial" font-size="28">TAAMEN 2.0</text><text x="600" y="190" text-anchor="middle" fill="#9BF272" font-family="Arial" font-size="34">${escapeXml(String(m.type).toUpperCase())}</text><text x="600" y="300" text-anchor="middle" fill="#fff" font-family="Arial" font-size="56" font-weight="700">${escapeXml(title)}</text><text x="600" y="390" text-anchor="middle" fill="#fff" font-family="Arial" font-size="48">${escapeXml(m.team1)}  ${score}  ${escapeXml(m.team2)}</text><text x="600" y="475" text-anchor="middle" fill="#BAC8D9" font-family="Arial" font-size="28">${escapeXml(m.dateLabel)}${when ? ` · ${escapeXml(when)}` : ''}${m.stadium ? ` · ${escapeXml(m.stadium)}` : ''}</text><text x="600" y="545" text-anchor="middle" fill="#7ABF5A" font-family="Arial" font-size="22">PUBLIC SHARE</text></svg>`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

export function downloadMatchImage(m: Match) {
  const blob = new Blob([matchShareSvg(m)], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `taamen-${m.id}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
