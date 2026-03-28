x
- [x] Setup
  - [x] Initialize package.json
  - [x] Write .env.example (Rakuten API key, PostgreSQL credentials, WooCommerce credentials)
  - [x] Write .dockerignore
  - [x] Write .gitignore

- [x] Rakuten API integration (`server/services/rakutenAPI.js`)
  - [x] Get products by keyword
  - [x] Get products by genre
  - [x] getRanking(genreId, count) — fetch top-ranked products per genre via Ranking API

- [x] Product normalization (`server/services/normalizeItems.js`)
  - [x] normalizeItem(rawItem) — map Rakuten API fields to internal product schema (built into rakutenAPI.js)

- [ ] Config (`server/config/`)
  - [ ] `config.js` — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold
  - [ ] Fill in missing genre IDs in `genres.js`

- [ ] Pricing (`server/services/pricing.js`)
  - [ ] calculatePrice(product, category) — apply margin formula per design doc Section 4.3
  - [ ] Load per-category config from pricing_config.js

- [ ] PostgreSQL product store (`server/db/store.js`)
  - [ ] Run schema.sql — create products table
  - [ ] upsertProduct(product) — insert if new URL, update if price/availability changed, skip if unchanged
  - [ ] URL-based deduplication (rakuten_url as unique key — no TTL)

- [ ] WooCommerce integration (`server/services/woocommerce.js`)
  - [ ] pushProduct(product) — push single product via WooCommerce REST API
  - [ ] bulkPush(products) — push multiple products, log each to import_log.json
  - [ ] Idempotency check by rakuten_url (not SKU)

- [ ] Initial bulk push
  - [ ] Fetch top-ranked products per category via Ranking API
  - [ ] Normalize → price → upsert into PostgreSQL
  - [ ] Push all to WooCommerce

- [ ] Configure TranslatePress + DeepL on running.moximoxi.net
  - [ ] Install TranslatePress plugin
  - [ ] Configure DeepL API key in TranslatePress settings
  - [ ] Verify JA → ZH-HANS translation fires on first product page view and caches in WordPress DB

- [ ] Product request flow
  - [ ] POST /api/request-product endpoint — keyword → Ranking API → normalize → price → store → push
  - [ ] SSE progress stream (GET /api/request-product/status/:requestId)
  - [ ] Embed progress indicator widget on WooCommerce search results page (shortcode or plugin)

- [ ] Weekly auto-sync cron
  - [ ] Fetch top-ranked products per category via Ranking API
  - [ ] Re-scrape upsert — skip unchanged, update if price changed, insert if new URL
  - [ ] Write run_log.json and product_stats.json to shared volume after each run

- [ ] Shared volume output
  - [ ] Write `rakuten/run_log.json` after each pipeline run (operation, category, products fetched/pushed, failures)
  - [ ] Write `rakuten/product_stats.json` after each run (total cached, total pushed, per-category breakdown)
  - [ ] Write `rakuten/import_log.json` per product WooCommerce push attempt and outcome
  - [ ] Read `rakuten/config.json` at runtime — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold

- [ ] Dashboard integration (Express :3002 — internal only)
  - [ ] POST /trigger — fetch more products (category + count)
  - [ ] POST /retry — retry failed WooCommerce imports
  - [ ] Pipeline state written to shared volume for dashboard health card (idle | running | failed)

- [ ] Deploy to AWS Lightsail
