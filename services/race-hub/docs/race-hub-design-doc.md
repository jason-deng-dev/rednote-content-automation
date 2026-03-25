**Project:** automation-ecosystem — Race Hub

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/automation-ecosystem](https://github.com/jason-deng-dev/automation-ecosystem) (`services/race-hub/`)

**Author:** Jason Deng

**Date:** March 2026

**Status:** Not started

---

## 1. What This Is

The Race Hub is a persistent Express server running as a Docker container on AWS Lightsail. It reads `races.json` from the shared Docker volume (written weekly by the Scraper container) and serves it to the WordPress site via REST API. A React SPA embedded in WordPress as a plugin fetches from this API and renders the race listings page.

The Race Hub has no scraping logic. It is a pure data server — reads a file, serves it via HTTP, applies query param filtering.

---

## 2. Architecture

```
┌──────────────── AWS Lightsail VPS (docker-compose) ────────────────┐
│                                                                     │
│  [Scraper container]              [Race Hub container]              │
│   cron: scraper.js weekly          Express :3001 (always up)        │
│   no HTTP server                   GET /api/races                   │
│   pure cron process                GET /api/races/:id               │
│          │                         GET /api/races/upcoming          │
│          │ writes                         │                         │
│          ▼                               │ reads                    │
│    scraper/races.json  ◄─────────────────┘                          │
│    (shared volume)                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                  HTTPS
                              GET /api/races
                                    │
                                    ▼
                       [WordPress plugin on running.moximoxi.net]
                        React SPA bundled as WP plugin
                        shortcode: [race_hub]
                        fetches from Race Hub API on page load
                        renders race listing + detail views
                                    │
                                    ▼
                       running.moximoxi.net/racehub/
```

**Scraper and Race Hub are separate containers.** The Scraper is a pure cron process — no HTTP server. The Race Hub is a persistent Express server. They are decoupled: the scraper writes a file, the Race Hub serves it. Either can be restarted independently.

**How WordPress receives the data:** The React SPA is bundled (Vite) and registered as a WordPress plugin. When a visitor loads the race hub page, the browser makes a `GET /api/races` request directly to the Race Hub container on Lightsail. WordPress just hosts the shortcode and the bundled JS/CSS — all data and logic live on the VPS. CORS is configured to allow requests from `running.moximoxi.net`.

---

## 3. Express API

### 3.1 Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`GET`|`/api/races`|All races, supports query params|
|`GET`|`/api/races/:id`|Single race detail|
|`GET`|`/api/races/upcoming`|Races with `date >= today`, sorted by date|
|`POST`|`/api/sync`|Manual pipeline trigger (requires `X-Sync-Key` header)|

### 3.2 Query Params for `/api/races`

|Param|Values|Example|
|---|---|---|
|`status`|`open`, `closed`|`?status=open`|
|`after`|ISO date string|`?after=2026-06-01`|
|`before`|ISO date string|`?before=2026-12-31`|
|`search`|Race name substring|`?search=osaka`|
|`sort`|`date_asc`, `date_desc`|`?sort=date_asc`|

### 3.3 Implementation Notes

- Reads `races.json` from the shared Docker volume on each request (or caches in memory with a TTL — TBD)
- `GET /api/races/upcoming` must be defined before `GET /api/races/:id` in Express — otherwise Express matches "upcoming" as an `:id` param
- CORS configured to allow `running.moximoxi.net` as origin
- `POST /api/sync` spawns the scraper process and requires `X-Sync-Key` header matching an env var

---

## 4. React SPA (WordPress Plugin)

### 4.1 Race Listing View

- Card grid of upcoming races, sorted by date ascending by default
- Each card shows: race name, date, location, entry status badge
- Search bar: race name substring match
- Filter by entry status: All / Open / Closed
- Filter by date range
- Click card → race detail view

### 4.2 Race Detail View

- Full race info: name, date, location, entry period, description, images
- Entry status badge
- **"Register Now" button** — links to `registrationUrl` (RunJapan signup page), opens in new tab
- CTA section linking to platform ecosystem:
  - Race Hub (full details + more races)
  - Store (Japanese running products)
  - Community (runners planning the same race)
  - Marathon Prep Tools

### 4.3 UI States

- Loading skeleton on initial fetch
- Empty state when filters return no results
- Error state if Express API is unreachable

### 4.4 WordPress Integration

- React app bundled with Vite, output to `wp-plugin/dist/`
- WordPress plugin registers shortcode `[race_hub]`
- Shortcode enqueues the bundled JS/CSS and renders a mount point div
- Operator adds shortcode to any WordPress page — no code changes needed

---

## 5. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Data delivery|Express API serving races.json|WP custom post types + WP REST API|No WP DB schema needed; scraper just updates a file; any developer can understand the flow|
|Frontend embedding|React SPA as WordPress plugin|Standalone deployment, WP theme templates|Operator never leaves WordPress; maintainable by any WP developer; no separate hosting needed|
|Data store|races.json flat file (read-only for Race Hub)|PostgreSQL, SQLite|Sufficient for ~100-200 races; zero infra overhead; easy to inspect|
|Memory vs disk read|TBD — in-memory cache with TTL vs read-on-request|—|In-memory is faster; read-on-request is simpler and always fresh. Decide at build time.|

---

## 6. Implementation Phases

### Phase 1 — Express API

1. Build Express server: `GET /api/races`, `GET /api/races/:id`, `GET /api/races/upcoming`
2. Add query param filtering (status, date range, search, sort)
3. Add CORS for `running.moximoxi.net`
4. Add `POST /api/sync` manual trigger with `X-Sync-Key` header auth
5. Dockerfile + docker-compose integration

**Exit criteria:** API returns filtered race data from `races.json`. Manual sync trigger works.

### Phase 2 — React SPA WordPress Plugin

1. Build React SPA: race listing, filter panel, search, detail view with signup link and CTAs
2. Bundle with Vite, output to `wp-plugin/dist/`
3. Build WordPress plugin: register shortcode, enqueue bundled assets
4. Upload plugin to running.moximoxi.net, add shortcode to race hub page
5. Smoke test end-to-end: WordPress page loads → React SPA fetches from Lightsail API → races display

**Exit criteria:** Race hub page on running.moximoxi.net shows live races with filtering, detail view, and signup links working.

---

## 7. Engineering Challenges

### 7.1 CORS for WordPress → Lightsail API

**Challenge:** The React SPA embedded in WordPress (running.moximoxi.net) will make cross-origin requests to the Express API on Lightsail.

**Solution:** Add CORS headers to the Express API allowing `running.moximoxi.net` as an origin. Use the `cors` npm package — one-liner configuration.

### 7.2 Route Order: `/api/races/upcoming` vs `/api/races/:id`

**Challenge:** Express matches routes top-to-bottom. If `GET /api/races/:id` is registered before `GET /api/races/upcoming`, a request to `/api/races/upcoming` will match `:id` with the value `"upcoming"` and return a 404 (no race with id "upcoming").

**Solution:** Register `/api/races/upcoming` before `/api/races/:id` in `server.js`.

---

## 8. Open Questions

- **Image handling:** Hotlink race images from RunJapan CDN, or download and proxy through the API? Hotlinking is simpler but fragile if RunJapan changes image URLs.
- **Cache strategy:** Read `races.json` on every request (simple, always fresh) or cache in memory with a TTL (e.g. 1 hour)? For ~60 races this is negligible, so read-on-request is probably fine.
- **Alerts:** Should the dashboard show an alert if the weekly scrape returns < 30 races? Yes — add to dashboard spec.

---

## 9. Repository Structure

```
automation-ecosystem/
    └── services/
        ├── scraper/                    # Scraper container (pure cron, no HTTP)
        │   └── scraper.js              #   RunJapan scraper
        └── race-hub/                   # Race Hub container (this service)
            ├── server.js               #   Express API
            ├── wp-plugin/              #   WordPress plugin
            │   ├── race-hub.php        #     Registers [race_hub] shortcode, enqueues assets
            │   └── dist/              #     Vite build output (bundled React SPA)
            ├── Dockerfile
            └── package.json
```
