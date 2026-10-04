import { CHALLENGE, TASKS, campaignPhase, isEventType, readSource } from './config.mjs';
import { clip, hmacHex, maskPhone, normalizePhone, participantPublicId, randomDigits, randomToken } from './crypto.mjs';
import { providerStatus, sendOtp } from './otpProvider.mjs';
import { getChallengeStore } from './store.mjs';

let nowFn = () => Date.now();
let envOverlay = {};

export function setChallengeEnv(env) {
  envOverlay = env || {};
}

function runtimeEnv(env) {
  return { ...process.env, ...envOverlay, ...env };
}

export function setChallengeNow(fn) {
  nowFn = fn || (() => Date.now());
}

function now() {
  return nowFn();
}

function secrets(env = runtimeEnv()) {
  return {
    hash: env.CHALLENGE_HASH_SECRET || '',
    session: env.CHALLENGE_SESSION_SECRET || env.CHALLENGE_HASH_SECRET || '',
    operator: env.CHALLENGE_OPERATOR_TOKEN || '',
  };
}

function unavailable() {
  return { status: 503, error: 'challenge_backend_unavailable' };
}

function phaseError(at = new Date(now())) {
  const phase = campaignPhase(at);
  if (phase === 'before') return { status: 403, error: 'campaign_not_started' };
  if (phase === 'ended') return { status: 403, error: 'campaign_ended' };
  return null;
}

export function publicConfig(env = runtimeEnv()) {
  const phase = campaignPhase(new Date(now()));
  return {
    campaignId: CHALLENGE.id,
    phase,
    start: CHALLENGE.start,
    end: CHALLENGE.end,
    timeZone: CHALLENGE.timeZone,
    prize: CHALLENGE.prize,
    otpAvailable: providerStatus(env).available && Boolean(secrets(env).hash) && Boolean(getChallengeStore()),
    tasks: TASKS.map(task => ({ id: task.id, required: task.required, evidence: task.evidence })),
  };
}

export async function requestOtp({ phone, source, env = runtimeEnv() }) {
  const blocked = phaseError();
  if (blocked) return blocked;
  const store = getChallengeStore();
  const secret = secrets(env);
  if (!store || !secret.hash) return unavailable();
  const normalized = normalizePhone(phone);
  if (!normalized) return { status: 400, error: 'invalid_phone' };
  const status = providerStatus(env);
  if (!status.available) return { status: 503, error: 'otp_provider_unavailable' };
  const phoneHash = await hmacHex(normalized, secret.hash);
  const latest = await store.latestOtp(CHALLENGE.id, phoneHash);
  if (latest && now() - latest.sent_at < CHALLENGE.otpResendMs) return { status: 429, error: 'otp_rate_limited' };
  await store.invalidateOtps(CHALLENGE.id, phoneHash, now());
  const code = randomDigits();
  const otpHash = await hmacHex(code, secret.hash);
  await store.insertOtp({
    campaign_id: CHALLENGE.id,
    phone_hash: phoneHash,
    challenge_token_hash: await hmacHex(randomToken(16), secret.hash),
    otp_hash: otpHash,
    sent_at: now(),
    expires_at: now() + CHALLENGE.otpTtlMs,
    created_at: now(),
  });
  const sent = await sendOtp({ phone: normalized, code, phoneHash, env });
  if (!sent.ok) return { status: 503, error: 'otp_provider_unavailable' };
  await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: 'otp_requested', source: readSource(source), created_at: now() });
  return { status: 200, body: { ok: true, delivery: 'accepted' } };
}

export async function verifyOtp({ phone, code, displayName, source, env = runtimeEnv() }) {
  const blocked = phaseError();
  if (blocked) return blocked;
  const store = getChallengeStore();
  const secret = secrets(env);
  if (!store || !secret.hash || !secret.session) return unavailable();
  const normalized = normalizePhone(phone);
  if (!normalized || !/^\d{6}$/.test(String(code || ''))) return { status: 400, error: 'otp_invalid' };
  const phoneHash = await hmacHex(normalized, secret.hash);
  const otp = await store.latestOtp(CHALLENGE.id, phoneHash);
  if (!otp) return { status: 400, error: 'otp_invalid' };
  if (otp.expires_at <= now()) return { status: 400, error: 'otp_expired' };
  if (otp.attempt_count >= CHALLENGE.otpMaxAttempts) return { status: 429, error: 'otp_attempt_limit' };
  const expected = await hmacHex(String(code), secret.hash);
  if (expected !== otp.otp_hash) {
    const attempts = otp.attempt_count + 1;
    await store.bumpOtp(otp.id, { attempt_count: attempts, used_at: attempts >= CHALLENGE.otpMaxAttempts ? now() : null });
    return { status: attempts >= CHALLENGE.otpMaxAttempts ? 429 : 400, error: attempts >= CHALLENGE.otpMaxAttempts ? 'otp_attempt_limit' : 'otp_invalid' };
  }
  await store.bumpOtp(otp.id, { used_at: now() });
  let participant = await store.findParticipantByPhone(CHALLENGE.id, phoneHash);
  const name = clip(displayName, 40);
  if (!participant && name.length < 2) return { status: 400, error: 'otp_invalid' };
  if (!participant) {
    participant = await store.insertParticipant({
      campaign_id: CHALLENGE.id,
      participant_id: participantPublicId(),
      display_name: name,
      phone_hash: phoneHash,
      phone_verified_at: now(),
      status: 'active',
      source: readSource(source),
      campaign_version: CHALLENGE.version,
      created_at: now(),
      updated_at: now(),
      last_activity_at: now(),
    });
    await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: 'participant_created', source: readSource(source), created_at: now() });
  } else {
    await store.updateParticipant(participant.participant_id, { phone_verified_at: participant.phone_verified_at || now(), last_activity_at: now(), updated_at: now() });
    await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: 'participant_recovered', source: readSource(source), created_at: now() });
  }
  await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: 'otp_verified', source: readSource(source), created_at: now() });
  const token = randomToken(32);
  await store.revokeSessions(participant.participant_id, now());
  await store.insertSession({
    campaign_id: CHALLENGE.id,
    participant_id: participant.participant_id,
    token_hash: await hmacHex(token, secret.session),
    created_at: now(),
    expires_at: now() + CHALLENGE.sessionTtlMs,
  });
  const progress = await progressFor(participant.participant_id);
  return { status: 200, token, body: { ok: true, ...progress, phoneMasked: maskPhone(normalized) } };
}

function taskState(count, required) {
  if (count >= required) return 'complete';
  if (count > 0) return 'active';
  return 'incomplete';
}

export async function progressFor(participantId) {
  const store = getChallengeStore();
  const participant = await store.findParticipantByPublicId(participantId);
  if (!participant) return null;
  const events = await store.listEvents(CHALLENGE.id, participantId);
  const countType = (type) => events.filter(item => item.event_type === type).length;
  const created = countType('match_created');
  const shared = countType('match_shared');
  const counts = {
    phone_verified: participant.phone_verified_at ? 1 : 0,
    use_taamenn: Math.min(1, created),
    create_5_matches: Math.min(5, created),
    share_3_matches: Math.min(3, shared),
    install_pwa: Math.min(1, countType('pwa_install_claimed')),
    instagram_follow: Math.min(1, countType('instagram_follow_claimed')),
    whatsapp_join: Math.min(1, countType('whatsapp_channel_claimed')),
  };
  const tasks = TASKS.map(task => ({
    id: task.id,
    required: task.required,
    count: counts[task.id] || 0,
    evidence: task.evidence,
    state: taskState(counts[task.id] || 0, task.required),
  }));
  const completed = tasks.filter(task => task.state === 'complete').length;
  const total = tasks.length;
  let status = participant.status;
  if (status === 'active' && completed === total) {
    status = 'eligible_pending_review';
    await store.updateParticipant(participantId, { status, updated_at: now(), last_activity_at: now() });
    await store.insertReview({
      campaign_id: CHALLENGE.id,
      participant_id: participantId,
      status,
      review_notes: '',
      reviewed_at: null,
      created_at: now(),
      updated_at: now(),
    });
    await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: 'challenge_eligible', source: participant.source, created_at: now() });
  }
  return {
    participantId,
    displayName: participant.display_name,
    status,
    provisional: tasks.some(task => task.evidence === 'soft_claim'),
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    tasks,
  };
}

export async function currentParticipant(token, env = runtimeEnv()) {
  const store = getChallengeStore();
  const secret = secrets(env);
  if (!store || !secret.session || !token) return null;
  const session = await store.findSession(await hmacHex(token, secret.session), now());
  if (!session) return null;
  return progressFor(session.participant_id);
}

export async function acceptEvents({ token, events, env = runtimeEnv() }) {
  const store = getChallengeStore();
  const secret = secrets(env);
  if (!store || !secret.session) return unavailable();
  const blocked = phaseError();
  if (blocked) return blocked;
  if (!token) return { status: 401, error: 'session_expired' };
  const session = await store.findSession(await hmacHex(token, secret.session), now());
  if (!session) return { status: 401, error: 'session_expired' };
  if (!Array.isArray(events) || events.length > 20) return { status: 400, error: 'event_rejected' };
  let accepted = 0;
  let duplicate = 0;
  for (const raw of events) {
    if (!raw || !isEventType(raw.type)) return { status: 400, error: 'event_rejected' };
    const clientEventId = clip(raw.clientEventId, 80);
    const key = clip(raw.eventKey, 80);
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(clientEventId) || !key) return { status: 400, error: 'event_rejected' };
    const metadata = {};
    if (raw.metadata && typeof raw.metadata === 'object') {
      for (const field of ['localMatchId', 'matchFingerprint']) {
        if (raw.metadata[field]) metadata[field] = clip(raw.metadata[field], 80);
      }
    }
    const result = await store.insertEvent({
      campaign_id: CHALLENGE.id,
      participant_id: session.participant_id,
      event_type: raw.type,
      event_key: `${raw.type}:${key}`,
      client_event_id: clientEventId,
      evidence_kind: raw.type.endsWith('_claimed') ? 'soft_claim' : 'recorded',
      occurred_at: Number.isFinite(Number(raw.occurredAt)) ? Number(raw.occurredAt) : now(),
      received_at: now(),
      metadata_json: JSON.stringify(metadata),
    });
    if (result.duplicate) duplicate += 1;
    else accepted += 1;
  }
  await store.updateParticipant(session.participant_id, { last_activity_at: now(), updated_at: now() });
  const progress = await progressFor(session.participant_id);
  return { status: 200, body: { ok: true, accepted, duplicate, ...progress } };
}

export async function setOperatorStatus({ token, participantId, status, env = runtimeEnv() }) {
  const secret = secrets(env);
  if (!secret.operator || token !== secret.operator) return { status: 404, error: 'not_found' };
  const allowed = new Set(['active', 'eligible_pending_review', 'finalist', 'winner', 'disqualified']);
  if (!allowed.has(status)) return { status: 400, error: 'event_rejected' };
  const store = getChallengeStore();
  if (!store) return unavailable();
  const participant = await store.findParticipantByPublicId(participantId);
  if (!participant) return { status: 404, error: 'not_found' };
  await store.updateParticipant(participantId, { status, updated_at: now() });
  await store.insertReview({
    campaign_id: CHALLENGE.id,
    participant_id: participantId,
    status,
    review_notes: '',
    reviewed_at: now(),
    created_at: now(),
    updated_at: now(),
  });
  if (status === 'winner' || status === 'finalist') {
    await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: status === 'winner' ? 'challenge_winner' : 'challenge_finalist', source: participant.source, created_at: now() });
  }
  return { status: 200, body: await progressFor(participantId) };
}

export async function recordView(source) {
  const store = getChallengeStore();
  if (!store) return;
  await store.recordFunnel({ campaign_id: CHALLENGE.id, event_name: 'campaign_view', source: readSource(source), created_at: now() });
}
