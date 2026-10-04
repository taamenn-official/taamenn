/**
 * Challenge persistence. Production Worker uses D1. Node tests and local dev
 * use the memory adapter. This is not TAAMEN_KV.
 */
let store = null;

export function setChallengeStore(next) {
  store = next;
}

export function getChallengeStore() {
  return store;
}

export function createMemoryChallengeStore() {
  const db = {
    participants: [],
    otps: [],
    sessions: [],
    events: [],
    reviews: [],
    funnel: [],
  };
  let seq = 1;
  const id = () => seq++;

  return {
    kind: 'memory',
    async insertParticipant(row) {
      if (db.participants.some(item => item.participant_id === row.participant_id)) throw new Error('unique-participant');
      if (db.participants.some(item => item.campaign_id === row.campaign_id && item.phone_hash === row.phone_hash)) throw new Error('unique-phone');
      const record = { id: id(), ...row };
      db.participants.push(record);
      return record;
    },
    async findParticipantByPhone(campaignId, phoneHash) {
      return db.participants.find(item => item.campaign_id === campaignId && item.phone_hash === phoneHash) || null;
    },
    async findParticipantByPublicId(participantId) {
      return db.participants.find(item => item.participant_id === participantId) || null;
    },
    async updateParticipant(participantId, patch) {
      const row = db.participants.find(item => item.participant_id === participantId);
      if (row) Object.assign(row, patch);
      return row || null;
    },
    async insertOtp(row) {
      const record = { id: id(), attempt_count: 0, used_at: null, ...row };
      db.otps.push(record);
      return record;
    },
    async latestOtp(campaignId, phoneHash) {
      return [...db.otps].reverse().find(item => item.campaign_id === campaignId && item.phone_hash === phoneHash && !item.used_at) || null;
    },
    async invalidateOtps(campaignId, phoneHash, now) {
      for (const item of db.otps) {
        if (item.campaign_id === campaignId && item.phone_hash === phoneHash && !item.used_at) item.used_at = now;
      }
    },
    async bumpOtp(idValue, patch) {
      const row = db.otps.find(item => item.id === idValue);
      if (row) Object.assign(row, patch);
      return row || null;
    },
    async insertSession(row) {
      const record = { id: id(), revoked_at: null, ...row };
      db.sessions.push(record);
      return record;
    },
    async findSession(tokenHash, now) {
      return db.sessions.find(item => item.token_hash === tokenHash && !item.revoked_at && item.expires_at > now) || null;
    },
    async revokeSessions(participantId, now) {
      for (const item of db.sessions) {
        if (item.participant_id === participantId && !item.revoked_at) item.revoked_at = now;
      }
    },
    async insertEvent(row) {
      if (db.events.some(item => item.campaign_id === row.campaign_id && item.participant_id === row.participant_id && item.client_event_id === row.client_event_id)) {
        return { duplicate: true };
      }
      if (db.events.some(item => item.campaign_id === row.campaign_id && item.participant_id === row.participant_id && item.event_key === row.event_key)) {
        return { duplicate: true };
      }
      db.events.push({ id: id(), ...row });
      return { duplicate: false };
    },
    async listEvents(campaignId, participantId) {
      return db.events.filter(item => item.campaign_id === campaignId && item.participant_id === participantId);
    },
    async insertReview(row) {
      const existing = db.reviews.find(item => item.campaign_id === row.campaign_id && item.participant_id === row.participant_id);
      if (existing) {
        Object.assign(existing, row);
        return existing;
      }
      const record = { id: id(), ...row };
      db.reviews.push(record);
      return record;
    },
    async recordFunnel(row) {
      db.funnel.push({ id: id(), ...row });
    },
  };
}
