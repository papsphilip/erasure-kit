# Phase 5: Sending and Status Tracking - Context (WORK IN PROGRESS)

**Gathered:** 2026-03-30
**Status:** Discussion in progress — 2 of 4 areas complete

<domain>
## Phase Boundary

Users can send erasure requests to all selected brokers via mailto: links and track each broker's status through a lifecycle with a campaign dashboard showing campaign-wide progress.

Requirements: SEND-01 (mailto: links), SEND-02 (batch send), SEND-03 (confirm + status update), SEND-04 (mailto: length fallback), STAT-01 (per-broker status lifecycle), STAT-02 (calendar month deadline), STAT-03 (overdue flags), STAT-04 (aggregate dashboard stats), STAT-05 (progress percentage).

</domain>

<decisions>
## Implementation Decisions

### Send Page Layout
- **D-01:** Action list layout — vertical list of selected brokers, each row showing broker name, email, region badge, status indicator, and a Send button. Compact, scannable, focused on the action.
- **D-02:** Compact stats bar at top of the Send page: "42 selected · 0 sent · 0 awaiting · 0 confirmed". Gives immediate orientation without needing the Track page.
- **D-03:** Empty state (no brokers selected): friendly nudge "No brokers selected yet" with a "Go to Brokers →" button navigating to step 2.
- **D-04:** All brokers shown in list, sent ones dimmed with ✓ checkmark, Send button replaced with "Sent" badge. User can still re-send if needed.
- **D-05:** Expandable rows show read-only template preview + Copy button. Editing stays on the Brokers page sidebar. Keeps Send page focused on sending.
- **D-06:** Same max-w-4xl (896px) width as the Brokers page for visual consistency.
- **D-07:** "Download as text file" button instead of "Copy All" — generates a .txt file with all templates, one per broker. Works for any length.
- **D-08:** No extra "back to Brokers" navigation link — the stepper at the top already allows free jumping between all steps (Phase 1 D-02).

### Batch Sending UX
- **D-09:** "Send All" uses sequential confirm flow — opens first mailto: link, shows modal: "Sending to [Broker] (1 of 42) — Did you send it?" with [✓ Yes, sent] / [Skip] / [Stop] buttons. On confirm, marks sent and auto-opens next. User controls the pace.
- **D-10:** Long template fallback (>~2000 chars): auto-detect, auto-copy body to clipboard, show modified modal with step-by-step instructions: "1. Open a new email to [address] 2. Subject: [subject] 3. Paste the body (Ctrl+V)". Then continue batch flow.
- **D-11:** Individual per-broker Send button opens mailto: directly (no modal). Row then shows inline "Did you send it? [Yes] [Undo]" confirmation. Faster for one-off sends.
- **D-12:** Subtle "Re-send" text link on sent brokers, next to the ✓ Sent badge. Opens the same mailto: flow. Useful if original email bounced.

### Campaign Dashboard
*NOT YET DISCUSSED — resume here*

### Status Lifecycle
*NOT YET DISCUSSED — resume here*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Architecture
- `CLAUDE.md` — Full technology stack (Preact 10.29.0, HTM 3.1.1, Preact Signals, Tailwind v4, two-mode architecture, date-fns for date arithmetic)

### Requirements
- `.planning/REQUIREMENTS.md` — SEND-01 through SEND-04, STAT-01 through STAT-05 requirements for this phase
- `.planning/ROADMAP.md` — Phase 5 success criteria and dependencies

### Prior Phase Context
- `.planning/phases/01-app-shell-and-distribution/01-CONTEXT.md` — Visual identity, palette, navigation, stepper with free jumping
- `.planning/phases/02-identity-input-and-persistence/02-CONTEXT.md` — Campaign data model (statuses: {}, messages: []), persistence patterns
- `.planning/phases/03-broker-database/03-CONTEXT.md` — Broker schema, regions, selection mechanics
- `.planning/phases/04-email-templates/04-CONTEXT.md` — Template engine, per-broker customization, clipboard copy pattern

### Project Constraints
- `.planning/PROJECT.md` — No server, portable, privacy-first

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/template-engine.js` — `generateTemplate()`, `getTemplateForBroker()` for generating mailto: body/subject
- `src/lib/campaign.js` — Campaign signal with `statuses: {}` slot, broker selection helpers, auto-save effect
- `src/lib/clipboard.js` — `copyToClipboard()` with secure context detection and legacy fallback
- `src/components/TemplateSidebar.js` — Per-broker template preview/edit pattern (sidebar approach)
- `src/pages/Send.js` — Placeholder page ready to be replaced

### Established Patterns
- Signal-based state (Preact Signals) — send modal state, batch progress should be signals
- Computed signals for derived data (filteredBrokers, selectedIds)
- CSS custom properties via `var(--ek-*)` for theming
- Tailwind v4 utility classes, `html` tagged templates
- Inline SVG icons, "Copied!" fade confirmation pattern

### Integration Points
- `src/app.js` — Routes to Send page via `currentPage.value === 'send'`
- `campaign.value.statuses` — Pre-existing empty slot for per-broker status tracking
- `campaign.value.brokers.selected` — Array of selected broker IDs
- `campaign.value.brokers.templates` — Per-broker custom template edits

</code_context>

---

*Phase: 05-sending-and-status-tracking*
*Context gathering paused: 2026-03-30 — resume with Campaign dashboard and Status lifecycle areas*
