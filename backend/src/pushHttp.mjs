import { config } from './config.mjs';
import { HttpError, jsonResponse, readJsonBody } from './http.mjs';
import { createRateLimiter } from './rateLimit.mjs';
import { vapidConfigured } from './webPush.mjs';
import { disableSubscription, enqueueTest, replaceSchedule, saveSubscription } from './pushStore.mjs';
import { processDuePushJobs } from './pushDispatch.mjs';

const subscribeLimiter = createRateLimiter({ maxAttempts: 12, windowMs: 60_000, cooldownMs: 5 * 60_000 });
const scheduleLimiter = createRateLimiter({ maxAttempts: 30, windowMs: 60_000, cooldownMs: 5 * 60_000 });
const testLimiter = createRateLimiter({ maxAttempts: 3, windowMs: 10 * 60_000, cooldownMs: 10 * 60_000 });

function mapError(error) {
  if (error?.code === 'capacity') throw new HttpError(429, 'Too many notification subscriptions.');
  if (error?.message === 'endpoint' || error?.message === 'keys' || error?.message === 'subscription') {
    throw new HttpError(400, 'The push subscription is not valid.');
  }
  throw error;
}

export function pushPublicConfig(request) {
  return jsonResponse(request, 200, {
    configured: vapidConfigured(),
    publicKey: vapidConfigured() ? config.vapid.publicKey : null,
  });
}

export async function pushSubscribe(request, ip) {
  if (!subscribeLimiter.check(ip)) throw new HttpError(429, 'Too many attempts. Try again later.');
  const body = await readJsonBody(request);
  try {
    const saved = await saveSubscription(body);
    return jsonResponse(request, 200, { ok: true, ...saved, configured: vapidConfigured() });
  } catch (error) {
    mapError(error);
  }
}

export async function pushUnsubscribe(request, ip) {
  if (!subscribeLimiter.check(ip)) throw new HttpError(429, 'Too many attempts. Try again later.');
  const body = await readJsonBody(request);
  try {
    const result = await disableSubscription(body.subscriptionId);
    return jsonResponse(request, 200, { ok: true, ...result });
  } catch (error) {
    mapError(error);
  }
}

export async function pushSchedule(request, ip) {
  if (!scheduleLimiter.check(ip)) throw new HttpError(429, 'Too many attempts. Try again later.');
  const body = await readJsonBody(request);
  try {
    const result = await replaceSchedule(body);
    if (!result.ok) throw new HttpError(404, 'No active push subscription.');
    return jsonResponse(request, 200, { ok: true, queued: result.queued, configured: vapidConfigured() });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    mapError(error);
  }
}

export async function pushTest(request, ip) {
  if (!testLimiter.check(ip)) throw new HttpError(429, 'Too many attempts. Try again later.');
  if (!vapidConfigured()) throw new HttpError(503, 'Background notifications are not configured.');
  const body = await readJsonBody(request);
  try {
    const queued = await enqueueTest(body.subscriptionId);
    if (!queued.ok) throw new HttpError(404, 'No active push subscription.');
    const delivery = await processDuePushJobs(Date.now());
    if (delivery.unconfigured) throw new HttpError(503, 'Background notifications are not configured.');
    return jsonResponse(request, 200, {
      ok: delivery.sent > 0 || queued.duplicate === true,
      sent: delivery.sent,
      duplicate: queued.duplicate === true,
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    mapError(error);
  }
}
