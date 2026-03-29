# Phase 3: Broker Database - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse, search, filter, and select data brokers from a comprehensive 100+ entry database loaded from brokers.json. Broker selections persist in the campaign state (auto-saved to localStorage and file saves).

Requirements: BRKR-01 (separate brokers.json), BRKR-02 (100+ entries), BRKR-03 (broker fields), BRKR-04 (search/filter), BRKR-05 (select/deselect/bulk), BRKR-06 (tempEmailAccepted indicator).

</domain>

<decisions>
## Implementation Decisions

### Broker List Layout
- **D-01:** Compact table with columns: checkbox, name, email (truncated), region, category. Sortable column headers (name, region, category). Default sort: alphabetical by name.
- **D-02:** Wider than Identity form: `max-w-4xl` (896px) centered, to accommodate table columns.
- **D-03:** Click a broker row to expand inline below with: full email, privacy portal URL (clickable), legal framework, notes. Collapse on re-click.
- **D-04:** Temp-email-blocked indicator: small inline warning icon (⚠) next to broker name with tooltip "May block temp emails". Subtle but visible at a glance.
- **D-05:** Selected rows get checked checkbox + subtle accent background tint (light cyan/blue) to visually distinguish from unselected rows.

### Search and Filter UX
- **D-06:** Horizontal toolbar above table: search input + Region dropdown + Category dropdown. Always visible.
- **D-07:** Sticky toolbar — search bar and filter dropdowns stick to top when scrolling through 100+ brokers.
- **D-08:** Instant filter-as-you-type search (no debounce needed for 100-200 entries). Filters by broker name.
- **D-09:** Filter combination: AND between types (Region AND Category), values are inclusive within type. Single-select dropdowns (one value at a time per dropdown).
- **D-10:** Result count text below filters: "Showing N of M brokers | X selected (×)" — dynamic as filters change.
- **D-11:** "× Clear filters" link visible whenever any filter is active. Disappears when all filters at default.
- **D-12:** Empty search state: centered "No brokers match your search" with "Try different keywords or [Clear all filters]" link.

### Selection Mechanics
- **D-13:** "Select All" checkbox in table header selects all currently visible (filtered) brokers. Plus a "Select all N visible" button in the toolbar.
- **D-14:** "Deselect All" via "X selected (×)" — clicking the × clears all selections.
- **D-15:** Broker selections persist in campaign state as `campaign.brokers.selected: ["broker-id", ...]` — array of broker ID slugs. Broker details always read from brokers.json, not duplicated in campaign.
- **D-16:** Continue button at bottom: "Continue to Send →", disabled until at least 1 broker selected. Navigates to Send step and marks Brokers step complete (consistent with Phase 2 Identity form pattern).

### Broker Data Compilation
- **D-17:** Research agent compiles 100+ brokers from open-source GitHub lists during research phase: yaelwrites/BADBOOL, JustVanish, datarequests.org, Vermont/California registries, The Markup dataset. Deduplicate by domain/name, normalize to schema.
- **D-18:** Full broker JSON schema per BRKR-03: `{ id, name, email, region, category, privacyPortalUrl, legalFramework, tempEmailAccepted, notes }`. ID is auto-generated slug from name.
- **D-19:** Standardized regions: "EU/EEA", "UK", "US", "Other" — maps to GDPR, UK-GDPR, CCPA, Other.
- **D-20:** Standardized categories: Data Broker, Credit Bureau, People Search, Advertising/Adtech, Analytics, Social Media, Telecom, Other.

### Claude's Discretion
- Virtual scrolling implementation (if needed for performance with 100+ rows, or simple DOM rendering if fast enough)
- Tooltip implementation approach (CSS-only vs signal-based)
- Expand/collapse animation details
- Column width distribution within max-w-4xl
- Mobile responsive breakpoints for the table (horizontal scroll or stacked cards on narrow viewports)
- How duplicate brokers across sources are detected and merged during compilation
- brokers.json validation (schema check on load)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Architecture
- `CLAUDE.md` — Full technology stack (Preact 10.29.0, HTM 3.1.1, Preact Signals, browser-fs-access, Tailwind v4, two-mode architecture)

### Requirements
- `.planning/REQUIREMENTS.md` — BRKR-01 through BRKR-06 requirements for this phase
- `.planning/ROADMAP.md` — Phase 3 success criteria and dependencies

### Prior Phase Context
- `.planning/phases/01-app-shell-and-distribution/01-CONTEXT.md` — Visual identity, palette, rounding, navigation
- `.planning/phases/02-identity-input-and-persistence/02-CONTEXT.md` — Campaign data model (D-09, D-10, D-15), persistence patterns, form patterns

### Project Constraints
- `.planning/PROJECT.md` — No server, portable, privacy-first

### Open-Source Broker Lists (for researcher)
- `helpers/erasure-kit.md` (Virgo monorepo root) — Reference material mentioning broker sources

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/brokers-loader.js` — Already handles loading brokers.json with fetch + file:// fallback. Phase 3 builds on top of this.
- `src/lib/campaign.js` — Campaign signal with `brokers: {}` slot. Phase 3 needs to add broker selection helpers (selectBroker, deselectBroker, toggleBroker, etc.)
- `src/lib/router.js` — `navigateTo('send')` and `markStepComplete('brokers')` for Continue button
- `src/pages/Brokers.js` — Placeholder page ready to be replaced

### Established Patterns
- Signal-based state (Preact Signals) — broker list, search query, filter values, and selections should all be signals
- CSS custom properties via `var(--ek-*)` for theming
- Tailwind v4 utility classes
- `html` tagged templates from `htm/preact`
- Form card pattern from Phase 2 (rounded-xl, padding, privacy micro-copy)

### Integration Points
- `src/app.js` — Already imports and routes to Brokers page via `currentPage.value === 'brokers'`
- `public/brokers.json` — Currently has 1 placeholder entry, will be replaced with 100+ compiled entries
- Campaign auto-save — any changes to `campaign.value.brokers.selected` will auto-persist via the existing debounced effect

</code_context>

<specifics>
## Specific Ideas

- Table follows the ASCII mockups discussed: toolbar with search + dropdowns above, sortable column headers, expandable rows, sticky toolbar
- "Showing N of M brokers | X selected (×)" status line gives constant orientation
- Selected rows get accent tint background — visual scanning of selections at a glance
- Continue button at bottom mirrors the Identity form's Continue to Brokers pattern
- Broker compilation happens at research time, producing a static brokers.json — no runtime scraping

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-broker-database*
*Context gathered: 2026-03-29*
