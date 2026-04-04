---
phase: 06-frontend-sending-integration
plan: 02
subsystem: email-sending
tags: [relay, encryption, rsa-oaep, aes-gcm, preact-signals, vitest, e2e-encryption]

# Dependency graph
requires:
  - phase: 06-frontend-sending-integration/plan-01
    provides: relay-client.js (relaySend, relayDeleteAddress), STATUS.FAILED in status-tracker
  - phase: 05-relay-infrastructure-and-e2e-encryption/plan-02
    provides: crypto.js (generateCampaignKeyPair, encryptEmailBody), campaign schema v3
provides:
  - Relay-based email-sender (sendToBroker encrypts + POSTs via relay instead of mailto:)
  - Batch send with RATE_LIMITED pause/retry and FAILED status marking
  - Async startNewCampaign with RSA key pair generation and temp address creation
  - endCampaign with temp address deletion and campaign close
  - generateTempSlug for secure random address generation
  - Demo mode simulating full relay flow with realistic failures
affects: [06-03-send-ui-progress-track-page, 07-reply-monitoring, 08-batching]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() pattern for vitest mock variables accessible in vi.mock() factories"
    - "Deterministic Math.random override for testing probabilistic demo mode behavior"

key-files:
  created:
    - src/lib/email-sender.test.js
  modified:
    - src/lib/email-sender.js
    - src/lib/campaign.js
    - src/lib/campaign.test.js

key-decisions:
  - "500ms delay between relay sends (down from 1500ms for mailto:) since API calls are faster than email client launches"
  - "Demo failure rate ~1/8 and rate limit rate ~1/15 for realistic simulation without overwhelming the user"
  - "endCampaign uses dynamic import for relay-client to keep campaign.js fetch-free at module level"

patterns-established:
  - "vi.hoisted() for mock variables: Required when vi.mock() factory references module-level const variables"
  - "Relay error passthrough: sendToBroker returns error objects (not throws) so callers can distinguish RATE_LIMITED vs RESEND_FAILED"

requirements-completed: [RELAY-04, RELAY-05, STAT-02, STAT-03]

# Metrics
duration: 8min
completed: 2026-04-04
---

# Phase 6 Plan 02: Email Sender Relay Integration Summary

**Relay-based email-sender replacing mailto: with encrypted API calls, async campaign creation with RSA key pair, and demo mode simulating full relay flow**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-04T07:42:34Z
- **Completed:** 2026-04-04T07:50:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced mailto:-based sending with encrypted relay API calls (relaySend + encryptEmailBody)
- Added rate-limit handling (RATE_LIMITED pause with countdown and auto-retry) and failure tracking (markBrokerFailed)
- Made startNewCampaign async with RSA key pair generation and 8-char temp address slug
- Added endCampaign for temp address cleanup and campaign close
- Demo mode now simulates full relay flow: 300-700ms delays, ~1/8 failures, ~1/15 rate limits
- Removed deprecated buildMailtoUrl() and MAILTO_LIMIT
- 17 new tests (16 email-sender + 1 campaign) all passing, 136 total tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor email-sender.js to relay-based sending with tests** - `135b6f5` (feat)
2. **Task 2: Make startNewCampaign async with crypto initialization** - `0c0c2ba` (feat)

## Files Created/Modified
- `src/lib/email-sender.js` - Rewritten: relay-based sending with encryption, rate-limit handling, demo simulation
- `src/lib/email-sender.test.js` - New: 16 tests covering relay, demo, batch, and deprecation scenarios
- `src/lib/campaign.js` - Added: async startNewCampaign, generateTempSlug, endCampaign, crypto/demoMode imports
- `src/lib/campaign.test.js` - Updated: mocks for crypto.js/demo-mode.js, async startNewCampaign test, key generation test

## Decisions Made
- Used 500ms inter-send delay (reduced from 1500ms for mailto:) because API calls don't need email client launch time
- endCampaign uses dynamic `import('./relay-client.js')` to keep campaign.js source free of direct `fetch()` calls, preserving the IDEN-04 compliance test
- Demo failure and rate-limit simulation rates chosen for realistic but not excessive testing experience

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vi.mock pattern for test module isolation**
- **Found during:** Task 1 (email-sender test creation)
- **Issue:** Using `vi.resetModules()` + dynamic re-import caused mock state leakage between tests; then using module-level `const` in `vi.mock()` factory caused "Cannot access before initialization" due to hoisting
- **Fix:** Adopted `vi.hoisted()` pattern to create mock variables accessible from hoisted `vi.mock()` factories, with `vi.clearAllMocks()` in beforeEach
- **Files modified:** src/lib/email-sender.test.js
- **Verification:** All 16 tests pass with clean isolation between test cases
- **Committed in:** 135b6f5 (Task 1 commit)

**2. [Rule 1 - Bug] Updated campaign.test.js for async startNewCampaign**
- **Found during:** Task 2 (campaign.js modification)
- **Issue:** Existing startNewCampaign test called the function synchronously, but it's now async. Also needed mocks for crypto.js and demo-mode.js imports.
- **Fix:** Made test async, added await, added crypto.js and demo-mode.js mocks, added test for key generation
- **Files modified:** src/lib/campaign.test.js
- **Verification:** All 136 tests pass including updated campaign test
- **Committed in:** 0c0c2ba (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for test correctness. No scope creep.

## Known Stubs

- **WelcomeScreen.js line 88:** `startNewCampaign()` called synchronously -- must be updated to `await startNewCampaign()` in Plan 03 (documented in plan as "CRITICAL: callers MUST await")
- This is intentional: Plan 03 owns the UI caller updates

## Issues Encountered
None beyond the deviation fixes documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- email-sender.js is fully relay-based and ready for UI integration (Plan 03)
- campaign.js generates keys and temp address on creation, ready for WelcomeScreen display (Plan 03)
- endCampaign() is ready for Track page "End Campaign" button (Plan 03)
- **Caller update needed:** WelcomeScreen.js must await startNewCampaign() -- Plan 03 will handle this

## Self-Check: PASSED

All files exist and all commit hashes verified in git log.

---
*Phase: 06-frontend-sending-integration*
*Completed: 2026-04-04*
