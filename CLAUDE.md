# Claude Code Instructions — automation-ecosystem

## Repo Structure

```
automation-ecosystem/
    ├── xhs/          # XHS automation pipeline (scheduler, generator, publisher)
    ├── scraper/      # Scraper container (cron only — writes races.json to shared volume)
    ├── race-hub/     # Race Hub container (Express :3001 — serves races.json to WordPress)
    ├── rakuten/      # Rakuten product aggregator pipeline
    ├── dashboard/    # Monitoring dashboard (Express :3000 + React SPA)
    └── docs/         # All project docs
        ├── xhs/          design-doc.md, checklist.md
        ├── scraper/      design-doc.md, checklist.md
        ├── rakuten/      design-doc.md, checklist.md
        └── dashboard-design-doc.md
```

## Before Writing Any Code
- Read the relevant design doc in `docs/<pipeline>/design-doc.md` before starting any task
- For dashboard work, read `docs/dashboard-design-doc.md`
- Each pipeline subdirectory has its own `CLAUDE.md` with pipeline-specific instructions — read it

## Keeping Docs in Sync — REQUIRED
- Mark completed checklist items in `docs/<pipeline>/checklist.md` after every task
- Update `docs/<pipeline>/design-doc.md` when technical decisions or architecture changes
- Never skip this

## General Rules
- Never overwrite or modify any `.env` file
- `**/node_modules`, `**/.env`, `**/auth.json` are all gitignored
- Each pipeline has its own `package.json` and must be installed independently (`cd xhs && npm install`, etc.)
