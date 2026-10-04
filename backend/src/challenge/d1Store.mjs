/** D1 adapter. Node tests use the memory store instead. */
export function createD1ChallengeStore(db) {
  return {
    kind: 'd1',
    async insertParticipant(row) {
      await db.prepare(`INSERT INTO challenge_participants
        (campaign_id, participant_id, display_name, phone_hash, phone_verified_at, status, source, campaign_version, created_at, updated_at, last_activity_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        row.campaign_id, row.participant_id, row.display_name, row.phone_hash, row.phone_verified_at, row.status, row.source, row.campaign_version, row.created_at, row.updated_at, row.last_activity_at,
      ).run();
      return row;
    },
    async findParticipantByPhone(campaignId, phoneHash) {
      return db.prepare('SELECT * FROM challenge_participants WHERE campaign_id = ? AND phone_hash = ?').bind(campaignId, phoneHash).first();
    },
    async findParticipantByPublicId(participantId) {
      return db.prepare('SELECT * FROM challenge_participants WHERE participant_id = ?').bind(participantId).first();
    },
    async updateParticipant(participantId, patch) {
      const current = await db.prepare('SELECT * FROM challenge_participants WHERE participant_id = ?').bind(participantId).first();
      if (!current) return null;
      const next = { ...current, ...patch };
      await db.prepare(`UPDATE challenge_participants SET display_name=?, phone_verified_at=?, status=?, source=?, updated_at=?, last_activity_at=? WHERE participant_id=?`).bind(
        next.display_name, next.phone_verified_at, next.status, next.source, next.updated_at, next.last_activity_at, participantId,
      ).run();
      return next;
    },
    async insertOtp(row) {
      await db.prepare(`INSERT INTO challenge_otp_challenges
        (campaign_id, phone_hash, challenge_token_hash, otp_hash, attempt_count, sent_at, expires_at, used_at, created_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, NULL, ?)`).bind(
        row.campaign_id, row.phone_hash, row.challenge_token_hash, row.otp_hash, row.sent_at, row.expires_at, row.created_at,
      ).run();
      return row;
    },
    async latestOtp(campaignId, phoneHash) {
      return db.prepare(`SELECT * FROM challenge_otp_challenges WHERE campaign_id=? AND phone_hash=? AND used_at IS NULL ORDER BY id DESC LIMIT 1`).bind(campaignId, phoneHash).first();
    },
    async invalidateOtps(campaignId, phoneHash, now) {
      await db.prepare(`UPDATE challenge_otp_challenges SET used_at=? WHERE campaign_id=? AND phone_hash=? AND used_at IS NULL`).bind(now, campaignId, phoneHash).run();
    },
    async bumpOtp(id, patch) {
      await db.prepare(`UPDATE challenge_otp_challenges SET attempt_count=?, used_at=? WHERE id=?`).bind(patch.attempt_count ?? 0, patch.used_at ?? null, id).run();
      return patch;
    },
    async insertSession(row) {
      await db.prepare(`INSERT INTO challenge_sessions (campaign_id, participant_id, token_hash, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)`).bind(
        row.campaign_id, row.participant_id, row.token_hash, row.created_at, row.expires_at,
      ).run();
      return row;
    },
    async findSession(tokenHash, now) {
      return db.prepare(`SELECT * FROM challenge_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at > ?`).bind(tokenHash, now).first();
    },
    async revokeSessions(participantId, now) {
      await db.prepare(`UPDATE challenge_sessions SET revoked_at=? WHERE participant_id=? AND revoked_at IS NULL`).bind(now, participantId).run();
    },
    async insertEvent(row) {
      try {
        await db.prepare(`INSERT INTO challenge_events
          (campaign_id, participant_id, event_type, event_key, client_event_id, evidence_kind, occurred_at, received_at, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          row.campaign_id, row.participant_id, row.event_type, row.event_key, row.client_event_id, row.evidence_kind, row.occurred_at, row.received_at, row.metadata_json,
        ).run();
        return { duplicate: false };
      } catch {
        return { duplicate: true };
      }
    },
    async listEvents(campaignId, participantId) {
      const result = await db.prepare(`SELECT * FROM challenge_events WHERE campaign_id=? AND participant_id=?`).bind(campaignId, participantId).all();
      return result.results || [];
    },
    async insertReview(row) {
      await db.prepare(`INSERT INTO challenge_reviews (campaign_id, participant_id, status, review_notes, reviewed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(campaign_id, participant_id) DO UPDATE SET status=excluded.status, review_notes=excluded.review_notes, reviewed_at=excluded.reviewed_at, updated_at=excluded.updated_at`).bind(
        row.campaign_id, row.participant_id, row.status, row.review_notes || '', row.reviewed_at, row.created_at, row.updated_at,
      ).run();
      return row;
    },
    async recordFunnel(row) {
      await db.prepare(`INSERT INTO challenge_funnel (campaign_id, event_name, source, created_at) VALUES (?, ?, ?, ?)`).bind(
        row.campaign_id, row.event_name, row.source, row.created_at,
      ).run();
    },
  };
}
