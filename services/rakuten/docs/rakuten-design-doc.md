**Project:** automation-ecosystem — Rakuten Pipeline

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/automation-ecosystem](https://github.com/jason-deng-dev/automation-ecosystem) (`services/rakuten/`)

**Author:** Jason Deng

**Date:** March 2026

**Status:** In Development

---

## 1. Problem Statement

### 1.1 Context

running.moximoxi.net serves Chinese runners interested in Japanese running products. One of the platform's four core destinations is `/shop/` — a curated store selling Japanese running nutrition and gear (FANCL, Amino Vital, Pocari Sweat, SAVAS PRO, salt tabs).

Currently, products are added to WooCommerce manually. Each product requires: finding it on Rakuten, translating the name and description from Japanese, calculating a sale price with margin and shipping, downloading images, and creating the WooCommerce listing by hand. This bottleneck limits how many products the store can carry and how quickly new products can be added.

### 1.2 The Problem

Product ingestion needs to be:

- **Automated** — fetch directly from Rakuten, no manual copy-paste
- **Translated** — product names and descriptions are in Japanese; the platform audience reads Chinese
- **Priced intelligently** — sale price must account for Rakuten cost, estimated shipping, and target margin
- **Scalable** — bulk import dozens of products at once, not one at a time
- **Browsable** — operators need a UI to search, filter, and select products before importing

### 1.3 Goals

- Automate product ingestion from Rakuten Ichiba into WooCommerce — no manual copy-paste
- Translate product names and descriptions via TranslatePress + DeepL (JA → ZH-HANS) on first customer view, cached permanently
- Calculate auto-pricing using a margin formula (Rakuten price + shipping estimate + margin %)
- Pre-load ~500 products per category at launch; weekly cron auto-syncs new products to keep catalog fresh
- Expose a "Request a product" flow on the WooCommerce storefront — if a customer can't find a product, they submit a request, the backend fetches it from Rakuten, translates, prices, and pushes to WooCommerce while they wait (~1-2 min), with an on-page progress indicator
- WooCommerce handles all customer-facing browsing, cart, checkout, and payments — no custom storefront
- Cache Rakuten API results in PostgreSQL permanently for rate limit protection and fast repeat lookups

### 1.4 Non-Goals

- Custom React storefront — WooCommerce is the storefront
- Real-time price sync after initial WooCommerce import (v1 is import-only)
- Sourcing products from marketplaces other than Rakuten in v1

---

## 2. Architecture Role of Each Component

|Component|Role|
|---|---|
|**WooCommerce**|Full customer-facing storefront — product browsing, search, cart, checkout, payments|
|**Express API**|Backend pipeline — Rakuten fetch, normalize, translate, price, WooCommerce push, product request handler|
|**PostgreSQL**|Persistent product cache — rate limit protection and fast repeat lookups|
|**TranslatePress + DeepL**|JA → ZH-HANS translation on first customer page view, cached in WordPress DB permanently|
|**Stripe**|Payment processor (already integrated via WooCommerce)|

### Why WooCommerce as the storefront (not a custom React SPA)

A custom React SPA was considered and rejected for the following reasons:

1. **Zero support after handoff.** This platform will be operated by a non-technical operator after the original developer leaves. WooCommerce has 24/7 support, a massive plugin ecosystem, and any WordPress developer can maintain it. A custom React SPA has none of that — if it breaks, it stays broken.
2. **Security.** WooCommerce is battle-tested against fraud, injection attacks, and payment security edge cases. A custom checkout and cart built from scratch requires significant additional work to reach the same standard, and leaves the operator exposed to risks they have no way to diagnose or fix.
3. **Complexity without proportionate benefit.** A large pre-loaded catalog (500 products per category) + weekly auto-sync covers the vast majority of customer demand. The edge case of a missing product is handled by the "Request a product" flow — no live search infrastructure required.
4. **TranslatePress handles translation on the storefront.** Since the storefront is WordPress, TranslatePress + DeepL translates product pages on first customer view and caches them permanently in the WordPress DB — no custom translation pipeline in the frontend needed.

---

## 3. System Architecture

### 3.1 High-Level Overview

```
FETCH → CACHE → TRANSLATE → PRICE → DISPLAY → IMPORT
```

- **FETCH:** Rakuten APIs return raw product data (Japanese)
- **CACHE:** Results stored in PostgreSQL with TTL for rate limit protection
- **TRANSLATE:** DeepL translates names and descriptions to Chinese
- **PRICE:** Auto-pricing formula calculates sale price
- **DISPLAY:** React SPA displays products with search, filter, sort
- **IMPORT:** WooCommerce REST API receives selected products

### 3.2 Component Breakdown

#### rakutenAPI.js (exists, two functions working)

- `searchByKeyword(keyword, options)` — Ichiba Item Search API
- `searchByGenre(genreId, options)` — Ichiba Genre Search API
- `getRanking(genreId, options)` — Ichiba Ranking API (new)
- `getGenreInfo(genreId)` — Ichiba Genre Search API for genre tree (new)
- Returns normalized product objects

#### normalizeItems.js (exists as helper, needs extraction)

- Maps raw Rakuten API response fields to internal product schema
- Handles missing fields gracefully (null-safe)
- Deduplicates by `itemCode` across search and ranking results

#### genres.js (exists — curated genre ID map)

- Maps internal category names to Rakuten genre IDs
- Used by rakutenAPI.js to target specific product categories
- See Section 6 for full category structure

#### db/cache.js (new)

- PostgreSQL interface for product cache
- `getCachedProducts(query)` — returns cached results if fresh (< 24h)
- `cacheProducts(products, query)` — stores results with `fetched_at` timestamp
- `invalidateCache(query)` — force-refresh specific query
- TTL logic: if `fetched_at < now - 24h` → treat as stale, re-fetch from Rakuten

#### deepl.js (new)

- Wraps DeepL API for JA → ZH-HANS translation
- `translateProduct(product)` — translates `name` and `description` fields
- `translateBatch(products)` — batch translation to minimize API calls
- Caches translated text in PostgreSQL alongside product data (translate once, reuse)

#### pricing.js (new)

- `calculatePrice(rakutenPrice, options)` — applies margin formula
- Returns `{ sale_price, cost_price, margin_pct, shipping_estimate }`
- Configurable margin % and shipping estimate per category

#### woocommerce.js (new)

- Wraps WooCommerce REST API (Consumer Key + Consumer Secret auth)
- `pushProduct(product)` — creates single WooCommerce product
- `pushBulk(products)` — sequential bulk push with per-item result logging
- `checkExists(sku)` — checks if product already exists by SKU before pushing
- Maps internal product schema to WooCommerce product fields

#### Express API server / index.js (exists, needs productionizing)

- REST endpoints consumed by React SPA
- Orchestrates: cache check → Rakuten fetch → normalize → translate → price
- Handles WooCommerce push requests from frontend

#### React SPA frontend (not started)

- Product browsing, filtering, search, detail view
- Import controls: single product and bulk selection
- Pricing preview before import

### 3.3 Data Flow

#### Browse by genre
```
React SPA (user selects genre)
    ↓  (GET /api/products?genre_id=XXX)
Express API → PostgreSQL (return stored products for that genre)
    ↓
React SPA (displays product cards instantly)
```

#### Search (keyword)
```
React SPA (user types keyword)
    ↓  (GET /api/products/search?keyword=XXX)
Express API → PostgreSQL (check how many results we have)
    ├── search_fill_threshold+ results: return from DB immediately
    └── <search_fill_threshold results:
            ↓  live fetch from Rakuten API
        normalizeItems.js → deepl.js → pricing.js
            ↓  store permanently in PostgreSQL
        return combined DB + new results (up to search_fill_threshold)
            ↓
React SPA (displays results in ~1s)
```

`search_fill_threshold` defaults to 10 and is configurable in `pricing_config.js` — adjustable from the dashboard without touching code.

#### Add to cart (background WooCommerce push)
```
User clicks "Add to Cart" on React app
    ↓  (POST /api/cart)
Express API:
    1. Save item to cart in PostgreSQL
    2. Immediately trigger background push to WooCommerce
       (create product if not exists — fire and forget, don't await)
    ↓
React SPA responds instantly — user continues browsing
    ↓  (background, ~30-60s)
WooCommerce product created, wc_product_id stored in PostgreSQL
```

**Rationale:** Pushing a product to WooCommerce takes 30–60 seconds due to image sideloading. If we wait until checkout to push, the user is blocked staring at a loading screen. By triggering the push the moment a user adds to cart, we use the natural browse time (typically 2–5 minutes) to complete the push in the background. By the time the user reaches checkout, the products are already in WooCommerce and the order can be created immediately.

#### Checkout
```
User confirms cart in React, enters email + phone
    ↓  (POST /api/checkout)
Express API:
    1. Verify all cart items have wc_product_id (push complete)
       └── if any still pending: wait for push to finish
    2. POST /wp-json/wc/v3/orders — create WooCommerce order
       with customer details, line items, shipping
    3. WooCommerce returns payment_url
    ↓
React redirects user to payment_url (WordPress/Stripe)
    ↓
User completes payment on WordPress
    ↓
WooCommerce order confirmed — operator sees in WooCommerce backend
Email confirmation sent to customer automatically
```

---

## 4. Data Design

### 4.1 Internal Product Schema

```json
{
  "item_code": "amino-vital-pro-30sticks",
  "rakuten_item_code": "amovital:10000123",
  "name_ja": "アミノバイタル プロ 30本入",
  "name_zh": "氨基活力 PRO 30支装",
  "description_ja": "...",
  "description_zh": "...",
  "images": [
    "https://thumbnail.image.rakuten.co.jp/@0_mall/amovital/cabinet/img01.jpg"
  ],
  "rakuten_price": 3240,
  "sale_price": 4980,
  "cost_price": 3240,
  "shipping_estimate": 800,
  "margin_pct": 20,
  "genre_id": "505814",
  "genre_name": "Amino Acid",
  "category": "nutrition",
  "stock_status": "instock",
  "rakuten_url": "https://item.rakuten.co.jp/amovital/...",
  "fetched_at": "2026-03-17T02:00:00Z",
  "translated_at": "2026-03-17T02:01:00Z",
  "wc_product_id": null,
  "wc_pushed_at": null
}
```

### 4.2 PostgreSQL Schema

```sql
CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  item_code        VARCHAR(255) UNIQUE NOT NULL,
  rakuten_item_code VARCHAR(255),
  name_ja          TEXT,
  name_zh          TEXT,
  description_ja   TEXT,
  description_zh   TEXT,
  images           JSONB,
  rakuten_price    INTEGER,
  sale_price       INTEGER,
  cost_price       INTEGER,
  shipping_estimate INTEGER,
  margin_pct       DECIMAL(5,2),
  genre_id         VARCHAR(50),
  genre_name       VARCHAR(100),
  category         VARCHAR(50),
  stock_status     VARCHAR(20) DEFAULT 'instock',
  rakuten_url      TEXT,
  fetched_at       TIMESTAMP,
  translated_at    TIMESTAMP,
  wc_product_id    INTEGER,
  wc_pushed_at     TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE import_log (
  id            SERIAL PRIMARY KEY,
  item_code     VARCHAR(255),
  wc_product_id INTEGER,
  status        VARCHAR(20), -- 'success', 'failed', 'skipped'
  error_message TEXT,
  imported_at   TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Pricing Formula

```
sale_price = ceil((rakuten_price + shipping_estimate) / (1 - margin_pct))
```

**Currency:** All sale prices are stored and displayed in CNY (Chinese Yuan). Rakuten prices are in JPY — conversion applies at calculation time using a configurable exchange rate.

**Shipping estimate covers two legs:** Japan domestic (Rakuten → company) + international (Japan → China). Rakuten provides no weight data, so estimates are flat per category.

**Default values (placeholder — to be updated via Automation Pipeline Monitoring Dashboard):**

|Category|Shipping Estimate (CNY)|Target Margin|
|---|---|---|
|Nutrition / Supplements|¥65|20%|
|Running Gear|¥120|22%|
|Recovery & Care|¥65|20%|
|Sportswear|¥150|25%|
|Training Equipment|¥150|22%|

These values are stored in `pricing_config.js` and will be editable directly from the Automation Pipeline Monitoring Dashboard without touching code. Actual values to be confirmed by operator before launch.

**Example:**

```
Rakuten price: ¥3,240 JPY → ~¥160 CNY (at ~0.049 rate)
Shipping estimate: ¥65 CNY
Margin: 20%

sale_price = ceil((160 + 65) / (1 - 0.20))
           = ceil(225 / 0.80)
           = ¥282 CNY
```

The pricing formula and per-category shipping/margin config are stored in `pricing_config.js` — adjustable without touching business logic, and updatable via dashboard.

### 4.4 Express API Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`GET`|`/api/products`|Products by genre from PostgreSQL|
|`GET`|`/api/products/search`|Keyword search — DB first, live Rakuten fill to 10|
|`GET`|`/api/products/:itemCode`|Single product detail|
|`GET`|`/api/genres`|Genre tree for filter UI|
|`POST`|`/api/cart`|Save cart state to PostgreSQL|
|`GET`|`/api/cart`|Retrieve cart state|
|`POST`|`/api/checkout`|Push products to WooCommerce + create order + return Stripe URL|
|`GET`|`/api/woocommerce/status/:itemCode`|Check if product already in WooCommerce|

**Query params for `/api/products`:**

|Param|Values|Example|
|---|---|---|
|`category`|`nutrition`, `gear`, `recovery`, `sportswear`, `training`|`?category=nutrition`|
|`genre_id`|Rakuten genre ID|`?genre_id=505814`|
|`keyword`|Search string|`?keyword=amino+vital`|
|`sort`|`popularity`, `price_asc`, `price_desc`, `newest`|`?sort=popularity`|
|`min_price`|Integer (¥)|`?min_price=500`|
|`max_price`|Integer (¥)|`?max_price=5000`|
|`imported`|`true`, `false`|`?imported=false`|

---

## 5. WooCommerce Integration — Technical Decision

### 5.1 Options Considered

|Approach|Pros|Cons|
|---|---|---|
|**WooCommerce REST API (Consumer Key/Secret)**|Official, documented, safe, works over HTTPS|Slightly more setup than direct DB|
|Direct DB insert|Fast, no HTTP overhead|Bypasses WooCommerce hooks, pricing logic, stock management — dangerous for a live store|
|WP CLI|Simple for one-off runs|Requires SSH, not callable from Node API|

### 5.2 Decision: WooCommerce REST API

Use the WooCommerce REST API (`/wp-json/wc/v3/products`) authenticated with Consumer Key and Consumer Secret (generated in WooCommerce → Settings → Advanced → REST API).

**Rationale:**

- Official integration path — WooCommerce's hooks, stock management, and category logic all fire correctly
- Works over HTTPS from the Node backend without server access
- Consumer Key/Secret is revocable and scoped (read/write)
- Idempotent: check by SKU (`item_code`) before pushing — update if exists, create if not

### 5.3 WooCommerce Product Field Mapping

|Internal field|WooCommerce field|
|---|---|
|`name_zh`|`name`|
|`description_zh`|`description`|
|`sale_price`|`regular_price`|
|`images`|`images` (array of `{ src }`)|
|`category`|`categories` (mapped to WC category ID)|
|`stock_status`|`stock_status`|
|`item_code`|`sku`|
|`rakuten_url`|`external_url` (product source attribution)|

### 5.4 Idempotency Strategy

Before every push:

1. `GET /wp-json/wc/v3/products?sku={item_code}` — check if product exists
2. If exists → `PUT` update with latest translated name, description, price
3. If not → `POST` create new product
4. Log result to `import_log` table

---

## 6. Product Categories & Genre Map

### 6.1 Category Structure

```
🏃 Running Gear
  ├── Shoes
  ├── Apparel
  ├── GPS / Watch
  └── Accessories (pouches, armbands, insoles)

💪 Training
  ├── Fitness Machines
  ├── Yoga / Pilates
  └── Track & Field

🥤 Nutrition & Supplements
  ├── Sports Drinks
  ├── Protein
  ├── Amino Acid
  ├── Vitamins & Minerals
  └── Recovery (Collagen, Citric Acid, Probiotics)

🧴 Recovery & Care
  ├── Massage Products
  ├── Stretching Equipment
  ├── Foot Care
  └── Sports Care Products

👕 Sportswear
  ├── Men's
  ├── Women's
  ├── Underwear
  └── Bags & Accessories
```

### 6.2 genres.js Structure

```javascript
module.exports = {
  nutrition: {
    label: "🥤 Nutrition & Supplements",
    subgenres: {
      sports_drinks: { label: "Sports Drinks", genreId: "XXXXXX" },
      protein:       { label: "Protein",        genreId: "XXXXXX" },
      amino_acid:    { label: "Amino Acid",      genreId: "505814" },
      vitamins:      { label: "Vitamins & Minerals", genreId: "XXXXXX" },
      recovery:      { label: "Recovery",        genreId: "XXXXXX" }
    }
  },
  gear: {
    label: "🏃 Running Gear",
    subgenres: {
      shoes:       { label: "Shoes",       genreId: "XXXXXX" },
      apparel:     { label: "Apparel",     genreId: "XXXXXX" },
      gps_watch:   { label: "GPS / Watch", genreId: "XXXXXX" },
      accessories: { label: "Accessories", genreId: "XXXXXX" }
    }
  },
  // ... recovery, training, sportswear
}
```

Genre IDs for incomplete entries are fetched via the Rakuten Ichiba Genre Search API and populated before launch.

---

## 7. DeepL Translation Pipeline

### 7.1 Translation Strategy

- Translate `name_ja` → `name_zh` and `description_ja` → `description_zh`
- Source language: `JA` (Japanese)
- Target language: `ZH-HANS` (Simplified Chinese — matches platform audience)
- Translate at cache time — when products are fetched from Rakuten and written to PostgreSQL, all new products are batch-translated immediately before the response is returned
- Translate once, store in PostgreSQL — never re-translate the same `item_code` unless explicitly invalidated

**Why translate at cache time rather than lazily on user request:**

At ~500 products and ~500 chars each, the entire catalogue is ~250,000 characters — within DeepL's free tier. Translating on first user browse would mean the first visitor to a category sees a latency hit while waiting for a batch DeepL call. Translating at cache time means users always get translated products with no delay, at no meaningful extra cost.

### 7.2 Translation Cache Logic

```
On Rakuten fetch:
  normalize products → collect all with translated_at IS NULL
  POST batch to DeepL /v2/translate (single API call for all new products)
  Update name_zh, description_zh, translated_at in PostgreSQL
  Return translated products

On subsequent product requests:
  translated_at IS NOT NULL → return cached translation, no DeepL call
```

No translation queue — translations are resolved synchronously at fetch time before products are stored.

### 7.3 Fallback

If DeepL API is unavailable or quota exceeded:

- Store product with `name_zh = name_ja` (raw Japanese), `translated_at` left NULL
- UI shows "Translation pending" badge on affected products
- Do not block product display or import
- Dashboard surfaces count of products with `translated_at IS NULL` as a health metric

---

## 8. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Caching layer|PostgreSQL with 24h TTL|In-memory only, Redis|PostgreSQL already in stack; persistent across restarts; enables translation caching alongside product data; 24h TTL balances freshness vs rate limit protection|
|Translation|DeepL JA → ZH-HANS, batch at cache time|Google Translate, manual, lazy on user request|DeepL produces higher quality output for Japanese technical/product text; translating at cache time (not on user request) eliminates first-user latency; entire ~500 product catalogue fits within DeepL free tier (~250k chars)|
|WooCommerce integration|WooCommerce REST API|Direct DB insert, WP CLI|Official path; hooks fire correctly; no SSH dependency; revocable auth|
|Pricing|Formula-based (configurable per category)|Manual per-product, flat markup|Configurable margins per category reflects real shipping cost differences; formula is auditable and adjustable|
|Frontend|WooCommerce storefront + TranslatePress|Custom React SPA|WooCommerce has 24/7 support, built-in security, and is maintainable by any WordPress developer after handoff; a custom React SPA has zero support and introduces security surface that takes significant dev time to harden; see Section 2 for full rationale|
|WooCommerce role|Full storefront — browsing, cart, checkout, payments|Backend payment processor only|WooCommerce handles everything; products are pre-pushed at pipeline time, not at checkout|
|Cart persistence|WooCommerce native|PostgreSQL custom implementation|Handled for free by WooCommerce — no custom cart code needed|
|Translation (storefront)|TranslatePress + DeepL on first customer view|Custom deepl.js in Express pipeline|TranslatePress is a maintained WordPress plugin; translates and caches in WordPress DB; no custom frontend translation code; operator can manage translations without touching code|
|Shipping at checkout|Preset per genre with adjustment caveat|Calculated at push time|Rakuten provides no weight data; category-based estimate is shown with clear caveat that actual shipping may differ|
|Customer contact|WeChat (email/phone collected at checkout for order confirmation)|Email only|Chinese customers primarily use WeChat; email collected for WooCommerce order confirmation only|
|Data source|Rakuten Ichiba APIs (Search + Ranking + Genre)|Manual scraping, other marketplaces|Official Rakuten API — reliable, documented, rate-limited in a known way; covers search intent + popularity signal|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack; no context switching|

---

## 9. Product Request Flow

### 9.1 Overview

When a customer searches the WooCommerce store and can't find a product, a prominent "Didn't find what you're looking for? Request it here" button is shown. The customer submits a product name or keyword, the backend fetches it from Rakuten, translates, prices, and pushes it to WooCommerce — all while the customer waits on-page with a progress indicator.

### 9.2 Flow

```
Customer submits product request (keyword)
    ↓  POST /api/request-product
Express API:
  1. Search Rakuten by keyword
  2. Normalize top result
  3. Batch translate via DeepL (name + description)
  4. Calculate price via pricing formula
  5. Push to WooCommerce via REST API (with image sideloading)
    ↓  ~1-2 minutes total (image sideloading is the bottleneck)
Return WooCommerce product URL to frontend
    ↓
On-page progress indicator updates to "Ready!" with link to product
Customer clicks through to WooCommerce product page and adds to cart
```

### 9.3 On-Page Progress Indicator

- Shown immediately after form submission — customer stays on the page
- Steps surfaced as the pipeline runs: Searching Rakuten → Translating → Calculating price → Adding to store → Ready!
- Progress streamed from backend via SSE (`GET /api/request-product/status/:requestId`)
- On completion: "Your product is ready — [View Product]" link to WooCommerce product page
- On failure: "We couldn't find that product on Rakuten. Try a different search term."

### 9.4 Implementation Notes

- This is a WordPress shortcode or widget added to the WooCommerce search results page — no custom storefront needed
- The progress indicator is a small embedded JS snippet that connects to the SSE stream
- `POST /api/request-product` is the only new Express endpoint needed for this flow

---

## 10. Implementation Phases

### 10.1 Current Status

|Component|Status|Notes|
|---|---|---|
|rakutenAPI.js|🔧 Partial|Two functions working (keyword search, genre search); ranking not implemented|
|normalizeItems.js|🔧 Partial|Exists as inline helper, needs extraction to module|
|genres.js|🔧 Partial|Structure exists, some genre IDs missing|
|db/cache.js|❌ Not started|PostgreSQL cache layer|
|deepl.js|❌ Not started|Waiting on DeepL API key|
|pricing.js|❌ Not started|Formula defined, not implemented|
|woocommerce.js|❌ Not started|WooCommerce REST API integration|
|Express API|🔧 Partial|MVC structure set up, endpoints not fully implemented|
|Product request flow|❌ Not started|SSE-based progress indicator + Express endpoint|
|TranslatePress config|❌ Not started|WordPress plugin setup + DeepL API key|
|Weekly auto-sync cron|❌ Not started|Scheduled Rakuten fetch + WooCommerce push|
|Deployment|❌ Not started|—|

### 10.2 Phase 1 — Data Pipeline

1. Extract `normalizeItems.js` as standalone module
2. Add `getRanking()` to rakutenAPI.js
3. Fill in missing genre IDs in genres.js via Genre Search API
4. Build `db/cache.js` — PostgreSQL product cache with TTL logic
5. Build `pricing.js` — formula implementation with per-category config
6. Test full fetch → normalize → cache → price pipeline end-to-end

**Exit criteria:** Express API returns normalized, priced products from PostgreSQL cache. Cache miss triggers Rakuten fetch. Cache hit returns stored results. Prices match formula.

### 10.3 Phase 2 — Translation + WooCommerce

1. Obtain DeepL API key, implement `deepl.js` with batch translation and cache
2. Wire translation into fetch pipeline: fetch → normalize → translate → cache
3. Set up WooCommerce REST API credentials on running.moximoxi.net
4. Build `woocommerce.js` with push, bulk push, and SKU existence check
5. Implement import endpoints: `POST /api/woocommerce/push` and `/push-bulk`
6. Test single product push → verify product appears in WooCommerce store

**Exit criteria:** A product fetched from Rakuten can be pushed to WooCommerce with translated name/description and auto-calculated price in under 10 seconds.

### 10.4 Phase 3 — Storefront Integration + Deployment

1. Install and configure TranslatePress + DeepL on running.moximoxi.net
2. Run initial bulk push of ~500 products per category to WooCommerce
3. Verify TranslatePress translates product pages correctly on first view and caches
4. Build product request flow: `POST /api/request-product` endpoint + SSE progress stream
5. Embed progress indicator widget on WooCommerce search results page via shortcode
6. Set up weekly auto-sync cron job: Rakuten fetch → normalize → translate → push new products
7. Deploy Express API to AWS Lightsail (same instance as other pipelines)
8. Smoke test full flow: browse WooCommerce → translation correct → request missing product → product appears in ~2 min

**Exit criteria:** WooCommerce store is live with ~500 products per category, all translated to Chinese. Product request flow works end-to-end. Weekly auto-sync running.

---

## 11. Engineering Challenges & Solutions

### 11.1 Rakuten API Rate Limits

**Challenge:** Rakuten Ichiba APIs have rate limits (varies by plan). Heavy browsing in the UI could exhaust the daily quota quickly.

**Solution:** PostgreSQL cache with 24h TTL. The vast majority of browse sessions hit cached results — only cache misses and forced refreshes call the Rakuten API. Rate limit errors are caught, logged, and returned to the UI as a "data temporarily unavailable" state without crashing the app.

### 11.2 Japanese → Chinese Translation Quality

**Challenge:** Running product descriptions often contain technical terms (amino acid types, supplement compounds, shoe technology names) that translate poorly with generic translation services.

**Solution:** DeepL produces significantly better results than alternatives for Japanese technical product text. Additionally, translated text is stored in PostgreSQL — if a translation is wrong, it can be manually corrected once and the fix persists. The UI exposes the original Japanese alongside the translation for admin review.

### 11.3 Price Accuracy

**Challenge:** Rakuten prices change. A product cached at ¥3,240 yesterday might be ¥3,580 today, making the auto-calculated sale price stale.

**Solution:** 24h cache TTL ensures prices refresh daily. Before any WooCommerce push, the system re-fetches the product from Rakuten to get the current price and recalculates before importing. This adds one API call per import but guarantees the pushed price reflects current Rakuten cost.

### 11.4 WooCommerce Push Failures

**Challenge:** WooCommerce REST API calls can fail mid-bulk-import (auth error, timeout, malformed image URL).

**Solution:** Bulk push is sequential with per-product try/catch, not a single transaction. Each result (success/failed/skipped) is written to the `import_log` table immediately. If 8 of 10 products succeed and 2 fail, the 8 are in WooCommerce and the 2 failures are logged with error messages for retry. The UI shows per-product results after a bulk push.

### 11.5 Image Handling

**Challenge:** Rakuten product images are hotlinked from Rakuten's CDN. If Rakuten removes the image or changes the URL, WooCommerce product images break.

**Solution:** On import, download images to the WordPress media library via WooCommerce's `images[].src` field — WooCommerce will sideload them into the media library automatically. This makes product images self-contained in WordPress, not dependent on Rakuten CDN.

---

## 12. Open Questions & Resolved Decisions

### Resolved
- **Currency:** CNY. Sale prices stored and displayed in Chinese Yuan. JPY → CNY conversion applied at pricing calculation time.
- **WeChat handle:** `Moxi` — shown at checkout with instruction to add for delivery updates.
- **Shipping config:** Placeholder values set in `pricing_config.js`. Final values to be confirmed by operator and updated via Automation Pipeline Monitoring Dashboard.
- **WooCommerce role:** Order processing and payment only. React app is the customer-facing storefront.
- **Checkout push timing:** WooCommerce push triggered on "Add to Cart" in background, not at checkout — eliminates 60s blocking wait at payment time.

### Still Open
- **DeepL API key:** Waiting on this to unblock translation implementation.
- **Missing genre IDs in genres.js:** Need to call Rakuten Genre Search API to populate incomplete entries before launch.
- **WooCommerce REST API credentials:** Consumer Key + Secret not yet generated on running.moximoxi.net.
- **Image sideloading:** WooCommerce's automatic image sideloading on import needs testing — some CDN images may block hotlink requests.
- **Categories in scope for v1:** All 5 top-level categories (Running Gear, Training, Nutrition & Supplements, Recovery & Care, Sportswear). Initial pre-load target: ~500 products total, spread roughly evenly (~100 per top-level category). Catalogue grows organically via on-demand search after that.
- **Exchange rate source:** JPY → CNY rate — hardcoded in config or fetched from an exchange rate API? Needs decision.

---

## 13. Repository Structure

```
automation-ecosystem/rakuten/
├── server/
│   ├── index.js                  # Express app entry point
│   ├── routes/
│   │   ├── products.js           # GET /api/products, /api/products/:id
│   │   ├── ranking.js            # GET /api/products/ranking
│   │   ├── genres.js             # GET /api/genres
│   │   └── woocommerce.js        # POST /api/woocommerce/push, /push-bulk
│   ├── controllers/
│   │   ├── productController.js
│   │   └── woocommerceController.js
│   ├── services/
│   │   ├── rakutenAPI.js         # Rakuten API wrapper (exists, partial)
│   │   ├── normalizeItems.js     # Product normalization (exists as helper)
│   │   ├── deepl.js              # DeepL translation (new)
│   │   ├── pricing.js            # Margin formula (new)
│   │   └── woocommerce.js        # WooCommerce REST API wrapper (new)
│   ├── db/
│   │   ├── cache.js              # PostgreSQL cache layer (new)
│   │   └── schema.sql            # Table definitions
│   └── config/
│       ├── genres.js             # Rakuten genre ID map (exists, partial)
│       └── pricing_config.js     # Per-category margin + shipping config (new)
└── client/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── ProductCard.jsx
        │   ├── ProductDetail.jsx
        │   ├── FilterPanel.jsx
        │   ├── BulkImportBar.jsx
        │   └── ImportResultModal.jsx
        └── hooks/
            ├── useProducts.js
            └── useImport.js
```

---
