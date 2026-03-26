# Race Hub SPA — UI & Interactions

**Design system tokens:** `docs/design-system.md` (authoritative source for colours, spacing, typography)

---

## Tooling — Component Generation

Using **Google Stitch** (stitch.withgoogle.com) to generate initial component scaffolding with design coherence.

**Workflow:**
1. Feed Stitch the Goldwin Japan site (goldwin.co.jp) as visual inspiration
2. Describe each component with our design constraints (colours, no border-radius, sharp corners, typography)
3. Export generated HTML/React output
4. Replace hardcoded values with design system tokens from `docs/design-system.md`

**Components scaffolded via Stitch:** Race card, filter bar + chips, slide-in drawer, entry status badge, skeleton loader

**Model used:** Gemini 3.1 Pro (max quality for design reasoning)

---

## Layout

RunJapan-inspired: filter bar at top, race cards below.

- Filter bar sticky on scroll
- Card grid below (responsive — 1 col mobile, 2-3 col desktop)
- Active filter chips displayed below the bar (dismissible)
- Live race count updates as filters change

---

## Interactions

### Cards
- Hover: translate-y lift + border darkens to `#C8C8C4`
- Hover: race image zooms slightly (scale inside fixed-height container, overflow hidden)

### Filters
- Active filter chips below bar — shows what's applied, each chip dismissible
- Race count updates live as filters change
- Filter bar sticks to top on scroll

### List → Detail view
- Slide-in panel from the right (drawer style)
- Clicking a card opens the panel; backdrop click or X button closes it
- Listing stays visible/scrollable behind the panel

### Loading
- Shimmer skeleton cards on initial fetch (no spinner)

### Page load
- Cards stagger-animate in sequentially on mount

---

---

## Data Shape

Each race object from `GET /api/races`:

```json
{
  "name": "string",
  "url": "string",          // RunJapan detail page
  "website": "string",      // official race site (may be empty)
  "date": "string",         // e.g. "March 29 2026"
  "location": "string",     // e.g. "Akiruno City (Tokyo) , Japan"
  "entryStart": "string",   // e.g. "December 23 2025 21:00"
  "entryEnd": "string",     // e.g. "January 19 2026 23:59"
  "images": ["url", "url", "url"],  // up to 3 CDN URLs (hotlinked)
  "description": "string",
  "info": {
    "Date": "string",
    "Location": "string",
    "Organizers": "string",
    "Event/Eligibility": {
      "Category name": "string"   // nested — keys vary per race
    },
    "Participation Fee": "string",
    // ... other keys vary per race
  },
  "notice": ["string", "string"]  // array of bullet strings
}
```

### Derived fields (computed client-side)
- **Entry status** — compare `entryEnd` to today's date:
  - `Open`: entryEnd is in the future
  - `Closing Soon`: entryEnd within 2 weeks
  - `Closed`: entryEnd is in the past

### Rendering notes
- `info` keys are not consistent across races — render as dynamic key-value pairs
- `Event/Eligibility` is a nested object — flatten to sub-rows in the detail panel
- `images[0]` used as card thumbnail; all 3 shown in detail panel
- `website` may be empty — only show "Official Site" link if present

---

## Open Decisions

- None
