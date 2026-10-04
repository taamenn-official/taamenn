import { createRateLimiter } from '../rateLimit.mjs';
import { jsonResponse, parseCookies, readJsonBody } from '../http.mjs';
import { CHALLENGE } from './config.mjs';
import { acceptEvents, currentParticipant, publicConfig, recordView, requestOtp, setOperatorStatus, verifyOtp } from './service.mjs';

const otpLimiter = createRateLimiter({ maxAttempts: 8, windowMs: 10 * 60_000, cooldownMs: 10 * 60_000 });
const eventLimiter = createRateLimiter({ maxAttempts: 40, windowMs: 60_000, cooldownMs: 5 * 60_000 });

function tokenFrom(request) {
  return parseCookies(request)[CHALLENGE.cookieName] || '';
}

function challengeCookie(token, secure) {
  const parts = [
    `${CHALLENGE.cookieName}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${token ? Math.floor(CHALLENGE.sessionTtlMs / 1000) : 0}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function reply(request, result, secure) {
  const headers = result.token ? { 'Set-Cookie': challengeCookie(result.token, secure) } : {};
  if (result.body) return jsonResponse(request, result.status, result.body, headers);
  return jsonResponse(request, result.status, { error: result.error }, headers);
}

export async function challengeConfig(request) {
  const url = new URL(request.url);
  await recordView(url.searchParams.get('src'));
  return jsonResponse(request, 200, publicConfig());
}

export async function challengeOtpRequest(request, ip) {
  if (!otpLimiter.check(`otp:${ip}`)) return jsonResponse(request, 429, { error: 'otp_rate_limited' });
  const body = await readJsonBody(request);
  return reply(request, await requestOtp({ phone: body.phone, source: body.source }));
}

export async function challengeOtpVerify(request, ip, secure) {
  if (!otpLimiter.check(`verify:${ip}`)) return jsonResponse(request, 429, { error: 'otp_rate_limited' });
  const body = await readJsonBody(request);
  return reply(request, await verifyOtp({
    phone: body.phone,
    code: body.code,
    displayName: body.displayName,
    source: body.source,
  }), secure);
}

export async function challengeMe(request) {
  const progress = await currentParticipant(tokenFrom(request));
  if (!progress) return jsonResponse(request, 401, { error: 'session_expired' });
  return jsonResponse(request, 200, progress);
}

export async function challengeEvents(request, ip) {
  if (!eventLimiter.check(`event:${ip}`)) return jsonResponse(request, 429, { error: 'event_rate_limited' });
  const body = await readJsonBody(request);
  return reply(request, await acceptEvents({ token: tokenFrom(request), events: body.events }));
}

export async function challengeOperator(request) {
  const body = await readJsonBody(request);
  const header = request.headers.get('x-taamen-operator') || '';
  return reply(request, await setOperatorStatus({
    token: header,
    participantId: body.participantId,
    status: body.status,
  }));
}

export function challengeLogout(request, secure) {
  return jsonResponse(request, 200, { ok: true }, { 'Set-Cookie': challengeCookie('', secure) });
}
