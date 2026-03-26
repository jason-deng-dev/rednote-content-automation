**Project:** automation-ecosystem — Portfolio Documentation Guide

**Author:** Jason Deng

**Date:** March 2026

---

## Purpose

This doc exists for two reasons:

1. **Evidence capture** — a checklist of what to screenshot, record, and save before, during, and after deployment so the work is documented regardless of whether the live services stay up
2. **Interview prep** — technical talking points and framing for each component of the system

The live platform and pipelines are the primary artifacts. This doc ensures nothing is lost if a service goes down, a subscription lapses, or the platform pivots.

---

## 1. The Full Scope of Work

This is the complete list of things built for running.moximoxi.net — the level of scope to be able to articulate in interviews:

### Platform (WordPress)
- WordPress + WooCommerce from scratch — domain, hosting, production deployment, payments
- FluentCommunity discussion system + GamiPress gamification layer
- Marathon Readiness Toolkit — 4 vanilla JS tools with account-based persistence:
  - Race Time Estimator
  - Goal Pace Converter
  - Goal-Timeline Feasibility Check
  - Progress Trendline
- 4 core platform destinations: `/shop/`, `/racehub/`, `/mara-prep-tools/`, `/community/`

### XHS Content Pipeline (`services/xhs/`)
- Claude API (Sonnet) generates structured Chinese-language posts daily in the MOXI brand voice
- Playwright auto-publishes to XHS (MOXI爱跑步 account)
- Content strategy derived from 115 manually written posts and 60,481 total views — data-driven weighting and rotation
- 5 post types, configurable per-day schedule, operator-controllable via dashboard

### Scraper (`services/scraper/`)
- Weekly cron scrapes RunJapan for all upcoming Japanese marathons
- Two-pass scrape with session cookie handling — solved pagination and enterable-only filter
- Writes `races.json` to shared Docker volume
- ~60 races, full schema including entry periods, images, registration URLs

### Race Hub (`services/race-hub/`)
- Persistent Express API (:3001) serving `races.json` from the shared volume
- REST endpoints with query param filtering (status, date range, search, sort)
- React SPA bundled as a WordPress plugin — embedded on `/racehub/` via shortcode
- Zero WordPress DB involvement — pure frontend reading from the API

### Rakuten Aggregator (`services/rakuten/`)
- Fetches products from Rakuten Ichiba API — search, ranking, genre tree traversal
- Normalises, prices (configurable margin formula per category), pushes to WooCommerce
- PostgreSQL cache layer with TTL — rate limit protection and fast repeat lookups
- DeepL + TranslatePress for JA → ZH-HANS translation on first page view
- Multi-API orchestration: Rakuten API + DeepL + WooCommerce REST, error-isolated per service

### Dashboard (`services/dashboard/`)
- Operator-facing monitoring UI — Next.js + Tailwind CSS (:3000, PM2 + NGINX)
- Pipeline health cards, live log stream (SSE), run history, post archive
- XHS session re-auth via screenshot polling — no terminal access required
- Config writeback to shared volume (XHS schedule, Rakuten pricing, scrape limits)

### Infrastructure
- 5 Docker containers on a single AWS Lightsail VPS (`docker-compose.yml`)
- Shared Docker volume as communication bus between all containers
- HTTPS on all public endpoints, CORS for WordPress → Race Hub

---

## 2. What to Capture — Per Service

### 2.1 WordPress Platform

| Evidence | When to capture |
|---|---|
| Homepage, shop, community, marathon prep tools, race hub — full page screenshots | Before any outage risk |
| Marathon Readiness Toolkit — screen recording of all 4 tools in use | After deployment, when tools are working |
| WooCommerce product pages with imported Rakuten products | After Rakuten pipeline is live |
| Community page with GamiPress leaderboard/badges | After GamiPress is configured |

### 2.2 XHS Pipeline

| Evidence | When to capture |
|---|---|
| MOXI爱跑步 XHS account — profile page with follower count and total views | Ongoing — capture monthly |
| 3–5 top-performing posts (highest views/saves) — screenshot with stats visible | Now, and after each milestone |
| Pipeline running — terminal/log output showing a full generate+publish cycle | During development |
| Post on XHS immediately after auto-publish — shows it worked | After publisher.js is live |
| Dashboard showing XHS pipeline health card, post archive, live log | After dashboard is deployed |

**Key numbers to document:** 115 posts published manually, 60,481 total views (as of March 2026). Update these as the automated pipeline adds more.

### 2.3 Scraper + Race Hub

| Evidence | When to capture |
|---|---|
| `/racehub/` page on running.moximoxi.net — live race listings with filter/search working | After Race Hub is deployed |
| Race detail view with registration link | Same |
| `races.json` file — shows the data schema and race count | Any time |
| Dashboard showing scraper health card and last run | After dashboard deployed |
| Video of filter/search interaction on the race hub page | After frontend is live |

### 2.4 Rakuten Aggregator

| Evidence | When to capture |
|---|---|
| Browse UI — product grid with search/filter, product detail, import button | After frontend is built |
| WooCommerce shop page with auto-imported products | After first import run |
| Product page in WordPress — shows translated name/description in Chinese | After TranslatePress is wired |
| Dashboard showing Rakuten catalog stats | After dashboard deployed |
| `import_log.json` — shows successful imports | After pipeline runs |

### 2.5 Dashboard

| Evidence | When to capture |
|---|---|
| Home page — all 3 pipeline health cards showing live status | After all pipelines deployed |
| XHS login flow — screenshot stream showing QR code in browser | During first re-auth |
| Schedule config panel — per-day slot editor | After dashboard built |
| Rakuten pricing config panel | After dashboard built |
| Live log stream of an XHS pipeline run | After dashboard deployed |
| Full page recording of a manual trigger (generate → publish) | After dashboard deployed |

---

## 3. Demo Page Plan (XHS Pipeline)

A static demo page showing the XHS content pipeline output for portfolio use. Run the pipeline once per content category to generate one high-quality post each, then build a static preview page.

**Steps:**
1. Run generator once per type — Race Guide, Training Science, Nutrition, Health & Recovery
2. Save outputs as static JSON to `services/xhs/demo/posts/`
3. Build `services/xhs/demo/index.html` — XHS-style card layout, one card per category
4. Deploy as a standalone static page (GitHub Pages or equivalent)

**Purpose:** Shows post quality and format without requiring the live XHS account to be accessible. Works even if the pipeline is offline.

---

## 4. Interview Talking Points

### 4.1 System Design — "Walk me through the architecture"

> Five Docker containers on a single Lightsail VPS, orchestrated by docker-compose. They don't talk to each other over HTTP — they communicate through a shared Docker volume. Pipelines write state (logs, output data) to their namespace on the volume. The dashboard reads all of that state. The dashboard also writes config files back to the volume, which pipelines watch at runtime to adjust behavior without restarting. It's a file-based message bus — simple, inspectable, and zero infra overhead.

### 4.2 External APIs — "Tell me about a project with external API integration"

> The Rakuten pipeline orchestrates three external APIs in a single flow: Rakuten Ichiba for product data, DeepL for Japanese-to-Chinese translation, and WooCommerce REST to import into the live store. Each service has independent error handling — if DeepL is down, products display in Japanese with a "translation pending" flag rather than blocking the whole import. Errors per service are logged without losing the batch. The one API call that must always be fresh (WooCommerce price) re-fetches from Rakuten at import time, even if the rest of the product data is cached.

### 4.3 Caching / Rate Limits — "How did you handle API rate limits?"

> PostgreSQL cache layer with a 24-hour TTL for Rakuten product data. Browse sessions hit the cache — only cache misses and forced refreshes call the Rakuten API. This decouples the UI response time from external API latency, protects against rate limit spikes during bulk browse sessions, and means the catalog stays usable even if Rakuten has downtime.

### 4.4 Pricing Logic — "Walk me through a piece of business logic you implemented"

> The pricing formula is: sale price = (Rakuten cost + shipping estimate) / (1 − margin%). Shipping estimates and margins are configurable per category — nutrition products are lighter than equipment, so lower shipping estimates and slightly tighter margins. The config lives in a single file on the shared volume, writable by the dashboard. Operators can adjust margins per category at runtime without touching code or restarting anything.

### 4.5 Automation — "Tell me about an automation project"

> Built a fully automated content pipeline for Xiaohongshu. Claude API generates structured Chinese-language posts calibrated against 115 manually written posts and 60k+ views of real performance data — the content strategy (weighting, rotation, title patterns) is derived from that empirical baseline, not guesswork. Playwright auto-publishes directly to the XHS web client. The session management problem (XHS requires manual QR code login) was solved without requiring terminal access — the dashboard streams Playwright screenshots over SSE, the operator scans the QR code from a browser, and the session is saved automatically.

### 4.6 Frontend Embedding — "How did you embed a React app in WordPress?"

> Bundled a React SPA with Vite and registered it as a WordPress plugin. The plugin registers a shortcode and enqueues the bundled JS/CSS. When the shortcode is placed on a page, it renders a mount div and the React app boots. All data comes from the Express API on Lightsail — WordPress just hosts the static assets. CORS on the API allows requests from the WordPress domain. No WordPress DB involved, no custom post types, no WP REST API.

---

## 5. Resume Framing

**Title:** Full-Stack Developer & Growth Engineer

**One-liner:** Built the platform from scratch, then automated the bottlenecks — content generation, race data, and product sourcing — with a five-container automation system on AWS.

**Bullet points for resume:**
- Built running.moximoxi.net end-to-end — WordPress + WooCommerce, FluentCommunity, GamiPress, and a 4-module Marathon Readiness Toolkit in vanilla JS with account-based persistence
- Built a Claude-powered XHS content pipeline generating 115+ posts with 60k+ views, auto-published via Playwright — zero manual effort per post after deployment
- Built a product aggregator orchestrating Rakuten API + DeepL + WooCommerce REST with a PostgreSQL cache layer — imports Japanese running products into WooCommerce with auto-translated Chinese listings
- Built a weekly race scraper + React SPA WordPress plugin serving live race data from RunJapan to an embedded race hub page
- All pipelines monitored via an operator-facing dashboard (Next.js + Tailwind) with SSE live logs, config writeback, and browser-based XHS session re-auth — no terminal access required for daily operations
