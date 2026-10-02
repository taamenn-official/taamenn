# TAAMEN Web Push

Background match reminders use the Web Push API. The installed page does not stay open. A Cloudflare cron tick (`*/5 * * * *`) runs `scheduled()` in the existing Worker, which sends due jobs and skips any job already marked sent.

## Secrets

Set these on the Worker. Do not commit them and do not put the private key in frontend code, the service worker, or Wrangler vars.

```sh
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT
```

`VAPID_SUBJECT` is a `mailto:` contact, for example `mailto:support@taamenn.com`.

`VAPID_PUBLIC_KEY` is the uncompressed P-256 public key, base64url, 65 bytes starting with `0x04`.
`VAPID_PRIVATE_KEY` is the 32-byte private scalar, base64url.

Generate a pair locally with any Web Push key tool, then store only the public key where the browser can read it. The app loads the public key from `GET /api/push/config`. If either secret is missing, that endpoint returns `configured: false` and the Settings screen says background notifications are not configured. It does not pretend a test push succeeded.

## Storage

Subscriptions and reminder jobs live in the existing `TAAMEN_KV` binding under the key `push`. The historical `data` document and `sessions` are unchanged. A record stores the endpoint, encryption keys, an opaque device id, and notification preferences. It does not store passwords or the user's match archive.

## Local development

Tests and `npm run backend` keep the push document in memory. They do not need the production secrets. Delivery tests mock the push service.
