# Claude Code Instructions
> This file configures Claude Code's behaviour for this repo.
> See [docs/xhs-design-doc.md](docs/xhs-design-doc.md) for full project context.

## Before Writing Any Code
- Read `docs/xhs-design-doc.md` in full before starting any task
- Follow the repo structure defined in Section 12 of the design doc exactly
- If a file or folder isn't in the design doc structure, confirm before creating it

## Repo Structure
Refer to `docs/xhs-design-doc.md` Section 12. Key files:
- `src/` — generator.js, scheduler.js, publisher.js
- `scripts/` — run-scheduler.js, xhs-login.js, test-gen.js
- `config/` — prompts.json
- `data/` — races.json (local copy for testing), post_history.json, post_archive/
- `tests/` — unit tests + fixtures

## Keeping Docs in Sync — REQUIRED, DO NOT SKIP
**After every task, before moving on:**
- Mark completed checklist items in `docs/xhs-checklist.md` — do this automatically, never ask for permission
- If a new dependency, technical decision, or architectural choice was made — update `docs/xhs-design-doc.md` Section 5 (Technical Decisions)
- If a new engineering challenge was solved — add it to `docs/xhs-design-doc.md` Section 9
- If the current state of any component changed — update `docs/xhs-design-doc.md` Section 8.1 (Current Status)

This is not optional. Do not wait to be reminded.

## !! CRITICAL — Never Ask Jason For Code or File Contents !!
**ALWAYS read files yourself using Read, Glob, or Grep. NEVER ask Jason to share code, paste a file, or describe what's in the repo. Check yourself every time.**

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- The system prompt and content strategy are defined in Section 6 of the design doc — do not deviate from the MOXI persona, XHS format rules, or content weighting without flagging it first
- If something is unclear or undecided in the design doc, flag it and add it to Section 11 (Open Questions) rather than making assumptions