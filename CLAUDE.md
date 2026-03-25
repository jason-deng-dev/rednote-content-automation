# Claude Code Instructions — automation-ecosystem

## Repo Structure

```
automation-ecosystem/
    ├── services/
    │   ├── xhs/              # XHS automation pipeline (scheduler, generator, publisher)
    │   │   └── docs/         #   xhs-design-doc.md, xhs-checklist.md
    │   ├── scraper/          # Scraper container (cron only — writes races.json to shared volume)
    │   │   └── docs/         #   scraper-design-doc.md, scraper-checklist.md
    │   ├── race-hub/         # Race Hub container (Express :3001 — serves races.json to WordPress)
    │   │   └── docs/         #   race-hub-design-doc.md
    │   ├── rakuten/          # Rakuten product aggregator pipeline
    │   │   └── docs/         #   rakuten-design-doc.md, rakuten-checklist.md
    │   └── dashboard/        # Monitoring dashboard (Express :3000 + React SPA)
    │       └── docs/         #   dashboard-design-doc.md
    └── docs/
        └── architecture.md   # Ecosystem-wide overview — how all services fit together
```

## Before Writing Any Code
- Read the relevant design doc in `services/<service>/docs/<service>-design-doc.md` before starting any task
- For ecosystem-wide context, read `docs/architecture.md`
- Each pipeline subdirectory has its own `CLAUDE.md` with pipeline-specific instructions — read it

## Keeping Docs in Sync — REQUIRED
- Mark completed checklist items in `services/<service>/docs/<service>-checklist.md` after every task
- Update `services/<service>/docs/<service>-design-doc.md` when technical decisions or architecture changes
- Never skip this

## General Rules
- Never overwrite or modify any `.env` file
- `**/node_modules`, `**/.env`, `**/auth.json` are all gitignored
- Each pipeline has its own `package.json` and must be installed independently (`cd services/xhs && npm install`, etc.)
