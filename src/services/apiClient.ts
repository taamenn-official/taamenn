import type { Match } from '../data/footballData';
import { sanitizeStoredTiming } from '../domain/matches/matchTiming.ts';

/**
 * HTTP layer for remaining TAAMEN server features:
 * Featured Member recognition, historical records, and support contact.
 *
 * Private Circle password sessions are no longer a product surface.
 */
const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

/** A cross-site form cannot set a custom header, so requiring one blocks CSRF. */
const CSRF_HEADER = 'X-TAAMEN-Requested';

export type AuthMethod = 'code';

export type SessionMember = {
  id: string;
  username?: string;
  displayName: string;
  arabicName: string;
  role: string;
};

export type Session = {
  authenticated?: boolean;
  authMethod: AuthMethod;
  member: SessionMember;
  expiresAt: number;
};

export type ContactResult = {
  ok: true;
  contactSent: boolean;
  autoReplySent: boolean;
};

/** Carries the HTTP status so callers can distinguish "not signed in" from "not allowed". */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const isUnauthenticated = (error: unknown) => error instanceof ApiError && error.status === 401;
export const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403;

type RequestOptions = { method?: 'GET' | 'POST'; body?: unknown };

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function payloadError(payload: unknown): string | undefined {
  if (!isJsonObject(payload)) return undefined;
  return typeof payload.error === 'string' && payload.error.trim() ? payload.error : undefined;
}

/**
 * SPA fallbacks and proxy HTML pages must never be treated as API success.
 * That was the Featured "nothing happens" / false session path.
 */
function readJsonPayload(response: Response, raw: unknown): Record<string, unknown> {
  const contentType = response.headers.get('content-type') || '';
  const looksJson = contentType.includes('application/json');
  if (looksJson && isJsonObject(raw)) return raw;
  if (!looksJson && isJsonObject(raw) && (typeof raw.error === 'string' || raw.ok === true || 'authenticated' in raw || 'contactSent' in raw)) {
    return raw;
  }
  const status = response.ok ? 502 : response.status;
  throw new ApiError(status, 'TAAMEN server returned an unexpected response.');
}

function asContactResult(payload: Record<string, unknown>): ContactResult {
  if (payload.ok !== true || payload.contactSent !== true) {
    throw new ApiError(502, 'The message could not be delivered.');
  }
  return {
    ok: true,
    contactSent: true,
    autoReplySent: payload.autoReplySent === true,
  };
}

export function asRecognitionSession(payload: unknown): Session {
  if (!isJsonObject(payload) || payload.authMethod !== 'code' || !isJsonObject(payload.member)) {
    throw new ApiError(502, 'TAAMEN server returned an unexpected response.');
  }
  const member = payload.member;
  if (typeof member.id !== 'string' || !member.id || typeof member.displayName !== 'string') {
    throw new ApiError(502, 'TAAMEN server returned an unexpected response.');
  }
  return {
    authenticated: payload.authenticated === true,
    authMethod: 'code',
    member: {
      id: member.id,
      username: typeof member.username === 'string' ? member.username : undefined,
      displayName: member.displayName,
      arabicName: typeof member.arabicName === 'string' ? member.arabicName : '',
      role: typeof member.role === 'string' ? member.role : 'FEATURED_MEMBER',
    },
    expiresAt: typeof payload.expiresAt === 'number' ? payload.expiresAt : 0,
  };
}

async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers[CSRF_HEADER] = '1';

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'TAAMEN could not reach the server. Check your connection and try again.');
  }

  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payloadError(raw) || 'The request could not be completed.');
  }
  return readJsonPayload(response, raw) as T;
}

function toMatch(record: Record<string, unknown>): Match {
  return {
    id: String(record.id ?? ''),
    type: (record.type as Match['type']) ?? 'normal',
    team1: String(record.team1 ?? ''),
    team2: String(record.team2 ?? ''),
    score1: Number(record.score1) || 0,
    score2: Number(record.score2) || 0,
    status: (record.status as Match['status']) ?? 'ARCHIVED',
    dateLabel: String(record.dateLabel ?? ''),
    dateKey: Number(record.dateKey) || 0,
    dateISO: typeof record.dateISO === 'string' ? record.dateISO : undefined,
    story: typeof record.story === 'string' ? record.story : '',
    stadium: typeof record.stadium === 'string' ? record.stadium : undefined,
    city: typeof record.city === 'string' ? record.city : undefined,
    time: typeof record.time === 'string' ? record.time : undefined,
    durationMinutes: typeof record.durationMinutes === 'number' ? record.durationMinutes : undefined,
    timing: sanitizeStoredTiming(record.timing) ?? undefined,
    visibility: 'PRIVATE',
    source: 'legacy',
    details: record.details as Match['details'],
    playerContributions: record.playerContributions as Match['playerContributions'],
  };
}

export const api = {
  async session(): Promise<Session | null> {
    try {
      const value = await request<Record<string, unknown>>('/auth/session');
      if (value.authenticated === false) return null;
      if (value.authMethod !== 'code') {
        await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
        return null;
      }
      try {
        return asRecognitionSession(value);
      } catch {
        await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
        return null;
      }
    } catch (error) {
      if (isUnauthenticated(error)) return null;
      throw error;
    }
  },

  async recognizeMember(memberCode: string) {
    const payload = await request<Record<string, unknown>>('/featured/member', { method: 'POST', body: { memberCode } });
    return asRecognitionSession(payload);
  },

  logout() {
    return request<{ ok: true }>('/auth/logout', { method: 'POST' });
  },

  async historicalMatches(): Promise<Match[]> {
    const { items } = await request<{ items: Record<string, unknown>[] }>('/private/historical');
    if (!Array.isArray(items)) throw new ApiError(502, 'TAAMEN server returned an unexpected response.');
    return items.map(toMatch);
  },

  /** The support recipient is chosen by the server, never by this call. */
  async sendContactMessage(input: { email: string; message: string; name?: string }) {
    const payload = await request<Record<string, unknown>>('/public/contact', { method: 'POST', body: input });
    return asContactResult(payload);
  },

  pushConfig() {
    return request<{ configured: boolean; publicKey: string | null }>('/push/config');
  },

  savePushSubscription(body: unknown) {
    return request<{ ok: true; subscriptionId: string; enabled: boolean; configured: boolean }>('/push/subscribe', { method: 'POST', body });
  },

  disablePushSubscription(subscriptionId: string) {
    return request<{ ok: true; found: boolean; disabled: boolean }>('/push/unsubscribe', { method: 'POST', body: { subscriptionId } });
  },

  schedulePush(body: unknown) {
    return request<{ ok: true; queued: number; configured: boolean }>('/push/schedule', { method: 'POST', body });
  },

  sendTestPush(subscriptionId: string) {
    return request<{ ok: boolean; sent: number; duplicate: boolean }>('/push/test', { method: 'POST', body: { subscriptionId } });
  },
};
