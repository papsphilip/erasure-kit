---
phase: 04-email-templates
plan: "02"
subsystem: ui
tags: [preact, htm, template-preview, sidebar, drawer, clipboard, editable-textarea, gdpr]

# Dependency graph
requires:
  - phase: 04-email-templates
    provides: "Template engine (generateGDPR, generateUKGDPR, generateCCPA, getTemplateForBroker, saveCustomTemplate, resetBrokerTemplate), clipboard utility, campaign schema v2"
  - phase: 03-broker-database
    provides: "Brokers page with search/filter/sort table, allBrokers signal, broker objects"
provides:
  - "TemplateDrawer component for expandable general GDPR template preview"
  - "TemplateSidebar component for per-broker preview/edit with copy and reset"
  - "Integrated Brokers page with drawer, sidebar, and preview buttons on selected rows"
affects: [05-sending-and-status-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns: ["expandable drawer with signal-driven open/close", "fixed sidebar panel with mobile backdrop overlay", "debounced textarea save for per-broker template edits", "inline SVG tooltip pattern for preview button"]

key-files:
  created:
    - src/components/TemplateDrawer.js
    - src/components/TemplateSidebar.js
  modified:
    - src/pages/Brokers.js

key-decisions:
  - "Sidebar uses fixed positioning with full-width mobile overlay and 420px/480px desktop panel"
  - "Preview button (eye icon) only shows for selected brokers to avoid clutter"
  - "Textarea debounced at 300ms for save, copy reads live textarea value for accuracy"
  - "Main container shifts right margin when sidebar is open for table visibility on desktop"

patterns-established:
  - "Expandable drawer: signal-driven toggle with conditional render (not CSS max-height animation)"
  - "Fixed sidebar panel: mobile full-width + backdrop, desktop fixed-width with sm/lg breakpoints"
  - "Data attribute (data-ek-template-body) for querying live textarea value from copy handler"

requirements-completed: [TMPL-05, TMPL-06]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 4 Plan 2: Email Templates - Template Preview UI Summary

**Expandable template drawer and right slide-in sidebar for per-broker preview, editing, copy-to-clipboard, and reset-to-default on the Brokers page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T12:03:09Z
- **Completed:** 2026-03-30T12:06:37Z
- **Tasks:** 2/2 auto tasks complete (checkpoint pending)
- **Files modified:** 3

## Accomplishments
- TemplateDrawer component showing base GDPR template in an expandable drawer at the top of the Brokers page, with muted fallback when no identity is entered
- TemplateSidebar component with To/Subject/Body fields, editable textarea with 300ms debounced save, copy-to-clipboard with "Copied!" fade feedback, and reset-to-default button for custom edits
- Brokers page integration with preview eye icon on selected broker rows, sidebar panel shifting the table container, and responsive mobile/desktop layout
- All 63 existing tests pass, production build succeeds at 89KB (25.6KB gzipped)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TemplateDrawer and TemplateSidebar components** - `85b83f3` (feat)
2. **Task 2: Integrate drawer and sidebar into Brokers page** - `fa6d65b` (feat)

## Files Created/Modified
- `src/components/TemplateDrawer.js` - Expandable drawer showing general GDPR template preview with identity pre-fill
- `src/components/TemplateSidebar.js` - Right slide-in panel for per-broker template preview/edit with copy and reset actions
- `src/pages/Brokers.js` - Integrated TemplateDrawer + TemplateSidebar + PreviewIcon button + sidebar-aware layout

## Decisions Made
- Fixed-position sidebar with responsive breakpoints (full-width mobile overlay with backdrop, 420px/480px desktop panel) rather than CSS grid-based layout change
- Preview eye icon only visible on selected brokers -- unselected brokers have no templates to preview
- Copy handler reads live textarea value via DOM query rather than signal value to capture unsaved edits
- Drawer uses conditional render (signal toggle) instead of CSS max-height animation for simplicity and reliability with HTM templates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all components are fully functional with real template data from the Plan 01 engine.

## Next Phase Readiness
- Template preview and editing UI complete, ready for Phase 5 (Sending and Status Tracking)
- TemplateSidebar exports `openSidebar` which Phase 5 can use to open templates before sending
- Copy-to-clipboard ready for fallback when mailto: URL is too long (Phase 5 SEND-04)
- All per-broker template edits persist through campaign auto-save and file save/load

## Self-Check: PASSED

All 3 created/modified files verified on disk. Both commits (85b83f3, fa6d65b) verified in git history.

---
*Phase: 04-email-templates*
*Completed: 2026-03-30*
