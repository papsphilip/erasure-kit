# Phase 4: Email Templates - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

App generates legally accurate, region-aware GDPR Article 17 erasure request emails with correct legal citations, the user's identity data pre-filled, and per-broker customization. Templates are previewed in the Brokers page UI and persisted in the campaign JSON.

Requirements: TMPL-01 (legal citations), TMPL-02 (region-aware), TMPL-03 (correct terminology), TMPL-04 (identity pre-fill), TMPL-05 (preview), TMPL-06 (clipboard copy).

</domain>

<decisions>
## Implementation Decisions

### Template Preview UI
- **D-01:** General/base template shown at the top of the Brokers page inside an expandable drawer. Shows the template structure before any broker-specific customization.
- **D-02:** Per-broker preview opens in a right side panel (slides in from the right). Broker table stays visible on the left. Close with X or click another broker to swap content.
- **D-03:** Sidebar shows: To (broker email), Subject line, and the generated email body customized for that broker's region/legal framework.
- **D-04:** No dedicated preview page or new wizard step — templates live within the existing Brokers page.

### Template Tone & Legal Depth
- **D-05:** Full legal citations per TMPL-01: Art. 17(1) (right to erasure), Art. 19 (third-party notification), Art. 12(3) (one calendar month deadline), Art. 12(4) (refusal explanation obligation). One paragraph per legal basis.
- **D-06:** Substantially different templates per region. Three distinct template variants:
  - **EU/EEA (GDPR):** Cites GDPR articles, uses "personal data", "one calendar month" deadline, references national DPA
  - **UK (UK-GDPR):** Cites UK GDPR + Data Protection Act 2018, references ICO
  - **US (CCPA):** Cites Cal. Civ. Code §1798.105, uses "personal information", 45-day deadline, different tone
- **D-07:** Professional, assertive tone — not aggressive but makes clear the user knows their legal rights. Templates should read like they were drafted by someone who has read the legislation.

### Template Customization
- **D-08:** Editable textarea in the per-broker sidebar. Users can tweak wording, add context, or fix details for any individual broker.
- **D-09:** Per-broker edits are saved in the campaign JSON and survive page refresh, file save/load, and session resume. Stored per broker ID (e.g., `campaign.templates[brokerId]` or equivalent slot).
- **D-10:** Editing one broker's template does not affect other brokers — each gets an independent copy once edited. Unedited brokers always use the latest auto-generated template.
- **D-11:** A "Reset to default" action in the sidebar to discard per-broker edits and regenerate from the base template.

### Clipboard & Copy UX
- **D-12:** "Copy to clipboard" button inside the per-broker sidebar panel, next to the editable textarea. Copies the current text including any user edits.
- **D-13:** Small inline "Copied!" confirmation that fades after ~2 seconds (consistent with Phase 2 auto-save indicator pattern).
- **D-14:** No bulk copy — per-broker copy only. Bulk sending is Phase 5's domain.

### Data Persistence
- **D-15:** All template state persists in the campaign JSON — per-broker custom edits, any template preferences. Loaded intact on resume, file load, or page refresh. Uses the existing campaign signal + auto-save + file save/load from Phase 2.
- **D-16:** Template generation is a pure function: (identity data + broker data + region) → email text. No external dependencies, no API calls.

### Claude's Discretion
- Template text structure and exact legal wording (must be legally accurate per TMPL-01/TMPL-03)
- Campaign JSON schema extension for template storage (where in the campaign object custom edits live)
- Sidebar width, animation, and responsive behavior on mobile
- Expandable drawer implementation at top of Brokers page
- Subject line format per region
- How the "general template" drawer relates to the per-broker sidebar (read-only overview vs editable base)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Architecture
- `CLAUDE.md` — Full technology stack (Preact 10.29.0, HTM 3.1.1, Preact Signals, Tailwind v4, two-mode architecture)

### Requirements
- `.planning/REQUIREMENTS.md` — TMPL-01 through TMPL-06 requirements for this phase
- `.planning/ROADMAP.md` — Phase 4 success criteria and dependencies

### Prior Phase Context
- `.planning/phases/01-app-shell-and-distribution/01-CONTEXT.md` — Visual identity, palette, rounding, navigation
- `.planning/phases/02-identity-input-and-persistence/02-CONTEXT.md` — Campaign data model (D-09, D-10, D-15), persistence patterns, form patterns
- `.planning/phases/03-broker-database/03-CONTEXT.md` — Broker schema (D-18), regions (D-19), broker list UI, selection mechanics

### Legal Reference
- `helpers/erasure-kit.md` (Virgo monorepo root) — Reference material, prior art research, datarequests.org CC0 templates
- datarequests.org sample erasure letter (CC0 licensed) — referenced in CLAUDE.md Sources section

### Project Constraints
- `.planning/PROJECT.md` — No server, portable, privacy-first, legal accuracy constraint

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/campaign.js` — Campaign signal with `brokers.selected` array, auto-save effect, file save/load. Template storage slot needs to be added (schema extension).
- `src/pages/Brokers.js` — Full broker table with search/filter/sort, expandable rows, computed signals for filtered/selected state. Template drawer and sidebar will extend this page.
- `src/lib/brokers-loader.js` — Loads brokers.json, provides broker data including `region`, `legalFramework`, `email`, `name`.
- `src/pages/Identity.js` — Identity form reads `campaign.value.identity` (fullName, emails, phone, address) — template generator reads the same data.

### Established Patterns
- Signal-based state (Preact Signals) — sidebar open/closed state, active broker preview, custom edit text should all be signals
- Computed signals for derived data (e.g., `filteredBrokers`, `selectedIds`) — template generation can follow the same pattern
- CSS custom properties via `var(--ek-*)` for theming
- Tailwind v4 utility classes
- `html` tagged templates from `htm/preact`
- Inline SVG icons (no external icon library)
- CSS-only tooltips (Phase 3 D-04 pattern)

### Integration Points
- `src/pages/Brokers.js` — Primary integration point. Drawer at top + sidebar panel extend this component.
- `src/lib/campaign.js` — Needs schema extension for per-broker template storage
- `campaign.value.identity` — Read for template pre-fill (name, emails)
- `campaign.value.brokers.selected` — Read for which brokers need templates
- `public/brokers.json` — Read for broker email, region, legalFramework, name

</code_context>

<specifics>
## Specific Ideas

- General template drawer at top of Brokers page — expandable, shows the base template structure as an overview
- Right sidebar slides in when clicking a broker — shows To/Subject/Body customized for that broker
- Editable textarea in sidebar — user edits persist per broker in campaign JSON
- "Reset to default" to discard per-broker edits
- "Copy to clipboard" with inline "Copied!" fade confirmation
- Three distinct template variants: GDPR (EU/EEA), UK-GDPR (UK), CCPA (US)
- Templates are pure functions — no network calls, generated from identity + broker data
- All custom edits round-trip through existing save/load flow (localStorage auto-save + file save/load)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-email-templates*
*Context gathered: 2026-03-30*
