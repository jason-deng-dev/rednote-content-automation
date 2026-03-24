**Project:** Automation Pipeline Monitoring Dashboard

**Author:** Jason Deng

**Date:** March 2026

**Status:** Planning — to be built after all three pipelines are operational

<!-- --- -->

## 1. Problem Statement

Three automation pipelines are running in production:

- **Race Scraper Pipeline** — weekly RunJapan scrape → `races.json`
- **Rakuten Product Aggregator** — product data pipeline
- **RedNote Content Generator** — daily Claude-powered XHS post generation and publishing

Currently, the only way to check pipeline health is to read raw log files. This is fine during development but breaks down at handoff — a non-technical operator shouldn't need to dig through logs to know if something is broken.

A unified monitoring dashboard gives a single place to check the health of all three pipelines without touching the underlying systems.

---

## 2. Goals

- Surface the operational status of all three pipelines in one place
- Track success/failure rates per pipeline run
- Monitor prompt generation quality (RedNote pipeline)
- Make the system self-diagnosing: when a pipeline fails, surface enough context for the operator to understand what broke and how to fix it
- Reduce operator burden — no raw log reading required for routine checks

---

## 3. Key Metrics (Per Pipeline)

### All Pipelines
- Last run timestamp
- Last run status (success / failure / partial)
- Success rate over last 7 / 30 days
- Error count by error type
- Current pipeline state (idle / running / failed)

### Race Scraper Pipeline
- Races scraped per run (threshold alert: < 30)
- Scrape failures per run (individual race detail pages that failed)
- Data freshness (how old is the current `races.json`)

### Rakuten Product Aggregator
- Products fetched per run
- Failure rate per product / category
- Data freshness

### RedNote Content Generator
- Posts generated per day
- Posts published successfully vs. failed
- Post type distribution (race / training / nutrition / wearable)
- Prompt generation quality score (TBD — format: did the response parse correctly, was JSON valid, did it hit required fields)
- Claude API error rate (429s, 5xx, timeout)
- XHS publish failure rate and failure reasons

---

## 4. Claude-Assisted Error Resolution

When a pipeline run fails, the dashboard feeds the error context (pipeline name, failed stage, error message, recent log lines) to Claude with a system prompt that gives it full knowledge of the pipeline architecture.

Claude returns a plain-English explanation of what likely went wrong and a step-by-step fix — displayed directly in the dashboard. The operator follows the steps without needing to understand the underlying code.

Example flow:
1. RedNote pipeline fails at publisher stage — `auth.json` session expired
2. Dashboard detects failure, identifies error type
3. Feeds error context to Claude
4. Claude responds: "Your XHS session has expired. Click the **Login to XHS** button to refresh your session."
5. Operator clicks the button, logs in via the embedded browser view, pipeline resumes

---

## 5. XHS Session Management

XHS sessions expire periodically (typically every few weeks). Rather than requiring the operator to SSH into the server and run a script, the dashboard exposes a browser-based re-authentication flow.

### How It Works

1. Operator clicks **"Login to XHS"** button in the dashboard
2. Server spawns a Playwright-controlled browser instance
3. Operator interacts with the XHS login page directly — the browser window is streamed into the dashboard via an embedded **noVNC viewer**, so they never leave the browser tab
4. Playwright captures the resulting session cookies automatically
5. Cookies are saved as `auth.json` on the AWS server
6. All future automated publishing runs use the refreshed `auth.json`

### Why This Approach

- **Solves bot detection** — it's a real human login producing a real session, not a scripted credential submission
- **No server access required** — operator never touches SSH, the terminal, or any files
- **No credentials stored in code** — `auth.json` is a session artifact, not a hardcoded password
- **Self-service re-auth** — when the session expires, the operator clicks one button and is done in under a minute

### Session Expiry Detection

The dashboard should surface session state as a status indicator on the RedNote pipeline card:
- **Session active** — last successful publish timestamp + estimated expiry (30 days from last login)
- **Session expiring soon** — warning at <7 days remaining
- **Session expired / publish failed** — error state with the Login button prominently shown

### Implementation Notes

- Backend: `POST /api/xhs/login` — spawns Playwright with `headful: true`, starts a noVNC-compatible VNC server pointing at that browser instance
- Frontend: dashboard opens an `<iframe>` or dedicated panel with the noVNC web client, connecting to the VNC stream
- On successful login detection (Playwright observes redirect to XHS home), server closes the browser, saves `auth.json`, returns success to the dashboard
- `auth.json` is never transmitted to the client — it stays on the server

---

## 6. Pipeline Configuration

The dashboard should allow the operator to configure the RedNote posting schedule without touching code or the server.

### Per-Day Schedule Config

Each day supports multiple post slots — each slot has a time and a post type. The operator can add or remove slots per day from the dashboard.

- **Time** — time picker per slot (24h, CST)
- **Post Type** — dropdown per slot: Race Guide / Training / Nutrition / Wearables
- **Add slot** — button to add another post to the same day
- **Remove slot** — button to remove a slot

The schedule is stored in `config/schedule.json` on the server. The dashboard reads and writes this file via an API endpoint. The scheduler reads `schedule.json` at runtime to register one cron job per slot — no code changes or restarts required.

### schedule.json Shape

```json
{
  "monday":    [{ "time": "21:00", "type": "race" }],
  "tuesday":   [{ "time": "21:00", "type": "nutritionSupplement" }],
  "wednesday": [{ "time": "21:00", "type": "training" }],
  "thursday":  [{ "time": "09:00", "type": "race" }, { "time": "21:00", "type": "wearable" }],
  "friday":    [{ "time": "21:00", "type": "race" }],
  "saturday":  [{ "time": "21:00", "type": "training" }],
  "sunday":    [{ "time": "21:00", "type": "wearable" }]
}
```

---

## 7. RedNote Dashboard Section — Full Spec

### 7.1 Schedule Management

- Weekly grid — one row per day, each row shows all configured post slots
- Per slot: time picker (24h CST) + post type dropdown (Race Guide / Training / Nutrition / Wearables)
- Add slot button per day, remove button per slot
- Save button writes to `config/schedule.json` via `POST /api/schedule`
- Scheduler picks up changes at runtime without restart — watches `schedule.json` for changes and re-registers cron jobs on update

### 7.2 Live Log Stream

- Scrollable log panel showing real-time stdout from the XHS automation process
- Streamed from the server via SSE (Server-Sent Events) — `GET /api/logs/stream`
- New lines appended as they arrive, auto-scrolls to bottom
- Lines are colour-coded: errors in red, success messages in green, neutral in default

### 7.3 XHS Authentication

- Session status indicator on the RedNote card:
  - **Active** — last successful publish timestamp + estimated expiry (30 days from last login)
  - **Expiring soon** — warning at <7 days remaining
  - **Expired / failed** — error state with Login button prominently shown
- When auth error is detected in the log stream, dashboard surfaces an alert banner prompting the operator to re-authenticate
- **Login to XHS** button — triggers `POST /api/xhs/login`, spawns `xhs-login.js` via Playwright, streams the browser via noVNC so the operator completes login without leaving the dashboard
- On successful login, `auth.json` is saved on the server and the alert clears

### 7.4 Key Metrics

- Posts published today / this week
- Posts published successfully vs. failed
- Post type distribution (race / training / nutrition / wearable)
- Last run timestamp + status
- Claude API error rate (429s, 5xx, timeout)
- XHS publish failure rate and failure reasons

### 7.5 Post Archive Viewer

- List of recent published posts pulled from `data/post_archive/`
- Shows: title, post type, publish timestamp
- Expandable to show full post content (hook, contents, cta)

### 7.6 Manual Trigger

- "Run now" button — fires a post immediately outside the schedule
- Post type dropdown to select what type to generate
- **Preview mode** — checkbox to generate without publishing; output is shown in the dashboard for QA without consuming an XHS post slot
- Useful for testing or one-off posts without modifying the schedule

### 7.7 Run History

- Table of every run attempt, not just successful publishes
- Columns: timestamp, post type, outcome (success / failed), error message if failed
- Fills the gap left by `post_archive/` which only records successful posts — failed runs currently leave no trace

### 7.8 Claude API Cost Tracker

- Tokens used per post (input + output) logged from the `usage` field on each API response
- Cumulative tokens and estimated cost this week / this month
- Per-post cost visible in the run history table

---

## 8. Dashboard Home Page — Pipeline Cards

The home page shows one card per pipeline. Each card surfaces the most critical info at a glance without needing to navigate into the full pipeline view.

### 8.1 RedNote Pipeline Card

- **Current run state** — live indicator: Idle / Running / Failed
- **Weekly posts** — success count / failed count / success ratio (e.g. 6/7 — 86%)
- **Last post** — timestamp, post type, status (success / failed)
- **Last failure reason** — if last run failed, surface the error type inline: auth expired / Claude API error / publish timeout
- **Next scheduled post** — day, time, and post type from `schedule.json`
- **Auth status** — session active / expiring soon / expired (Login button shown if expired)

### 8.2 Race Scraper Pipeline Card

- **Current run state** — live indicator: Idle / Running / Failed
- **Last run** — timestamp + outcome (success / failed)
- **Races scraped** — count from last run, with threshold alert if < 30
- **Data freshness** — how old is the current `races.json` (e.g. "3 days ago")

### 8.3 Rakuten Aggregator Pipeline Card

- **Catalog size** — total products cached in PostgreSQL
- **WooCommerce live** — how many products have been pushed to the store
- **Untranslated** — count of products with `translated_at IS NULL` (health indicator)
- **Last activity** — timestamp of last Rakuten fetch or WooCommerce push
- **Error indicator** — any recent API failures (Rakuten, DeepL, WooCommerce)

---

## 9. Race Scraper Dashboard Section — Full Spec

### 9.1 Key Metrics

- Races scraped per run (threshold alert if < 30)
- Scrape failures per run — count of individual race detail pages that failed
- Data freshness — age of current `races.json`

### 9.2 Failed URLs List

- Expandable list of race URLs that failed during the last scrape run
- Shows which races are missing from `races.json` without requiring log access

### 9.3 races.json Viewer

- Simple table of currently scraped races: name, date, location
- Lets the operator spot-check data quality after a fresh scrape without SSHing in

### 9.4 Run History

- Table of past scrape runs: timestamp, races scraped, failure count, outcome
- Same pattern as RedNote run history — failed runs currently leave no trace

### 9.5 Manual Trigger

- "Run scraper now" button — fires the scrape on demand outside the weekly cron
- Number input to cap the scrape limit (default: all races)

---

## 10. Rakuten Aggregator Dashboard Section — Full Spec

### 10.1 Catalog Stats

- Total products cached in PostgreSQL
- Translated vs untranslated count
- Products pushed to WooCommerce vs not yet pushed
- Stale products (cache older than 24h) — count with a force-refresh option per category
- **Per-category breakdown** — product count for each of the five planned top-level categories:
  - 🏃 Running Gear
  - 💪 Training
  - 🥤 Nutrition & Supplements
  - 🧴 Recovery & Care
  - 👕 Sportswear
  - Each row shows: cached / translated / pushed to WC

### 10.2 Pricing Config Editor

- Per-category table: shipping estimate (CNY) + target margin % — editable inline
- JPY → CNY exchange rate field with last-updated timestamp
- **Search fill threshold** — number input controlling how many DB results trigger a live Rakuten fill-up (default: 10)
- Save button writes to `pricing_config.js` via API — no code changes or server access required
- Exchange rate last updated shown next to the field — if it's been weeks and the rate has moved, margins are silently off

### 10.3 Import Log

- Table of all WooCommerce push attempts from `import_log`: timestamp, product name, status (success / failed / skipped), error message if failed
- **Failed imports panel** — products with `status = 'failed'` surfaced as a list with a one-click retry button per product

### 10.4 DeepL Quota Tracker

- Current month character usage vs limit
- Shown as a health indicator — if quota is exhausted, new products display in raw Japanese with no warning to customers

### 10.5 Manual Trigger

- "Fetch more products" button with category dropdown + count input
- Fetches from Rakuten, normalises, batch-translates, and caches in PostgreSQL in one operation

---

## 11. Open Questions

- What form does the dashboard take? Web UI, CLI, or terminal output?
- Where does it run — same server as the pipelines, or separate?
- How is prompt quality scored? (Parse success alone, or semantic review?)
- Does the Claude-assisted fix mode run automatically on failure, or on-demand?
- Should the dashboard send alerts (email, Telegram) when a pipeline fails, or is checking it manually sufficient?
- noVNC vs. alternative browser streaming approach for the XHS login flow — noVNC requires a VNC server on the AWS instance; simpler alternative is Playwright's `slowMo` + screenshot polling, but that's less interactive

---

## 12. Next Steps

- Finalize architecture and tech stack (to be decided once all three pipelines are operational)
- Define prompt quality scoring criteria based on observed generator output
- Implement per-pipeline structured logging as a prerequisite (logs need consistent format for the dashboard to parse)
