/** Challenge #01 public rules. Secrets stay in Worker env, never in this object. */
export const CHALLENGE = {
  id: 'taamen-venue-2026',
  version: 1,
  timeZone: 'Asia/Hebron',
  start: '2026-10-31',
  end: '2026-11-15',
  prize: {
    winners: 2,
    description: 'One hour of 5-a-side football for each winner at the official partner venue.',
  },
  sources: ['venue', 'instagram', 'whatsapp', 'poster', 'paid'],
  otpTtlMs: 5 * 60_000,
  otpMaxAttempts: 5,
  otpResendMs: 60_000,
  sessionTtlMs: 14 * 24 * 60 * 60_000,
  cookieName: 'taamen_challenge_session',
};

export const TASKS = [
  { id: 'phone_verified', required: 1, evidence: 'server_verified' },
  { id: 'use_taamenn', required: 1, evidence: 'recorded' },
  { id: 'create_5_matches', required: 5, evidence: 'recorded' },
  { id: 'share_3_matches', required: 3, evidence: 'recorded' },
  { id: 'install_pwa', required: 1, evidence: 'soft_claim' },
  { id: 'instagram_follow', required: 1, evidence: 'soft_claim' },
  { id: 'whatsapp_join', required: 1, evidence: 'soft_claim' },
];

const EVENT_TYPES = new Set([
  'match_created',
  'match_shared',
  'pwa_install_claimed',
  'instagram_follow_claimed',
  'whatsapp_channel_claimed',
]);

export function campaignDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHALLENGE.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function campaignPhase(now = new Date()) {
  const key = campaignDateKey(now);
  if (key < CHALLENGE.start) return 'before';
  if (key > CHALLENGE.end) return 'ended';
  return 'active';
}

export function readSource(value) {
  const source = String(value || '').trim().toLowerCase();
  return CHALLENGE.sources.includes(source) ? source : null;
}

export function isEventType(value) {
  return EVENT_TYPES.has(value);
}
