-- Challenge #01 only. This database is not the local match archive.
CREATE TABLE IF NOT EXISTS challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone_hash TEXT NOT NULL,
  phone_verified_at INTEGER,
  status TEXT NOT NULL,
  source TEXT,
  campaign_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  UNIQUE (participant_id),
  UNIQUE (campaign_id, phone_hash)
);

CREATE TABLE IF NOT EXISTS challenge_otp_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  phone_hash TEXT NOT NULL,
  challenge_token_hash TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON challenge_otp_challenges (phone_hash);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON challenge_otp_challenges (expires_at);

CREATE TABLE IF NOT EXISTS challenge_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_session_token ON challenge_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_session_expires ON challenge_sessions (expires_at);

CREATE TABLE IF NOT EXISTS challenge_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  client_event_id TEXT NOT NULL,
  evidence_kind TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  metadata_json TEXT,
  UNIQUE (campaign_id, participant_id, client_event_id),
  UNIQUE (campaign_id, participant_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_events_type ON challenge_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_participant ON challenge_events (participant_id, received_at);

CREATE TABLE IF NOT EXISTS challenge_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  review_notes TEXT,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (campaign_id, participant_id)
);

CREATE TABLE IF NOT EXISTS challenge_funnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  source TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_funnel_name ON challenge_funnel (campaign_id, event_name, created_at);
