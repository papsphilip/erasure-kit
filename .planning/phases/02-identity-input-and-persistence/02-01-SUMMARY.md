---
phase: 02-identity-input-and-persistence
plan: 01
subsystem: state-management
tags: [preact-signals, browser-fs-access, localStorage, vitest, jsdom, campaign-state, file-persistence]

# Dependency graph
requires:
  - phase: 01-app-shell-and-distribution
    provides: "Preact+HTM+Signals stack, import map, signal/effect/localStorage pattern (theme.js, router.js)"
provides:
  - "Campaign state signal with full JSON schema (identity, brokers, tempEmail, messages, statuses, settings)"
  - "Identity CRUD helpers (updateIdentity, updateIdentityEmail, addEmail, removeEmail)"
  - "Debounced auto-save to localStorage (500ms, ek-campaign key)"
  - "File save/load via browser-fs-access (fileSave/fileOpen with migration)"
  - "Version migration system for forward-compatible campaign files"
  - "Vitest test infrastructure with jsdom environment and Preact preset"
  - "browser-fs-access CDN import map entry for no-build dev mode"
affects: [02-02, 02-03, 02-04, 03-broker-selection, 05-send-and-track, 06-temp-email]

# Tech tracking
tech-stack:
  added: [browser-fs-access@0.38.0, jsdom@28.1.0, vitest.config.js]
  patterns: [signal-based-campaign-state, immutable-signal-updates, debounced-effect-autosave, version-migration-on-load, dynamic-import-for-browser-fs-access]

key-files:
  created: [src/lib/campaign.js, src/lib/campaign.test.js, vitest.config.js]
  modified: [package.json, src/index.html]

key-decisions:
  - "Dynamic import for browser-fs-access in saveCampaignToFile/loadCampaignFromFile to keep module loadable in test and non-browser environments"
  - "Export createEmptyCampaign and migrateCampaign for direct test access and reuse in other modules"
  - "Single loadFromStorage() call cached in _stored variable to avoid double localStorage read on init"

patterns-established:
  - "Campaign signal as single source of truth: one signal holds entire campaign JSON, immutable updates via spread"
  - "Auto-save effect pattern: debounced 500ms setTimeout in effect(), reads campaign.value, writes to localStorage"
  - "Version migration: merge with empty template via spread, reject future versions with null"
  - "File save always shows picker (no cached file handle) per D-17"
  - "TDD with vi.resetModules() for fresh signal state per test"

requirements-completed: [IDEN-01, IDEN-02, IDEN-03, IDEN-04, PERS-01, PERS-02, PERS-03, PERS-04]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 2 Plan 1: Campaign State Module Summary

**Signal-based campaign state with localStorage auto-save, browser-fs-access file persistence, version migration, and 21 passing unit tests via Vitest/jsdom**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T08:26:59Z
- **Completed:** 2026-03-29T08:30:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Campaign state signal with full Phase 2+ JSON schema (identity, brokers, tempEmail, messages, statuses, settings)
- Complete identity CRUD helpers with immutable signal updates (updateIdentity, updateIdentityEmail, addEmail, removeEmail)
- Debounced auto-save to localStorage within 500ms with QuotaExceededError resilience
- File save/load via browser-fs-access with version migration, abort handling, and parse error handling
- Vitest test infrastructure configured with jsdom, Preact preset, and globals
- 21 unit tests covering all campaign module functions including IDEN-04 network-call verification
- browser-fs-access available in both npm (build mode) and CDN import map (dev mode)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install browser-fs-access, create Vitest config, and add CDN import map entry** - `908bf0c` (chore)
2. **Task 2 RED: Failing tests for campaign state module** - `9ada8bd` (test)
3. **Task 2 GREEN: Implement campaign state module** - `86af0df` (feat)

## Files Created/Modified
- `src/lib/campaign.js` - Campaign state signal, CRUD helpers, auto-save effect, file save/load, version migration
- `src/lib/campaign.test.js` - 21 unit tests covering schema, identity helpers, migration, auto-save, file operations, IDEN-04
- `vitest.config.js` - Vitest configuration with jsdom environment, Preact preset, globals enabled
- `package.json` - Added browser-fs-access (production) and jsdom (dev) dependencies
- `src/index.html` - Added browser-fs-access CDN entry to import map with version-pinning comment

## Decisions Made
- Used dynamic `import()` for browser-fs-access inside saveCampaignToFile/loadCampaignFromFile instead of top-level import, keeping the module loadable in test and non-browser environments
- Exported `createEmptyCampaign` and `migrateCampaign` as public API for direct test access and potential reuse by other modules (welcome screen resume flow)
- Cached the `loadFromStorage()` result in a private `_stored` variable to initialize both `campaign` and `hasExistingCampaign` signals from a single read

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Campaign state module ready for Phase 2 Plans 2-4 to build upon
- Identity form (Plan 2) can import and use updateIdentity, updateIdentityEmail, addEmail, removeEmail
- Header save/load buttons (Plan 3) can import saveCampaignToFile, loadCampaignFromFile
- Welcome screen resume flow (Plan 4) can use hasExistingCampaign and campaign signals
- Auto-save indicator (Plan 3 or 4) can use lastAutoSaved signal

## Self-Check: PASSED

- All 3 created files exist on disk
- All 3 task commits found in git log (908bf0c, 9ada8bd, 86af0df)

---
*Phase: 02-identity-input-and-persistence*
*Completed: 2026-03-29*
