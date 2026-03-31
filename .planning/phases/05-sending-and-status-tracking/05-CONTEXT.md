# Phase 5: Sending and Status Tracking - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can send erasure requests to all selected brokers via automated temp-email sending and track per-broker status through a lifecycle with a campaign dashboard showing campaign-wide progress.

Requirements: SEND-01 (automated sending), SEND-02 (batch send), SEND-03 (confirm + status update), SEND-04 (length fallback), STAT-01 (per-broker status lifecycle), STAT-02 (calendar month deadline), STAT-03 (overdue flags), STAT-04 (aggregate dashboard stats), STAT-05 (progress percentage).

**MAJOR ARCHITECTURE CHANGE:** Original mailto:-based sending is replaced with fully automated temp-email sending. The Send page is merged into the Brokers page. Stepper becomes 3 steps: Identity -> Brokers -> Track. The sidebar is replaced with a centered modal.

</domain>

<decisions>
## Implementation Decisions

### Sending Architecture (supersedes original mailto: approach)
- **D-01:** Fully automated sending via temp email — no mailto: links, no user confirmations. User clicks "Send All" and the app sends all emails automatically from the temp email address.
- **D-02:** Sequential batch sending with 2-3 second delay between emails to avoid rate limiting. 169 brokers ~= 6-8 minutes.
- **D-03:** Progress bar + live scrolling log during batch: "Sending... 42/169" with per-broker entries ("✓ Acxiom — sent", "✗ Oracle — failed (retry)").
- **D-04:** On API error: skip and continue to next email. Retry failed emails after a few seconds, max 3 times. If still fails, flag it for user review.
- **D-05:** Failed emails: per-row "Copy Email" button (copies template + broker address to clipboard) AND bulk "Download all failed as .txt" button. User can manually send via their own email software.
- **D-06:** Researcher must investigate free/open-source temp email services that can SEND (not just receive). mail.tm is receive-only. Identify best option + fallback services.

### Brokers + Send Page Merge
- **D-07:** Send page merged into Brokers page. Stepper becomes 3 steps: Identity -> Brokers -> Track.
- **D-08:** Sticky bottom bar on Brokers page: "169 selected · 42 sent — [Send Remaining (127)]". Updates in real-time. Button text changes from "Send All" to "Send Remaining" after partial sends.
- **D-09:** Per-broker send icon (envelope) on EVERY broker row (not just selected ones). Sends to that one broker immediately via automated temp email.
- **D-10:** Send All auto-navigates to Track page. Individual per-broker sends stay on Brokers page.
- **D-11:** After sending, broker row send icon changes to green ✓ checkmark. Hovering reveals "Re-send" action. Sent rows dimmed with reduced opacity.
- **D-12:** Confirmation dialog before Send All: "Send erasure requests to 169 brokers from [temp-email]? This will take ~6 minutes." with [Send] / [Cancel].
- **D-13:** Send buttons disabled (grayed out with tooltip) if no temp email created yet: "Complete Identity step first to create your temp email."
- **D-14:** Cancel button on Track page during in-progress batch: "Stop Sending". Already-sent emails stay sent, remaining go back to unsent.
- **D-15:** Template sidebar kept as-is in terms of functionality (preview/edit/copy/reset) — but see Modal Replacement below.

### Sidebar -> Modal Replacement
- **D-16:** Sidebar removed entirely. Replaced with a centered modal (max-w-3xl / 768px, full-screen on mobile).
- **D-17:** Click broker row = open modal. Click chevron arrow icon = expand/collapse inline detail panel. Checkbox stops propagation (neither modal nor expand).
- **D-18:** Modal shows broker metadata (name, email, region, legal framework, privacy portal, temp email status, notes) at top, then template content below (To, Subject, editable Body textarea).
- **D-19:** Navigation arrows in modal header: [←] [Broker Name (3/169)] [→] [X close]. Arrows cycle through brokers in current filtered view.
- **D-20:** Modal has Send + Copy + Reset buttons in footer. User can preview/edit and send directly from modal.
- **D-21:** Close via X button, Esc key, or click outside modal backdrop.
- **D-22:** Click-only navigation between brokers — no keyboard arrow shortcuts (avoids conflict with text editing in textarea).
- **D-23:** Expandable inline row (chevron) still exists — quick peek at broker metadata without opening the full modal.

### Campaign Dashboard (Track Page)
- **D-24:** Track page is stepper step 3 (was step 4). Full campaign dashboard with progress bar + stats + broker list.
- **D-25:** Progress bar = (confirmed + rejected) / total selected. 100% means every broker resolved.
- **D-26:** Color-coded stat cards grid: Sent (blue), Awaiting (amber), Confirmed (green), Rejected (red), Overdue (dark red). Display-only (not clickable).
- **D-27:** Full broker status list below stats. Filter by status (dropdown/pills) + sort by deadline/name. Reuses filter pattern from Brokers page.
- **D-28:** Per-broker deadline display: "Apr 28 (23 days left)" — both calendar date AND countdown. Color: green (>14 days), amber (7-14 days), red (<7 days), dark red (overdue: "3 days overdue").
- **D-29:** Overdue brokers: red background tint, red "Overdue" badge, "Escalate" button (links to Phase 8 escalation).
- **D-30:** Expandable history rows per broker: "Selected Mar 15 → Sent Mar 16 10:42 → Awaiting..." including send attempts, retries, failures.
- **D-31:** No manual status changes on Track page — wait for Phase 6 auto-detection via temp email monitoring.
- **D-32:** Empty state: "No requests sent yet" with "Go to Brokers →" nudge.
- **D-33:** Real-time updates via Preact signals — stats update instantly when statuses change on Brokers page.
- **D-34:** Success banner when all brokers resolved: "✅ All brokers resolved! Your data erasure campaign is complete." with option to save and delete temp email.
- **D-35:** Same max-w-4xl (896px) width as Brokers page.
- **D-36:** No separate export — existing save/load covers campaign state.

### Status Lifecycle
- **D-37:** Auto-transition: when user confirms send (or automated send completes), status goes directly to "awaiting response" and deadline timer starts. No separate "sent" display state.
- **D-38:** Deadline calculation: date-fns `addMonths()` for legally accurate "one calendar month" (Jan 31 + 1 month = Feb 28). Not naive +30 days.
- **D-39:** Overdue = day after deadline. If deadline is Apr 28 and it's Apr 29, broker is overdue.
- **D-40:** Overdue detection: automatic on Track page load. Compare today vs each broker's deadline, update statuses in campaign signal.
- **D-41:** Data model: `campaign.statuses[brokerId] = { status: 'awaiting', sentAt: ISO, deadline: ISO, history: [{status, at, details}] }`. Object per broker with full history. Supports expandable history UI (D-30).
- **D-42:** Auto-escalation: when broker exceeds calendar month deadline, app automatically sends follow-up warning email from the same temp address. Fully hands-off.
- **D-43:** DPA complaints need explicit user approval — auto-escalation only sends warnings, not formal complaints.
- **D-44:** Auto-replies (ticket confirmations, out-of-office) classified as "acknowledged" — sub-state of awaiting. Deadline still ticks.

### Temp Email Lifecycle
- **D-45:** User creates temp email in the Identity step via a dedicated "Create temp email" button. Created before any sending happens.
- **D-46:** Temp email address visible but read-only in Identity step. User knows what address brokers will see.
- **D-47:** User clicks "Delete temp email" button when campaign is complete (shown on success banner).
- **D-48:** Temp email credentials (address + auth token) included in campaign JSON save file. User can resume monitoring after browser restart or from another session.
- **D-49:** Service down fallback: retry 3 times with 3 second delay, then fall back to alternative temp email services. Researcher identifies primary + fallback services.
- **D-50:** Health check: small status dot in header next to temp email. Green = reachable, red = unreachable. Persistent indicator.

### Notification System
- **D-51:** In-app toast notifications (bottom-right). 5 seconds auto-dismiss with manual X dismiss. No browser push notifications.
- **D-52:** Color-coded toasts: green (confirmed), amber (new response), red (overdue/escalation), blue (info/send complete).
- **D-53:** Clickable toasts — clicking navigates to Track page and scrolls/highlights the relevant broker.
- **D-54:** Red badge count on Track stepper tab showing unread events since last visit. Clears when user visits Track.
- **D-55:** Bell icon in header (top-right) with dropdown showing 5 most recent notifications. Red dot with unread count badge.
- **D-56:** Clicking a notification in the bell dropdown navigates to that broker on Track page (same behavior as toast click).
- **D-57:** Track page IS the full history — bell dropdown is just quick access to recent events.

### Campaign Restart
- **D-58:** One campaign at a time. To start new, save current to file first.
- **D-59:** "Start New" prompts: "You have an active campaign. Save it before starting new?" with [Save & Start New] / [Discard & Start New] / [Cancel].
- **D-60:** Re-run support: load old campaign JSON, option to "Reset all statuses" (clears sent/awaiting/confirmed, keeps selections and templates). New temp email created.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Architecture
- `CLAUDE.md` — Full technology stack (Preact 10.29.0, HTM 3.1.1, Preact Signals, Tailwind v4, two-mode architecture, date-fns for date arithmetic, browser-fs-access for file persistence)

### Requirements
- `.planning/REQUIREMENTS.md` — SEND-01 through SEND-04, STAT-01 through STAT-05 requirements for this phase
- `.planning/ROADMAP.md` — Phase 5 success criteria and dependencies

### Prior Phase Context
- `.planning/phases/01-app-shell-and-distribution/01-CONTEXT.md` — Visual identity, palette, navigation, stepper with free jumping (stepper now 3 steps)
- `.planning/phases/02-identity-input-and-persistence/02-CONTEXT.md` — Campaign data model (statuses: {}, messages: []), persistence patterns, save/load flow
- `.planning/phases/03-broker-database/03-CONTEXT.md` — Broker schema, regions, selection mechanics, expandable rows, filter/sort patterns
- `.planning/phases/04-email-templates/04-CONTEXT.md` — Template engine, per-broker customization, clipboard copy pattern, sidebar (now replaced with modal)

### Project Constraints
- `.planning/PROJECT.md` — No server, portable, privacy-first

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/template-engine.js` — `generateTemplate()`, `getTemplateForBroker()` for generating email body/subject
- `src/lib/campaign.js` — Campaign signal with `statuses: {}` slot, broker selection helpers, auto-save effect
- `src/lib/clipboard.js` — `copyToClipboard()` with secure context detection and legacy fallback
- `src/components/TemplateSidebar.js` — Template preview/edit pattern. To be refactored into a modal component. Core logic (getTemplateForBroker, saveCustomTemplate, resetBrokerTemplate, handleCopy) is reusable.
- `src/pages/Send.js` — Placeholder page to be DELETED (merged into Brokers)
- `src/pages/Track.js` — Placeholder page to be replaced with dashboard
- `src/pages/Brokers.js` — Main page that absorbs sending functionality. Has broker table, filter/sort, expandable rows, selection.

### Established Patterns
- Signal-based state (Preact Signals) — batch progress, modal state, notification state should be signals
- Computed signals for derived data (filteredBrokers, selectedIds, allVisibleSelected)
- CSS custom properties via `var(--ek-*)` for theming
- Tailwind v4 utility classes, `html` tagged templates
- Inline SVG icons, "Copied!" fade confirmation pattern
- Sticky toolbar pattern (Brokers page search/filter bar)

### Integration Points
- `src/app.js` — Routes. Remove 'send' route, update stepper to 3 steps (Identity, Brokers, Track)
- `campaign.value.statuses` — Pre-existing empty object for per-broker status tracking
- `campaign.value.brokers.selected` — Array of selected broker IDs
- `campaign.value.brokers.templates` — Per-broker custom template edits
- Header component — needs bell icon + health check dot additions

### Key Refactoring Required
- Stepper: 4 steps → 3 steps (remove Send, renumber Track)
- TemplateSidebar.js → TemplateModal.js (sidebar → centered modal with navigation)
- Brokers.js: add sticky send bar, per-broker send icons, sent state styling
- Campaign data model: expand `statuses` from `{}` to `{ [brokerId]: { status, sentAt, deadline, history[] } }`
- New: temp email service integration (created in Identity, used in Brokers for sending)
- New: notification system (toast + bell icon)
- New: Track page dashboard (progress bar, stats grid, broker status list)

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants zero-confirmation automated sending: "we dont want the user doing any confirmations"
- User wants temp email as the core mechanism: "we create temporary emails for this... emails should be sent via code automatically. we want free opensource way to do this"
- User wants the app to feel like: fill info → select brokers → click send and watch → track progress → auto-escalate. Minimal user interaction after setup.
- Modal replaces sidebar: click broker row opens modal, chevron expands inline details. Two levels of information access.
- Bell icon with 5 most recent notifications — user specifically requested this over "Track page IS the history" approach.

</specifics>

<deferred>
## Deferred Ideas

- **EmailJS as optional automated sender** — If the free temp email research doesn't yield a viable sending option, EmailJS (200/month free) could be a fallback. Deferred to researcher findings.
- **Browser push notifications** — Could be added as opt-in toggle later. Current decision: in-app toasts only.
- **Multiple simultaneous campaigns** — Current decision is one-at-a-time. Could be a v2 feature.
- **Auto-file DPA complaints** — Decided: warnings only auto-send, DPA complaints need user approval. Full auto could be a future option.

</deferred>

---

*Phase: 05-sending-and-status-tracking*
*Context gathered: 2026-03-31*
