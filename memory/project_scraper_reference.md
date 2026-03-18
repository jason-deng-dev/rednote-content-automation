---
name: Scraper status and output schema
description: src/scraper.js is complete — what it does and what races.json looks like
type: project
---

`src/scraper.js` is fully complete and committed.

**What it does:**
- Fetches RunJapan listing pages (`?command=search` for p1, `?command=page&pageIndex=N` after)
- For each race card, fetches the detail page
- Extracts all race fields and writes to `data/races.json`

**races.json output schema:**
```json
{
  "last_updated": "2026-03-17T...",
  "races": [
    {
      "name": "...",
      "url": "...",
      "date": "...",
      "location": "...",
      "entryStart": "...",
      "entryEnd": "...",
      "website": "...",
      "images": ["..."],
      "description": "...",
      "info": {
        "Date": "...",
        "Location": "...",
        "Event/Eligibility": {
          "Full Marathon（Start time 8:30）": "Age 16~ ..."
        }
      },
      "notice": ["...", "..."],
      "registrationOpen": true,
      "registrationUrl": "https://runjapan.jp/..."
    }
  ]
}
```

**Called as:** `populateRaces(limit)` — returns the races array and writes to disk.
