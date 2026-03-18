---
name: Next step — post generator
description: What to build next and where we left off
type: project
---

Scraper is complete. Next component is `src/rednote-post-generator.js`.

**What it does:**
- Reads `data/races.json`
- For each race, calls the Claude API to generate an XHS post in the MOXI爱跑步 persona
- Output format and persona defined in `docs/design-doc.md` Section 6

**Why:** This is Jason's first time using the Claude API / Anthropic SDK — go slower, explain the SDK setup, how messages/system prompts work, how to structure the API call before writing any code.
