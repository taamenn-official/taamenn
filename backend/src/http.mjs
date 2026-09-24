import { config } from './config.mjs';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
};

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const direct = headers[name];
  if (typeof direct === 'string') return direct;
  const lower = headers[name.toLowerCase()];
  return typeof lower === 'string' ? lower : '';
}

export function originHeaders(request) {
  const origin = headerValue(request.headers, 'origin');
  if (!origin) return {};
  if (!config.allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
    // Credentialed CORS from the Vite origin must not be blocked by CORP.
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
}

export function jsonHeaders(request, extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...originHeaders(request),
    ...extra,
  };
}

export function jsonResponse(request, status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders(request, extra),
  });
}

export function noContentResponse(request, status, extra = {}) {
  return new Response(null, {
    status,
    headers: { ...SECURITY_HEADERS, ...originHeaders(request), ...extra },
  });
}

export function parseCookies(request) {
  const raw = headerValue(request.headers, 'cookie');
  const out = {};
  for (const part of raw.split(';')) {
    if (!part) continue;
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    out[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

/** Cookie attributes follow the deployment, not a guess: Secure only where the transport is secure. */
export function sessionCookie(token, maxAgeSeconds, secure) {
  const attributes = [
    `${config.sessionCookieName}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function clearedSessionCookie(secure) {
  return sessionCookie('', 0, secure);
}

export function isSecureRequest(request, platform = {}) {
  if (platform.encrypted) return true;
  try {
    if (new URL(request.url).protocol === 'https:') return true;
  } catch {
    /* ignore malformed URLs; fall through to forwarded proto */
  }
  if (!config.trustProxy) return false;
  return headerValue(request.headers, 'x-forwarded-proto').split(',')[0].trim() === 'https';
}

export class HttpError extends Error {
  constructor(status, message, { unreadBody = false } = {}) {
    super(message);
    this.status = status;
    /** True when the request body was abandoned part-way and still needs draining. */
    this.unreadBody = unreadBody;
  }
}

/** Enforce the limit while reading so an oversized body is never fully trusted. */
export async function readJsonBody(request) {
  const declared = Number(headerValue(request.headers, 'content-length'));
  if (Number.isFinite(declared) && declared > config.maxBodyBytes) {
    throw new HttpError(413, 'Request body is too large.');
  }
  let raw;
  try {
    raw = await request.arrayBuffer();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
  if (raw.byteLength > config.maxBodyBytes) {
    throw new HttpError(413, 'Request body is too large.');
  }
  if (!raw.byteLength) return {};
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  return parsed;
}

export function clientIp(request, platform = {}) {
  if (typeof platform.ip === 'string' && platform.ip) return platform.ip;
  // Forwarded addresses are trusted only behind a proxy that overwrites them.
  // A bare CF-Connecting-IP on Node is client-supplied and must not reset a limit.
  if (config.trustProxy) {
    const cf = headerValue(request.headers, 'cf-connecting-ip').trim();
    if (cf) return cf;
    const forwarded = headerValue(request.headers, 'x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0].trim();
      if (first) return first;
    }
  }
  return 'unknown';
}

/** HSTS only on HTTPS responses when the deployment requires HTTPS. */
export function withTransportHeaders(response, secure) {
  if (!secure || !config.requireHttps) return response;
  const headers = new Headers(response.headers);
  if (!headers.has('Strict-Transport-Security')) {
    headers.set('Strict-Transport-Security', 'max-age=15552000');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
