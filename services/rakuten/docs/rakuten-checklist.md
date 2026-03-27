
- [x] Setup
  - [x] Initialize package.json
  - [x] Write .env.example (Rakuten API key, PostgreSQL credentials, WooCommerce credentials)
  - [x] Write .dockerignore
  - [x] Write .gitignore

- [ ] Rakuten API integration (`server/services/rakutenAPI.js`)
  - [x] Get products by keyword
  - [x] Get products by genre
  - [ ] getRanking(genreId, count) — fetch top-ranked products per genre via Ranking API

- [ ] Product normalization (`server/services/normalizeItems.js`)
  - [ ] normalizeItem(rawItem) — map Rakuten API fields to internal product schema

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

- [ ] Deploy to AWS Lightsail
