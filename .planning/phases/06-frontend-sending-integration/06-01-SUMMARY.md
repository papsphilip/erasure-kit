---
phase: 06-frontend-sending-integration
plan: 01
subsystem: frontend-core
tags: [relay-client, status-tracker, tdd, api-wrapper]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [relay-client-module, failed-status-lifecycle]
  affects: [email-sender, track-page, brokers-page]
tech_stack:
  added: []
  patterns: [fetch-wrapper, immutable-signal-updates, tdd-red-green]
key_files:
  created:
    - src/lib/relay-client.js
    - src/lib/relay-client.test.js
    - src/lib/status-tracker.test.js
  modified:
    - src/lib/status-tracker.js
decisions:
  - "RELAY_URL as exported constant at module top for relay-client consumers"
  - "retryBroker() uses destructuring to strip error field cleanly"
  - "FAILED brokers excluded from sent count but not from progress denominator"
metrics:
  duration: "3min 13s"
  completed: "2026-04-04"
---

# Phase 6 Plan 01: Relay Client and FAILED Status Summary

Relay-client fetch wrapper for Worker API (POST /send, DELETE /address) with full response parsing, plus STATUS.FAILED lifecycle in status-tracker with markBrokerFailed/retryBroker functions and updated aggregate counts.

## Tasks Completed

### Task 1: Create relay-client module with tests (TDD)
**Commit:** 7ad0a23
**Files:** src/lib/relay-client.js, src/lib/relay-client.test.js

Created the relay-client module that wraps fetch() calls to the Worker API:
- `relaySend(payload)` POSTs encrypted email payloads to `${RELAY_URL}/send`
- `relayDeleteAddress(slug)` sends DELETE to `${RELAY_URL}/address?slug=...`
- Handles all Worker response types: 200 success, 400 validation error, 429 rate limited (with Retry-After header parsing, defaults to 60), 502 Resend failure
- Network errors propagate to caller for upstream error handling
- 11 tests covering success, error, rate limit, network failure paths

### Task 2: Add STATUS.FAILED to status-tracker with tests (TDD)
**Commit:** 8cd5404
**Files:** src/lib/status-tracker.js, src/lib/status-tracker.test.js

Extended the status tracker with FAILED lifecycle support:
- `STATUS.FAILED = 'failed'` added to enum, labels (Failed), and colors (red-500)
- `markBrokerFailed(brokerId, errorCode, errorMessage)` sets FAILED with error object `{ code, message }`, preserves sentAt/deadline, adds history entry
- `retryBroker(brokerId)` resets FAILED back to SELECTED, clears error field, adds retry history entry
- `getStatusCounts()` now includes `failed` count; failed brokers excluded from `sent` total
- `getProgressPercent()` automatically excludes failed (only confirmed+rejected count as resolved)
- 10 tests covering enum values, markBrokerFailed, retryBroker, counts, and progress

## Verification

Full test suite: **119 tests passing across 6 test files**, zero regressions.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- both modules are fully functional with all exports wired.

## Self-Check: PASSED

- All 4 files exist (relay-client.js, relay-client.test.js, status-tracker.js, status-tracker.test.js)
- Both commits found (7ad0a23, 8cd5404)
- All exports verified (relaySend, relayDeleteAddress, RELAY_URL, STATUS.FAILED, markBrokerFailed, retryBroker)
