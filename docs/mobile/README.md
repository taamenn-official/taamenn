# TAAMEN mobile shell

TAAMEN stays a React + TypeScript + Vite PWA. The installed and mobile browser experience uses a compact shell. Home is the classic archive page, not a widget dashboard.

## Display modes

`src/mobile/useDisplayMode.ts` reports `browser` or `standalone` from `display-mode: standalone` and the legacy iOS `navigator.standalone` flag. The shell adds `is-browser` or `is-standalone`. It does not fork the layout.

## Install

`installService` is unchanged in how it detects Android, iOS, desktop, installed, and installable. The banner now has two compact states:

- Installable browsers get icon, a short line, Install, and close.
- iOS gets “Add TAAMEN to your Home Screen” and the real Share → Add to Home Screen steps. There is no fake native prompt.

Dismissal keys stay versioned: `taamen-install-dismissed-v1` and `taamen-ios-guidance-dismissed-v1`. Installed, dismissed, and irrelevant devices hide the banner.

## Navigation

Mobile nav is one bar: Home, Archive, Match Center, Tactical, Profile, Settings. Equal tracks, at least 44px targets, about 64px of content plus `env(safe-area-inset-bottom)`. The active mark is a thin bar, not a glowing pill. Tactical focus hides the bar. Desktop keeps the sidebar.

Route changes scroll with `auto` on viewports up to 900px and `smooth` on wider screens, unless reduced motion is on.

## Home

Home is the classic page: hero, archive statistics, the venues card, then the latest recorded matches. Local Home reads the current local archive. A featured session reads the historical list. Those sources stay separate.

## Deep links

`getDeepLinkForRoute` returns the existing hash route (`/#match-center`, `/#archive`, `/#tactical`, `/#home`). `parseAppDeepLink` also recognizes `/`, share URLs, `/acquisition`, `/privacy`, and `/terms`. There is no second router.

Manifest shortcuts use those same hashes. The manifest `id` is `/`, matching `start_url`.

## Safe areas

The header includes `env(safe-area-inset-top)`. The bottom nav and page padding include `env(safe-area-inset-bottom)`. Full-height shells use `100dvh` with a `100vh` fallback. `user-scalable` is not disabled.

## Performance rules

- Match repository init and legacy migration run once per page load.
- Lifecycle reconciliation runs on visible, focus, online, and `taamen-matches-changed`, then sleeps until the next kickoff, full-time, or 24-hour approaching boundary.
- Idle prefetch loads Archive and Match Center only.
- html2canvas stays off the Home path.
- Mobile atmosphere stays static. The performance pass blur reductions stay in place.
- `content-visibility` was not added; it was not measured on this pass.
