# TAAMEN Home Widgets

In-app components are TAAMEN Home Widgets. Future Android and iOS widgets are Native Home Screen Widgets. A React card is never called a native widget in the UI.

## Current widgets

They live in `src/components/widgets/` and render inside the PWA:

| Widget | Question it answers |
| --- | --- |
| Next match | What is the next fixture, or the live / result-pending match if that is the real lifecycle state? |
| Quick actions | How do I open Match Center, Archive, Tactical, or Profile? |
| Stats | What are the real archive, decided, draw, and pending counts? |
| Recent result | What was the last recorded score? |
| Archive summary | How big is the archive, and how do I open it? |
| Upcoming | What are the next two or three fixtures? |
| Venues | How do I open stadiums? |

`WidgetShell` variants are `default`, `prominent`, `compact`, `accent`, `dark`, and `interactive`. They control padding, radius, border, and title. They do not add a dashboard builder or a widget framework.

Home order: greeting, next match, quick actions, a stats/recent pair, an archive/upcoming pair, venues, then the existing Home ad slot. The ad is not above the next match. There are no new placements.

Empty upcoming is a short line. Counts come from recorded matches only. There is no win-rate figure.

## Data contract

Repository reads. Selectors derive. Widgets render.

`summarizeHome(matches, scope)` is the one Home model. `scope: 'local'` drops `PRIVATE` and `legacy` rows so featured history cannot leak into the general dashboard. `scope: 'featured'` uses only the featured list passed in. The two sources are never merged.

`TaamenWidgetSnapshot` version 1 (`src/domain/matches/widgetSnapshot.ts`) contains:

- `generatedAt`
- `scope` (`local` or `featured`, not a session)
- next match fields (teams, place, time, status, stored score)
- up to two upcoming fixtures
- one recent result
- archive counts

It has no tokens, cookies, EmailJS config, API secrets, or profile fields. It is safe to bridge later. Nothing in this pass writes it to native storage.

## Future native widgets

This pass is the web half only: shell, selectors, snapshot type, and deep links. It does not add Android AppWidget, iOS WidgetKit, Kotlin, Swift, Capacitor, or a second data layer.

A later native widget should answer one glance (next match, next two, or latest result), not the whole app. Sizes to plan for: Android small / medium / large, and iOS `systemSmall` / `systemMedium` / `systemLarge`.

The future flow is: the app builds a snapshot, native code stores that snapshot, the widget reads the store, and a tap opens the existing hash deep link. Widgets must not call Cloudflare. There is no continuous realtime channel. Local mode reads local IndexedDB. A featured session reads the featured source. Session identity never goes into the snapshot.

## Refresh

The web shell reconciles when it becomes visible, gains focus, comes online, or hears `taamen-matches-changed`, and once at the next real match boundary. A match that starts in 42 minutes does not cause a 15-second IndexedDB poll.
