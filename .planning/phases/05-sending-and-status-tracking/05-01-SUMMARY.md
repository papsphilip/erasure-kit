---
phase: 05-sending-and-status-tracking
plan: "01"
subsystem: ui, email, state
tags: [preact, signals, mailto, date-fns, modal, stepper, dashboard, status-tracking]

# Dependency graph
requires:
  - phase: 04-email-templates
    provides: template engine, template preview sidebar, clipboard utility
provides:
  - Status tracking data model with per-broker lifecycle and deadline calculation
  - Email sending via mailto with clipboard fallback for long templates
  - Centered template modal replacing sidebar with navigation arrows
  - 3-step wizard (Identity -> Brokers -> Track)
  - Track page campaign dashboard with progress bar, stat cards, and broker list
  - Batch send with progress tracking and abort support
affects: [06-temp-email-monitoring, 08-escalation]

# Tech tracking
tech-stack:
  added: [date-fns]
  patterns: [status lifecycle tracking, calendar-month deadline, modal navigation, batch async operations]

key-files:
  created:
    - src/lib/status-tracker.js
    - src/lib/email-sender.js
    - src/components/TemplateModal.js
  modified:
    - src/app.js
    - src/components/Stepper.js
    - src/pages/Brokers.js
    - src/pages/Track.js
    - src/index.html
    - package.json

key-decisions:
  - "date-fns addMonths for legally accurate calendar-month deadline (not naive +30 days)"
  - "Status lifecycle skips 'sent' state - goes directly to 'awaiting' per D-37"
  - "mailto: URI with 2000-char limit fallback to clipboard per SEND-04"
  - "Modal max-w-3xl (768px) replaces sidebar per D-16"
  - "Batch send with 1.5s delay between emails to avoid overwhelming email client"

patterns-established:
  - "Status tracking via campaign.statuses[brokerId] with full history"
  - "Modal pattern with broker list navigation arrows"
  - "Sticky bottom bar with contextual action buttons"
  - "Overdue auto-detection on Track page load"

requirements-completed: [SEND-01, SEND-02, SEND-03, SEND-04, STAT-01, STAT-02, STAT-03, STAT-04, STAT-05]

# Metrics
duration: 11min
completed: 2026-04-01
---

# Phase 5 Plan 01: Sending Infrastructure, Status Tracking, and Campaign Dashboard Summary

**Mailto-based erasure request sending with clipboard fallback, per-broker status lifecycle with calendar-month deadlines, centered template modal with navigation, and full campaign dashboard on Track page**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-01T07:10:58Z
- **Completed:** 2026-04-01T07:21:43Z
- **Tasks:** 5
- **Files modified:** 10

## Accomplishments
- Complete status tracking system with per-broker lifecycle (selected -> awaiting -> confirmed/rejected/overdue) and calendar-month deadline calculation via date-fns
- Email sending via mailto: URIs with automatic clipboard fallback for templates exceeding 2000 characters, plus batch send with progress tracking and abort support
- Centered template modal (768px) replacing the sidebar, with broker navigation arrows, send/copy/reset actions, and broker metadata display
- Stepper refactored from 4 to 3 steps (Identity -> Brokers -> Track), Send page deleted and merged into Brokers
- Full campaign dashboard on Track page: progress bar, 5 color-coded stat cards, broker status list with deadline countdown, filter/sort controls, expandable history rows, overdue detection, and success banner

## Task Commits

Each task was committed atomically:

1. **Task 1: Status tracking data model** - `b4964b0` (feat)
2. **Task 2: Stepper refactoring and route cleanup** - `f33875f` (refactor)
3. **Task 3: Sidebar to modal refactoring** - `793d504` (feat)
4. **Task 4: Sticky send bar and email sender** - `87f7336` (feat)
5. **Task 5: Track page campaign dashboard** - `e9cff02` (feat)

## Files Created/Modified
- `src/lib/status-tracker.js` - Status lifecycle management, deadline calculation, aggregate stats, overdue detection
- `src/lib/email-sender.js` - Mailto sending, clipboard fallback, batch send with progress/abort
- `src/components/TemplateModal.js` - Centered modal with broker metadata, template preview/edit, navigation arrows, send/copy/reset
- `src/pages/Track.js` - Campaign dashboard: progress bar, stat cards, broker list, deadline tracking, history rows
- `src/pages/Brokers.js` - Modal integration, sticky send bar, batch send UI, confirmation dialog, per-broker send status
- `src/app.js` - Removed Send route, updated wizard step set
- `src/components/Stepper.js` - 4 steps to 3 steps
- `src/index.html` - Added date-fns to import map for dev mode
- `package.json` - Added date-fns dependency
- `src/pages/Send.js` - Deleted (merged into Brokers)

## Decisions Made
- Used date-fns `addMonths()` for legally accurate "one calendar month" deadline calculation (Jan 31 + 1 month = Feb 28, not Jan 31 + 30 days)
- Status lifecycle skips explicit "sent" state per D-37 -- goes directly from "selected" to "awaiting" when send is confirmed
- mailto: URL limit set at 2000 characters -- longer templates automatically fall back to clipboard copy with user notification
- Modal replaces sidebar entirely per D-16 -- max-w-3xl (768px), full-screen on mobile, with broker navigation arrows
- Batch send uses 1.5 second delay between emails to avoid overwhelming user's email client
- Track page auto-detects overdue brokers on load via comparison of today vs deadline dates
- allBrokers signal exported from Brokers.js so Track page can look up broker details by ID

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported allBrokers signal from Brokers.js**
- **Found during:** Task 5 (Track page dashboard)
- **Issue:** Track page needs broker objects (name, region, etc.) but allBrokers signal was module-private in Brokers.js
- **Fix:** Changed `const allBrokers = signal([])` to `export const allBrokers = signal([])` in Brokers.js
- **Files modified:** src/pages/Brokers.js, src/pages/Track.js
- **Verification:** Track page correctly displays broker names and details

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- single export change to share broker data between pages.

## Issues Encountered
None -- all tasks completed without errors.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- Escalate button on overdue broker rows shows "Escalation coming in Phase 8" tooltip -- placeholder for Phase 8 implementation
- D-31: No manual status changes on Track page -- broker status will be auto-updated by Phase 6 temp email monitoring

## Next Phase Readiness
- Status tracking infrastructure complete -- Phase 6 (Temp Email Monitoring) can use `updateBrokerStatus()` to transition brokers to confirmed/rejected
- Phase 8 (Escalation) can wire the Escalate button on overdue brokers to generate follow-up templates
- Notification system (D-51 through D-57) deferred to Phase 6 when there are actual events to notify about

## Self-Check: PASSED

All 9 created/modified files verified present. Send.js confirmed deleted. All 5 task commits verified in git log. Build succeeds (128.82 KB output).

---
*Phase: 05-sending-and-status-tracking*
*Completed: 2026-04-01*
