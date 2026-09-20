# TAAMEN 2.0

TAAMEN 2.0 is one local-first football workspace with two experiences that share the same shell and design system:

- **Normal / General User** — no username or password. The active local TAAMEN experience includes Home, Archive, Match Center, Tactical Playground, Profile, Settings and Support.
- **Featured / Special Member** — lightweight member recognition from Settings using a Member ID only. It is intentionally read-only and exposes the historical archive and historical Match Center records only.

The Featured Member ID is an identifier, **not a password and not strong authentication**.

## Feature boundaries

| Feature | Normal | Featured |
|---|---:|---:|
| Home | YES | YES |
| Profile | YES | YES |
| Settings | YES | YES |
| Support | YES | YES |
| Current Archive | YES | NO |
| Historical Archive | NO | YES |
| Create / archive local matches | YES | NO |
| Match Center | YES | HISTORY ONLY |
| Tactical Playground | YES | NO |
| Tactical Radar | NO | NO |
| AI Assistant | NO | NO |
| Historical Match Records | NO | YES |
| Edit/Delete historical records | NO | NO |

## Support contact

Support messages are posted to `POST /api/public/contact`. EmailJS is backend-owned (`backend/.env`). The browser bundle must not contain EmailJS keys.

```text
Service ID:     service_13mkb9h
Public Key:     7xyuge5ZLIgBevcbL
Contact:        template_jsugxta
Auto Reply:     template_4pj4xlm
```

Copy `backend/.env.example` to `backend/.env`. Set `TAAMEN_SUPPORT_RECIPIENT` only in that secret file. Email verification remains **frozen / Coming Soon**.

```env
VITE_API_BASE_URL=/api
```

Vite proxies `/api` to `http://localhost:8787`. Set `VITE_API_BASE_URL=http://localhost:8787/api` only when the SPA and API are on different origins.

Production is a Cloudflare Worker that serves the Vite app and `/api/*` on the same origin (`https://taamenn.com`). `npm run backend` remains the local Node API. See `docs/DEPLOYMENT.md`.

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
npm run backend
```

The normal user experience is local-first and uses IndexedDB. Backend member recognition is retained as a lightweight compatibility endpoint; the UI does not treat Member IDs as passwords.

## Historical archive

The canonical historical snapshot is tracked at `backend/legacy-private-matches.json`.
It is the authoritative Featured / private match source for this repository. Do not
substitute `backend/data.example.json` or other fixtures.

Prepare the Cloudflare KV `data` document (does not upload, does not include sessions):

```bash
npm run kv:prepare -- --legacy backend/legacy-private-matches.json
```

That writes gitignored `backend/kv-data.json`. Review it, then after a real `TAAMEN_KV`
namespace id exists:

```bash
npx wrangler kv key put data --binding TAAMEN_KV --path backend/kv-data.json
```

Historical records are served only to Featured Member recognition sessions via
`GET /api/private/historical`. They are not imported by the local IndexedDB archive
and must not appear in the frontend bundle. Migrated records carry `source: legacy`.
Locally created records use `source: local`.

## PWA.

The existing PWA manifest and service worker are preserved.

## AI

AI Assistant, AI navigation, AI page, AI entry points and AI API routes are removed from the active product.
