# TAAMEN Challenge #01

Challenge participation is not a TAAMEN account. Normal matches stay in IndexedDB. The challenge stores only a display name, a hashed phone, a public participant id, sessions, and small event receipts.

`/trophy` is not in desktop or mobile navigation. The Home card is the in-app entry, and only while the campaign is active (31 October 2026 through 15 November 2026, Asia/Hebron, inclusive).

## Evidence

- Phone verification is server-verified.
- Creating a local match records `match_created`. The first one completes “Use TAAMEN”. Five distinct matches complete “Create 5 matches”.
- A successful share records `match_shared`. Three distinct matches complete the share task.
- Install, Instagram, and WhatsApp are soft claims. The UI says “claim recorded”, not “verified”.
- Finishing every task sets `eligible_pending_review`. Copy says provisionally eligible. Winner is set only with the operator token.

## Secrets

Server only. Never `VITE_`.

- `CHALLENGE_HASH_SECRET`
- `CHALLENGE_SESSION_SECRET`
- `CHALLENGE_OPERATOR_TOKEN`
- `CHALLENGE_OTP_PROVIDER` (`dev` for tests, or the provider name)
- `CHALLENGE_OTP_API_KEY`
- `CHALLENGE_OTP_BASE_URL`
- `CHALLENGE_OTP_SENDER`
- `CHALLENGE_OTP_TEMPLATE`

Without the hash secret, OTP provider, and database, `/api/challenge/config` reports `otpAvailable: false` and join stays disabled.

## D1

Create the database and paste the real id into `wrangler.jsonc` (top level and `env.production`). Do not invent an id.

```sh
npx wrangler d1 create taamen-challenge
npx wrangler d1 migrations apply taamen-challenge --local
npx wrangler d1 migrations apply taamen-challenge --remote
npm run build:production
npx wrangler deploy
```

Local Node and tests use an in-memory challenge store. That is not production D1. The Worker uses `TAAMEN_CHALLENGE_DB` when the binding exists. `TAAMEN_KV` is unchanged.

## Retention

OTP rows are single-use and expire after five minutes. Sessions last 14 days. Do not keep review notes or phone hashes longer than the campaign review window. Raw phone numbers are not stored.
