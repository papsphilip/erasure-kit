# Phase 2: Identity Input and Persistence - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can enter their identity information for GDPR requests and save/load their full campaign state to local files, with data never leaving the browser.

Requirements: IDEN-01 (full name), IDEN-02 (email addresses), IDEN-03 (optional phone/address), IDEN-04 (local-only storage), PERS-01 (file save), PERS-02 (file load), PERS-03 (fallback for non-Chromium), PERS-04 (localStorage auto-save).

</domain>

<decisions>
## Implementation Decisions

### Identity Form Layout
- **D-01:** Single rounded-xl card with all fields stacked vertically — name, emails, optional phone/address, Continue button
- **D-02:** Multi-email input uses list pattern — each email is a row with text input + [x] remove button, "+" Add email" link below to add more
- **D-03:** Optional fields (phone + address) behind a collapsible disclosure — "Optional: Phone & Address" collapsed by default, expands in-place
- **D-04:** Brief inline helper text under each field explaining WHY it's needed: "Included in erasure requests to identify your records" for name, "Brokers erase data linked to these addresses" for emails
- **D-05:** Soft limit of 10 email addresses — after 10, show informational note "Most users need fewer than 10 addresses" but allow adding more

### Form Validation
- **D-06:** Inline real-time validation on blur — red border + helper text for invalid emails, empty required fields
- **D-07:** Continue button disabled until name + at least 1 valid email entered
- **D-08:** Continue button navigates to Step 2 (Brokers) and marks Identity step as complete in the stepper

### Campaign Data Model
- **D-09:** Flat JSON structure with top-level version key: `{ version, createdAt, updatedAt, identity, brokers, tempEmail, messages, statuses, settings }`
- **D-10:** Phase 2 pre-populates the full schema with empty slots for future phases (brokers: {}, tempEmail: null, messages: [], statuses: {}, settings: {})
- **D-11:** Default file name: "erasure-kit-campaign.json" — File System API picker lets user rename, download fallback uses the default
- **D-12:** Auto-migrate forward on file load — if loaded file has version < current, auto-add missing keys with defaults. If version > current, refuse to load with clear warning message
- **D-13:** Single localStorage key: "ek-campaign" stores the entire campaign JSON (alongside existing "ek-theme" from Phase 1)

### Save/Load UX
- **D-14:** Save and Load as icon buttons in the header bar, always visible from any page (next to hamburger menu)
- **D-15:** localStorage as draft cache — auto-save on every change. File save is the explicit "real" save. On load: file data overwrites localStorage. If no file loaded, localStorage draft offered as recovery on next visit
- **D-16:** Auto-save indicator: subtle "Auto-saved" text with checkmark in footer, fades after 2 seconds
- **D-17:** Always show file picker on Save (even if file handle exists from previous save/load) — user explicitly chose not to silently overwrite
- **D-18:** Load error handling: friendly message "This file doesn't appear to be a valid ErasureKit campaign" with "Try another file" / "Cancel" options. Never crash. Never overwrite localStorage with bad data

### Resume Flow (Welcome Screen)
- **D-19:** Returning user sees dual buttons: "Resume Campaign" (primary) + "Start New" (secondary). Resume loads cached localStorage state. Start New clears localStorage
- **D-20:** Summary text above buttons: "You have an unsaved campaign with N emails to erase"
- **D-21:** "Load from file" as a text link below the buttons for manual file import

### Browser Fallback
- **D-22:** Auto-detect File System API support — Chromium gets native file picker, Firefox/Safari get download/upload fallback. Same Save button, different mechanism, no user-facing error

### Privacy Indicators
- **D-23:** Contextual micro-copy near the form: lock icon + "Your data never leaves this device" — small, muted, inside the card header area
- **D-24:** No network activity indicator in Phase 2 — zero network calls happen. Network indicator deferred to Phase 6 when mail.tm API calls begin

### Claude's Discretion
- State management implementation (Preact Signals structure for campaign data)
- browser-fs-access integration details and API usage
- localStorage auto-save debounce timing
- Form field ordering within the card
- Address field format (single textarea vs structured fields)
- Phone input format (free text vs structured)
- Exact validation regex for email addresses
- CSS transitions for disclosure expand/collapse and auto-save indicator fade

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Architecture
- `CLAUDE.md` — Full technology stack (Preact 10.29.0, HTM 3.1.1, Preact Signals, browser-fs-access 0.35.0, Tailwind v4, two-mode architecture)

### Requirements
- `.planning/REQUIREMENTS.md` — IDEN-01 through IDEN-04, PERS-01 through PERS-04 requirements for this phase
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependencies

### Prior Phase Context
- `.planning/phases/01-app-shell-and-distribution/01-CONTEXT.md` — Phase 1 decisions (visual identity, navigation, palette, distribution)

### Project Constraints
- `.planning/PROJECT.md` — No server, free APIs only, portable, privacy-first, File System API with fallback

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/router.js` — Signal-based routing with `currentPage`, `navigateTo()`, `markStepComplete()`. Identity form Continue button should call both.
- `src/lib/theme.js` — Establishes the localStorage + signal + effect pattern. Campaign persistence should follow the same pattern.
- `src/components/Header.js` — Header component where Save/Load icon buttons will be added
- `src/components/WelcomeScreen.js` — Where Resume Campaign / Start New / Load from file buttons will be added
- `src/components/Footer.js` — Where auto-save indicator text will appear
- `src/pages/Identity.js` — Placeholder page ready to be replaced with the real form

### Established Patterns
- Signal-based state: all shared state uses Preact Signals (currentPage, isDark, completedSteps)
- CSS custom properties: theme colors via `var(--ek-*)` CSS variables
- Tailwind v4: utility classes with `@custom-variant dark` for dark mode
- Component pattern: named exports, `html` tagged templates from `htm/preact`

### Integration Points
- `src/app.js` — Imports Identity page, renders based on `currentPage.value === 'identity'`
- `src/styles.css` — Tailwind theme configuration with ErasureKit color tokens
- Header component — needs Save/Load icon buttons added
- WelcomeScreen — needs localStorage detection and Resume/Start New conditional rendering
- Footer — needs auto-save indicator

</code_context>

<specifics>
## Specific Ideas

- The form card follows the ASCII mockup discussed: single card with "Your Information" header, lock icon + privacy note, stacked fields, collapsible optional section, Continue button at bottom
- Welcome screen for returning users: summary of cached campaign ("3 emails to erase"), dual buttons, "Load from file" text link below
- Auto-save indicator is intentionally subtle — checkmark in footer that fades, not a toast or banner
- Save always shows file picker (user explicitly rejected silent overwrite)
- Phone and address are intentionally behind a disclosure — most GDPR requests only need name + email

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-identity-input-and-persistence*
*Context gathered: 2026-03-29*
