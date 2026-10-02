import { config } from './config.mjs';
import {
  HttpError, clearedSessionCookie, clientIp, isSecureRequest, jsonResponse, noContentResponse,
  parseCookies, readJsonBody, sessionCookie, withTransportHeaders,
} from './http.mjs';
import { findActiveMemberByCode, findMemberById, store } from './store.mjs';
import { createSession, destroySession, readSession } from './sessions.mjs';
import { createRateLimiter } from './rateLimit.mjs';
import { requiredEmail, requiredString } from './validate.mjs';
import { historicalMatchDto, sessionMemberDto } from './dto.mjs';
import { contactConfigured, sendContactMessage } from './contact.mjs';
import { pushPublicConfig, pushSchedule, pushSubscribe, pushTest, pushUnsubscribe } from './pushHttp.mjs';
import { vapidConfigured } from './webPush.mjs';

const recognitionLimiter = createRateLimiter();
const contactLimiter = createRateLimiter({ maxAttempts: 3, windowMs: 10 * 60_000, cooldownMs: 30 * 60_000 });

/** Deliberately identical for unknown and wrong identifiers, to avoid enumeration. */
const REJECTED_CODE = 'Invalid member ID.';

function sessionToken(request) {
  return parseCookies(request)[config.sessionCookieName] || '';
}

/**
 * Resolve the caller's authorization context from the server-side session record.
 * Request bodies never contribute to this.
 * Only Featured Member recognition (`code`) sessions remain a product surface.
 */
async function currentActor(request) {
  const token = sessionToken(request);
  if (!token) return null;
  const session = await readSession(token);
  if (!session) return null;
  if (session.authMethod !== 'code') {
    await destroySession(token);
    return null;
  }
  const member = await store.read(data => findMemberById(data, session.memberId));
  if (!member || member.active === false) {
    await destroySession(token);
    return null;
  }
  return { token, session, member, role: member.role, authMethod: session.authMethod };
}

function requireActor(actor) {
  if (!actor) throw new HttpError(401, 'Authentication is required.');
  return actor;
}

/** Historical archive is the recognition scope. */
function requireRecognition(actor) {
  requireActor(actor);
  if (actor.authMethod !== 'code') {
    throw new HttpError(403, 'This resource is limited to member recognition sessions.');
  }
  return actor;
}

function issueSession(request, { member, authMethod, token, expiresAt, secure }) {
  const maxAge = Math.floor(config.sessionTtlMs / 1000);
  return jsonResponse(request, 200, {
    authenticated: true,
    authMethod,
    member: sessionMemberDto(member),
    expiresAt,
  }, { 'Set-Cookie': sessionCookie(token, maxAge, secure) });
}

const routes = [
  {
    method: 'GET',
    path: '/',
    handler: ({ request }) => jsonResponse(request, 200, { name: 'TAAMEN API', status: 'ok' }),
  },

  {
    method: 'GET',
    path: '/api/health',
    handler: ({ request }) => jsonResponse(request, 200, {
      ok: true,
      service: 'taamen-api',
      emailConfigured: contactConfigured(),
      pushConfigured: vapidConfigured(),
    }),
  },

  {
    method: 'POST',
    path: '/api/featured/member',
    handler: async ({ request, ip, secure }) => {
      if (!recognitionLimiter.check(ip)) {
        throw new HttpError(429, 'Too many attempts. Try again later.');
      }
      const body = await readJsonBody(request);
      const code = requiredString(body, 'memberCode', { max: 60 });
      const member = await store.read(data => findActiveMemberByCode(data, code));
      if (!member) throw new HttpError(401, REJECTED_CODE);
      recognitionLimiter.reset(ip);
      const { token, expiresAt } = await createSession({
        memberId: member.id,
        authMethod: 'code',
        role: member.role,
      });
      return issueSession(request, { member, authMethod: 'code', token, expiresAt, secure });
    },
  },

  {
    method: 'GET',
    path: '/api/auth/session',
    handler: async ({ request, actor }) => {
      if (!actor) return jsonResponse(request, 200, { authenticated: false });
      return jsonResponse(request, 200, {
        authenticated: true,
        authMethod: actor.authMethod,
        member: sessionMemberDto(actor.member),
        expiresAt: actor.session.expiresAt,
      });
    },
  },

  {
    method: 'POST',
    path: '/api/auth/logout',
    handler: async ({ request, secure }) => {
      const token = sessionToken(request);
      if (token) await destroySession(token);
      return jsonResponse(request, 200, { ok: true }, { 'Set-Cookie': clearedSessionCookie(secure) });
    },
  },

  {
    method: 'GET',
    path: '/api/private/historical',
    handler: async ({ request, actor }) => {
      requireRecognition(actor);
      const items = await store.read(data => data.matches.map(historicalMatchDto));
      items.sort((a, b) => b.dateKey - a.dateKey);
      return jsonResponse(request, 200, { items });
    },
  },

  {
    method: 'POST',
    path: '/api/public/contact',
    handler: async ({ request, ip }) => {
      if (!contactLimiter.check(ip)) {
        throw new HttpError(429, 'Too many messages. Try again later.');
      }
      const body = await readJsonBody(request);
      const email = requiredEmail(body, 'email', { max: config.contact.maxEmailLength });
      const message = requiredString(body, 'message', { min: 3, max: config.contact.maxMessageLength });
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length > config.contact.maxNameLength) {
        throw new HttpError(400, 'name is too long.');
      }
      if (!contactConfigured()) {
        throw new HttpError(503, 'The contact channel is not configured.');
      }
      const result = await sendContactMessage({ email, message, name });
      if (!result.contactSent) throw new HttpError(502, 'The message could not be delivered.');
      return jsonResponse(request, 200, {
        ok: true,
        contactSent: true,
        autoReplySent: result.autoReplySent === true,
      });
    },
  },

  {
    method: 'GET',
    path: '/api/push/config',
    handler: ({ request }) => pushPublicConfig(request),
  },
  {
    method: 'POST',
    path: '/api/push/subscribe',
    handler: ({ request, ip }) => pushSubscribe(request, ip),
  },
  {
    method: 'POST',
    path: '/api/push/unsubscribe',
    handler: ({ request, ip }) => pushUnsubscribe(request, ip),
  },
  {
    method: 'POST',
    path: '/api/push/schedule',
    handler: ({ request, ip }) => pushSchedule(request, ip),
  },
  {
    method: 'POST',
    path: '/api/push/test',
    handler: ({ request, ip }) => pushTest(request, ip),
  },
];

function matchRoute(pathname) {
  const candidates = [];
  for (const route of routes) {
    if (route.path) {
      if (route.path === pathname) candidates.push({ route, params: [] });
      continue;
    }
    const found = route.pattern.exec(pathname);
    if (found) candidates.push({ route, params: found.slice(1) });
  }
  return candidates;
}

function csrfHeader(request) {
  if (typeof request.headers.get === 'function') {
    return request.headers.get(config.csrfHeader);
  }
  return request.headers[config.csrfHeader];
}

/**
 * Shared TAAMEN API. Both the local Node adapter and the Cloudflare Worker
 * adapter call this with a Fetch Request.
 */
export async function handleFetch(request, platform = {}) {
  const response = await routeRequest(request, platform);
  return withTransportHeaders(response, isSecureRequest(request, platform));
}

async function routeRequest(request, platform = {}) {
  const url = new URL(request.url, 'http://localhost');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const secure = isSecureRequest(request, platform);
  const ip = clientIp(request, platform);

  if (config.requireHttps && !secure) {
    return jsonResponse(request, 426, { error: 'HTTPS is required.' });
  }

  if (request.method === 'OPTIONS') {
    return noContentResponse(request, 204, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': `Content-Type, ${config.csrfHeader}`,
      'Access-Control-Max-Age': '600',
    });
  }

  const candidates = matchRoute(pathname);
  if (!candidates.length) return jsonResponse(request, 404, { error: 'Not found.' });

  const chosen = candidates.find(candidate => candidate.route.method === request.method);
  if (!chosen) {
    const allowed = [...new Set(candidates.map(candidate => candidate.route.method))].join(', ');
    return jsonResponse(request, 405, { error: 'Method not allowed.' }, { Allow: allowed });
  }

  const mutating = request.method !== 'GET' && request.method !== 'HEAD';
  if (mutating && !csrfHeader(request)) {
    return jsonResponse(request, 403, { error: 'Missing required request header.' });
  }

  try {
    const actor = await currentActor(request);
    return await chosen.route.handler({
      request,
      actor,
      ip,
      secure,
      params: chosen.params,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(request, error.status, { error: error.message });
    }
    console.error('[taamen] unhandled request error:', error);
    return jsonResponse(request, 500, { error: 'Internal server error.' });
  }
}
