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
|`GET`|`/api/races`|Serves full `races.json` — no filtering, no params|

### 3.2 Implementation Notes

- Reads `races.json` from the shared Docker volume on each request (read-on-request — no cache)
- All filtering, sorting, search, and detail views are handled client-side in the React SPA
- CORS configured to allow `running.moximoxi.net` as origin
- Manual scrape trigger is handled by the Dashboard (`POST /api/scraper/trigger`) — Race Hub is a pure data server with no process-spawning logic

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

### 4.4 Tech Stack

- **React + Vite + Tailwind CSS**
- Tailwind configured with design system tokens from `docs/design-system.md` — same colour palette, spacing, and typography as the dashboard
- Styling follows the design system: Goldwin-inspired minimal aesthetic, sharp corners, warm off-white background, deep red accent (`#C8102E`)
- No border-radius on any element per design system

### 4.5 WordPress Integration

- React app bundled with Vite, output to `wp-plugin/dist/`
- WordPress plugin registers shortcode `[race_hub]`
- Shortcode enqueues the bundled JS/CSS and renders a mount point div
- Operator adds shortcode to any WordPress page — no code changes needed
- Tailwind output is scoped via a wrapper class to avoid clashing with the active WordPress/Flatsome theme CSS

---

## 5. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Data delivery|Express API serving races.json|WP custom post types + WP REST API|No WP DB schema needed; scraper just updates a file; any developer can understand the flow|
|Frontend embedding|React SPA as WordPress plugin|Standalone deployment, WP theme templates|Operator never leaves WordPress; maintainable by any WP developer; no separate hosting needed|
|Data store|races.json flat file (read-only for Race Hub)|PostgreSQL, SQLite|Sufficient for ~100-200 races; zero infra overhead; easy to inspect|
|Memory vs disk read|Read-on-request|In-memory cache with TTL|~50KB file, reads are instantaneous, no cache invalidation needed after scraper runs|
|Bundler|Vite|Create React App, Webpack|Fast dev server, clean static output for WordPress plugin embedding; Next.js rejected — SSR/file-based routing add complexity with no benefit for a WordPress-embedded widget|
|Styling|Tailwind CSS|Plain CSS modules, CSS-in-JS|Matches dashboard stack for consistency; design system tokens configured in tailwind.config.js; fast to build utility-heavy UI|

---

## 6. Implementation Phases

### Phase 1 — Express API

1. Build Express server: `GET /api/races` — serves full `races.json`
2. Add CORS for `running.moximoxi.net`
3. Dockerfile + docker-compose integration

**Exit criteria:** `GET /api/races` returns the full race list from `races.json`.

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

---

## 8. Resolved Decisions

- **Image handling:** Hotlink from RunJapan CDN. If RunJapan changes image URLs, the scraper gets updated at the same time — they're from the same source. Downloading and re-serving adds infra complexity for no real benefit.
- **Cache strategy:** Read-on-request. `races.json` is ~50KB for 60 races — reads are instantaneous, and there's no cache invalidation needed after a scrape runs.
- **Filtering:** Client-side in React SPA. ~60 races is trivially small — fetch once on page load, filter/sort/search in memory. No server-side query params needed.
- **Alerts:** Dashboard shows an alert if the weekly scrape returns < 30 races — already in the dashboard spec (§3).

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
