**Project:** Automation Pipeline Monitoring Dashboard

**Author:** Jason Deng

**Date:** March 2026

**Status:** Planning — to be built after all three pipelines are operational

---

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
4. Claude responds: "Your XHS session has expired. Run `node scripts/xhs-login.js`, log in manually when the browser opens, then restart the scheduler."
5. Operator follows steps, pipeline resumes

---

## 5. Open Questions

- What form does the dashboard take? Web UI, CLI, or terminal output?
- Where does it run — same server as the pipelines, or separate?
- How is prompt quality scored? (Parse success alone, or semantic review?)
- Does the Claude-assisted fix mode run automatically on failure, or on-demand?
- Should the dashboard send alerts (email, Telegram) when a pipeline fails, or is checking it manually sufficient?

---

## 6. Next Steps

- Finalize architecture and tech stack (to be decided once all three pipelines are operational)
- Define prompt quality scoring criteria based on observed generator output
- Implement per-pipeline structured logging as a prerequisite (logs need consistent format for the dashboard to parse)
