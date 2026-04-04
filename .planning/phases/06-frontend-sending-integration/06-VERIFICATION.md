---
phase: 06-frontend-sending-integration
verified: 2026-04-04T20:45:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Enable demo mode (Ctrl+Shift+D), start new campaign, enter identity, select 5-10 brokers, click Send All. Observe full progress modal flow: confirmation dialog with temp address, progress bar advancing, sent/failed/remaining counters, occasional simulated failure, occasional rate-limit pause with countdown, then completion summary."
    expected: "Confirmation dialog shows broker count + temp address. Progress modal blocks navigation. Stats update per-broker. Rate limit pause shows amber countdown that auto-resumes. Completion shows View Campaign button that navigates to Track."
    why_human: "Full-screen modal rendering, animation timing, countdown behavior, and abort interaction require visual inspection in a real browser."
  - test: "After batch send, navigate to Track page. Verify Failed stat card, failed broker rows (red badge, error reason), per-broker Retry button, and Retry All Failed button."
    expected: "Failed stat card shows count. Failed brokers show red badge with error code/message. Retry button resets broker to Selected. Retry All Failed resets all failed brokers."
    why_human: "UI state transitions, color rendering, and button interaction require visual inspection."
  - test: "Click End Campaign on Track page. Verify confirmation dialog text matches D-11, then confirm. Check campaign-ended state hides retry/send controls."
    expected: "Dialog says 'This will delete your temporary email address...' Confirming shows toast. Retry buttons disappear. Campaign ended date shows."
    why_human: "Dialog text, toast notification, and post-end UI state require visual inspection."
  - test: "Start a new campaign on Welcome screen. Verify brief 'Creating campaign...' loading state, then navigation to identity. Return to Welcome via browser and check temp address display."
    expected: "Button shows 'Creating campaign...' briefly (~500ms). After navigation and return, Welcome screen shows temp address like 'a7k9x3mq@erasurekit.uk' with 'Your real email is never shared with brokers' text."
    why_human: "Loading state timing and temp address rendering require visual inspection."
---

# Phase 6: Frontend Sending Integration Verification Report

**Phase Goal:** Users can click "Send All" to dispatch GDPR erasure requests to all selected brokers through the relay, with the existing status tracking and notification systems reflecting real-time send progress
**Verified:** 2026-04-04T20:45:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can click "Send All" on the Brokers page and see a progress indicator as each broker's request is dispatched through the relay | VERIFIED | `src/pages/Brokers.js` lines 214-265: handleSendAllClick opens confirmation dialog, handleConfirmSend calls batchSend with onProgress/onRateLimited/onComplete callbacks. `src/components/SendProgressModal.js` (163 lines): renders three states -- sending (progress bar + sent/failed/remaining stats), rate-limited (countdown timer), complete (summary + View Campaign button). Modal rendered on line 596-604 of Brokers.js. |
| 2 | The email-sender module calls the Worker relay instead of opening mailto: links -- no email client involvement | VERIFIED | `src/lib/email-sender.js` line 4: `import { relaySend } from './relay-client.js'`; line 5: `import { encryptEmailBody } from './crypto.js'`; lines 62-86: real mode encrypts body then calls relaySend with { to, subject, encryptedBody, wrappedKey, iv, tempAddress, publicKey }. No `window.open`, no `mailto:`, no `buildMailtoUrl` -- test 14 confirms MAILTO_LIMIT and buildMailtoUrl are undefined. |
| 3 | Each broker's status updates automatically from "selected" to "awaiting" as the relay confirms each send | VERIFIED | `src/lib/email-sender.js` lines 83-85: on `result.success`, calls `markBrokerSent(broker.id)`. `src/lib/status-tracker.js` lines 112-145: `markBrokerSent` sets status to STATUS.AWAITING with sentAt timestamp and calendar-month deadline via date-fns addMonths. |
| 4 | The Track page dashboard reflects real-time send progress with aggregate stats (sent, awaiting, confirmed, rejected, overdue) | VERIFIED | `src/pages/Track.js` lines 252-259: grid of 6 StatCard components: Sent, Awaiting, Confirmed, Rejected, Overdue, Failed. `src/lib/status-tracker.js` lines 285-331: getStatusCounts returns { total, awaiting, confirmed, rejected, escalated, overdue, failed, sent }. Failed brokers excluded from sent count (line 324-326). |
| 5 | If the relay returns an error for a specific broker, that broker is marked as "failed" with a retry option | VERIFIED | `src/lib/email-sender.js` lines 148-151: on non-success non-rate-limited result, calls `markBrokerFailed(broker.id, result.error.code, result.error.message)`. `src/lib/status-tracker.js` lines 154-181: markBrokerFailed sets STATUS.FAILED with error { code, message }. `src/pages/Track.js` lines 436-448: per-broker "Retry" button visible for failed brokers when campaign not ended, calls retryBroker which resets to SELECTED. Lines 261-272: "Retry All Failed" bulk button. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/relay-client.js` | fetch() wrapper for Worker API (POST /send, DELETE /address) | VERIFIED | 55 lines. Exports: relaySend, relayDeleteAddress, RELAY_URL. POSTs to `${RELAY_URL}/send` with JSON payload, parses Retry-After header on 429. DELETE to `${RELAY_URL}/address?slug=...`. |
| `src/lib/relay-client.test.js` | Unit tests for relay-client module | VERIFIED | 213 lines, 11 tests. Covers success, 400, 429 (with and without Retry-After), 502, Content-Type header, network error, DELETE success, DELETE error, URL construction. |
| `src/lib/status-tracker.js` | Updated status tracker with FAILED status | VERIFIED | 382 lines. STATUS.FAILED = 'failed' (line 19). STATUS_LABELS includes 'Failed' (line 33). STATUS_COLORS has red tokens (line 46). markBrokerFailed (lines 154-181), retryBroker (lines 188-217). getStatusCounts includes failed count (lines 295-326). |
| `src/lib/status-tracker.test.js` | Unit tests for FAILED status, counts, and progress | VERIFIED | 189 lines, 10 tests. Covers STATUS.FAILED enum, labels, colors, markBrokerFailed error details, preserves sentAt/deadline, history entries, getStatusCounts with failed, getProgressPercent excludes failed, retryBroker resets to SELECTED. |
| `src/lib/email-sender.js` | Relay-based email sender with encryption, rate-limit handling, demo simulation | VERIFIED | 208 lines. Exports: sendToBroker, batchSend, getUnsentCount. Imports relaySend, encryptEmailBody. Demo mode: 300-700ms delays, ~1/8 failures, ~1/15 rate limits. Real mode: encrypts body, calls relaySend, marks sent or passes error. batchSend: onProgress, onRateLimited, onComplete callbacks, AbortSignal support, retry on RATE_LIMITED. |
| `src/lib/email-sender.test.js` | Unit tests for relay-based sending | VERIFIED | 343 lines, 16 tests. Uses vi.hoisted() pattern. Covers encrypt+send, payload shape, markBrokerSent, relay success/failure, demo mode success/failure, batchSend progress/rate-limit/failure/abort/summary, getUnsentCount, deprecated removal. |
| `src/lib/campaign.js` | Async startNewCampaign with crypto key generation and temp slug | VERIFIED | 378 lines. Exports: startNewCampaign (async, line 325), endCampaign (async, line 349), generateTempSlug (line 312). startNewCampaign generates RSA key pair via generateCampaignKeyPair, creates 8-char temp slug, sets campaign.value.encryption and tempEmail. endCampaign calls relayDeleteAddress via dynamic import, marks ended. |
| `src/components/SendProgressModal.js` | Full-screen modal for batch send progress | VERIFIED | 163 lines. Exports: SendProgressModal. Three states: sending (progress bar + stats + abort), rate-limited (amber clock icon + countdown + abort), complete (green check + summary + View Campaign). Rate limit countdown uses useEffect + setInterval. |
| `src/components/WelcomeScreen.js` | Updated welcome screen with temp address display | VERIFIED | 146 lines. Async startNewCampaign with loading state (lines 96, 129). Temp address display for returning users (lines 105-111) with "Your requests will be sent from" + "Your real email is never shared with brokers". |
| `src/pages/Brokers.js` | Confirmation dialog and progress modal integration | VERIFIED | 759 lines. Imports SendProgressModal (line 13). Confirmation dialog (lines 567-593) shows broker count + temp address. handleConfirmSend calls batchSend with callbacks. SendProgressModal rendered (lines 596-604). Campaign-ended and no-encryption guards (lines 534-537). |
| `src/pages/Track.js` | Failed status display, retry buttons, End Campaign | VERIFIED | 487 lines. Imports retryBroker, endCampaign, STATUS.FAILED. Failed StatCard (line 258). Retry All Failed button (lines 261-272). Per-broker Retry button (lines 436-448). End Campaign section (lines 318-336) with confirmation dialog (lines 339-362). handleEndCampaign (lines 132-142). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/relay-client.js` | Worker API `/send` | fetch POST with JSON payload | WIRED | Line 21: `fetch(\`${RELAY_URL}/send\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })` |
| `src/lib/relay-client.js` | Worker API `/address` | fetch DELETE with slug query param | WIRED | Line 49: `fetch(\`${RELAY_URL}/address?slug=${slug}\`, { method: 'DELETE' })` |
| `src/lib/email-sender.js` | `src/lib/relay-client.js` | import relaySend | WIRED | Line 4: `import { relaySend } from './relay-client.js'`; used on line 73 |
| `src/lib/email-sender.js` | `src/lib/crypto.js` | import encryptEmailBody | WIRED | Line 5: `import { encryptEmailBody } from './crypto.js'`; used on line 66 |
| `src/lib/email-sender.js` | `src/lib/status-tracker.js` | import markBrokerSent, markBrokerFailed | WIRED | Line 3: both imported; markBrokerSent used on lines 57, 84; markBrokerFailed used on line 150 |
| `src/lib/campaign.js` | `src/lib/crypto.js` | import generateCampaignKeyPair | WIRED | Line 2: `import { generateCampaignKeyPair } from './crypto.js'`; used on line 329 |
| `src/pages/Brokers.js` | `src/components/SendProgressModal.js` | import SendProgressModal | WIRED | Line 13: imported; rendered on line 596-604 |
| `src/pages/Brokers.js` | `src/lib/email-sender.js` | batchSend with callbacks | WIRED | Line 15: `import { batchSend, getUnsentCount }`; called on line 241 with onProgress, onRateLimited, onComplete |
| `src/pages/Track.js` | `src/lib/status-tracker.js` | import retryBroker, STATUS.FAILED | WIRED | Line 15: `retryBroker` imported; used on lines 122, 443 |
| `src/pages/Track.js` | `src/lib/campaign.js` | import endCampaign | WIRED | Line 3: `import { campaign, endCampaign }`; endCampaign called on line 134 |
| `src/components/WelcomeScreen.js` | `src/lib/campaign.js` | await startNewCampaign() | WIRED | Line 4: imports startNewCampaign; lines 96, 129: `await startNewCampaign()` with loading state |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/lib/email-sender.js` | `campaign.value.encryption.publicKeyJwk` | Generated by startNewCampaign via generateCampaignKeyPair | Yes -- RSA-OAEP-256 key pair from Web Crypto API | FLOWING |
| `src/lib/email-sender.js` | `campaign.value.tempEmail` | Generated by startNewCampaign via generateTempSlug | Yes -- 8-char random slug + @erasurekit.uk | FLOWING |
| `src/pages/Track.js` | `counts` | `getStatusCounts()` from status-tracker.js | Yes -- iterates campaign.value.statuses for real counts | FLOWING |
| `src/pages/Track.js` | `progress` | `getProgressPercent()` from status-tracker.js | Yes -- computed from counts (confirmed + rejected) / total | FLOWING |
| `src/components/WelcomeScreen.js` | `campaign.value.tempEmail` | campaign signal from campaign.js | Yes -- populated by startNewCampaign or loaded from localStorage | FLOWING |
| `src/components/SendProgressModal.js` | `progress`, `rateLimitInfo`, `isComplete` | Props from Brokers.js signals fed by batchSend callbacks | Yes -- updated in real-time by onProgress/onRateLimited/onComplete callbacks | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 136 tests pass | `npx vitest run --reporter=verbose` | 7 files, 136 tests passed, 3.46s | PASS |
| Production build succeeds | `npx vite build` | 152.22 KB (42.32 KB gzip), 360ms | PASS |
| buildMailtoUrl removed | grep for buildMailtoUrl in email-sender.js source | Not found (only in test confirming removal) | PASS |
| RELAY_URL points to erasurekit.uk | grep in relay-client.js | `https://api.erasurekit.uk` | PASS |
| STATUS.FAILED in enum | grep in status-tracker.js | `FAILED: 'failed'` on line 19 | PASS |
| Failed stat card in Track | grep in Track.js | `label="Failed" count=\${counts.failed}` on line 258 | PASS |
| End Campaign confirmation text | grep in Track.js | "delete your temporary email address" found on lines 325, 344 | PASS |
| WelcomeScreen async startNewCampaign | grep in WelcomeScreen.js | `await startNewCampaign()` on lines 96, 129 | PASS |
| Temp address explanation text | grep in WelcomeScreen.js | "Your real email is never shared with brokers" on line 109 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RELAY-04 | 06-02, 06-03 | "Send All" button dispatches all selected brokers' erasure requests in automated sequence through the relay | SATISFIED | Brokers.js: Send All button (line 542-543) opens confirmation dialog; handleConfirmSend calls batchSend which sequentially calls sendToBroker for each broker via relay |
| RELAY-05 | 06-01, 06-02 | Frontend email-sender module calls the Worker relay API instead of opening mailto: links | SATISFIED | email-sender.js imports relaySend from relay-client.js, calls it with encrypted payload. No mailto:, no window.open. Test 14 confirms buildMailtoUrl is undefined. |
| STAT-01 | 06-01, 06-03 | Each broker has a tracked status: not selected -> selected -> awaiting response -> confirmed / rejected / escalated / overdue | SATISFIED | status-tracker.js STATUS enum has all values including FAILED. markBrokerSent transitions to AWAITING. markBrokerFailed transitions to FAILED. retryBroker transitions back to SELECTED. Full lifecycle with history tracking. |
| STAT-02 | 06-02 | App calculates "one calendar month" deadline from send date using proper date arithmetic | SATISFIED | status-tracker.js line 116: `addMonths(now, 1)` from date-fns. Already built in Phase 5, preserved and tested. |
| STAT-03 | 06-02 | App flags brokers as overdue when they exceed the calendar-month deadline | SATISFIED | status-tracker.js lines 225-266: checkOverdueBrokers uses date-fns isAfter to detect overdue. Called on Track page load (line 191). Already built in Phase 5, preserved. |
| STAT-04 | 06-01, 06-03 | Dashboard shows aggregate stats: total brokers, selected, sent, awaiting, confirmed, rejected, overdue | SATISFIED | Track.js lines 252-259: 6 StatCard components (Sent, Awaiting, Confirmed, Rejected, Overdue, Failed). getStatusCounts returns all counts including new 'failed' key. |
| STAT-05 | 06-01, 06-03 | Dashboard shows overall campaign progress as a percentage | SATISFIED | Track.js lines 232-249: progress bar with percentage from getProgressPercent. Progress = (confirmed + rejected) / total. Failed brokers excluded from numerator. |

No orphaned requirements found. REQUIREMENTS.md maps RELAY-04, RELAY-05, STAT-01..05 to Phase 6, and all are covered by the plans and verified in the codebase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app.js` | 30-33 | PlaceholderPage component for Legal/Escalation routes | Info | Future phase placeholders (Phase 7/10), not Phase 6 concern |
| `src/components/TemplateDrawer.js` | 47 | Comment "placeholder broker name" | Info | Intentional design for general preview using [Broker Name] -- not a code stub |
| `src/pages/Track.js` | 455 | "Escalation coming in Phase 8" title attribute on Escalate button | Info | Phase 8 placeholder, not Phase 6 concern -- button exists but handler is no-op |

No blockers or warnings found in Phase 6 artifacts. All Phase 6 files are substantive with real implementations -- no stubs, no TODO/FIXME markers, no console.log-only handlers.

### Human Verification Required

### 1. Full Relay Sending Flow in Demo Mode

**Test:** Enable demo mode (Ctrl+Shift+D), start a new campaign, enter identity, select 5-10 brokers. Click "Send All". Observe the full flow: confirmation dialog showing broker count and temp address, progress modal with progress bar advancing, sent/failed/remaining stats updating per broker, occasional simulated failure, occasional rate-limit pause with amber countdown, then completion summary with "View Campaign" button.
**Expected:** Confirmation dialog shows broker count + temp @erasurekit.uk address + "This will send real emails" warning. Progress modal blocks navigation. Stats update per-broker. Rate limit pause shows amber clock icon with countdown that auto-resumes. Completion shows green checkmark + "View Campaign" button that navigates to Track.
**Why human:** Full-screen modal rendering, animation timing (progress bar, countdown), and abort button interaction require visual inspection in a real browser.

### 2. Track Page Failed Brokers and Retry

**Test:** After batch send completes with some failures, verify Track page shows: Failed stat card with correct count, failed broker rows with red background tint and error reason (code + message), per-broker "Retry" button, and "Retry All Failed" button.
**Expected:** Failed stat card shows count in red. Failed brokers show red status badge, error text like "RESEND_FAILED: Simulated delivery failure", and a "Retry" button. Clicking Retry resets broker to "Selected" status. Retry All Failed resets all failed brokers.
**Why human:** UI state transitions, color rendering, and button interaction in the broker list require visual inspection.

### 3. End Campaign Flow

**Test:** On Track page, click "End Campaign". Verify confirmation dialog text matches D-11 ("This will delete your temporary email address. You won't be able to send more requests or receive broker replies. Continue?"). Confirm end. Check campaign-ended state.
**Expected:** Dialog shows correct warning text. Confirming shows success toast notification. Retry buttons disappear. "Campaign ended on [date]" message shows. Send All on Brokers page shows "Campaign Ended".
**Why human:** Dialog text, toast notification timing, and post-end UI state across multiple pages require visual inspection.

### 4. Welcome Screen Temp Address Display

**Test:** Start a new campaign on Welcome screen. Verify brief "Creating campaign..." loading state on button, then navigation to identity page. Navigate back to Welcome and check temp address display for returning users.
**Expected:** Button shows "Creating campaign..." briefly (~500ms during RSA key generation). After navigating away and returning, Welcome screen shows temp address prominently (e.g., "a7k9x3mq@erasurekit.uk") with "Your requests will be sent from" label and "Your real email is never shared with brokers" explanation text.
**Why human:** Loading state timing (~500ms) and temp address rendering with correct styling require visual inspection.

### Gaps Summary

No blocking gaps found. All 5 roadmap success criteria verified against the codebase. All 7 requirement IDs (RELAY-04, RELAY-05, STAT-01 through STAT-05) are satisfied. All 11 artifacts exist, are substantive (not stubs), and are properly wired at all 4 levels (exists, substantive, wired, data flowing). All 136 tests pass. Production build succeeds at 152KB. No anti-pattern blockers detected.

The phase goal -- replacing mailto: with relay-based "Send All" -- is achieved at the code level. The email-sender module encrypts payloads and POSTs to the Worker relay, batch send handles rate limits and failures, campaign creation generates RSA key pairs and temp addresses, the progress modal shows real-time status, the Track page displays failed brokers with retry, and End Campaign cleans up temp addresses.

Four items require human verification: (1) the full send flow UX in demo mode, (2) Track page failed broker display and retry, (3) End Campaign confirmation and post-end state, and (4) Welcome screen temp address display.

---

_Verified: 2026-04-04T20:45:00Z_
_Verifier: Claude (gsd-verifier)_
