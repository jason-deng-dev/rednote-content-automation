# Rednote AI Content Generation Pipeline

A fully automated pipeline that generates daily Chinese-language marketing posts for Xiaohongshu (Rednote) using the Claude API, then auto-publishes them to the MOXI爱跑步 account via Playwright browser automation.

Built for [running.moximoxi.net](https://running.moximoxi.net) — a marathon platform for Chinese runners planning Japanese races.

## What It Does

- Generates on-brand XHS posts daily using Claude (claude-sonnet-4-20250514) with a custom MOXI persona system prompt
- Content strategy derived from analysis of 115 manually published posts (60,481 total views) — weighting, title patterns, and rotation schedule are all data-driven
- Sources live race data from the marathon-hub-race-scraper pipeline as generation context
- Formats output to XHS constraints: Simplified Chinese, emoji-heavy, multi-page, no markdown headers, CTA in comments
- Auto-publishes via Playwright — post body first, then comment with destination URL
- 7-day content rotation: Race Guides (40%), Training Science (25%), Nutrition (20%), Health & Recovery (10%), Comparison (5%)

## Stack

- Node.js
- Anthropic SDK (Claude API)
- Playwright (browser automation)
- node-cron

## Architecture

See [docs/design-doc.md](docs/design-doc.md) for full system architecture, prompt engineering design, performance data analysis, and content strategy decisions.

## Running Locally
```bash
git clone https://github.com/jason-deng-dev/rednote-content-automation
cd rednote-content-automation
npm install
cp .env.example .env
# Add your Anthropic API key to .env
node rednote-post-generator.js
```

## Status

In development — see [docs/checklist.md](docs/checklist.md) for current progress.