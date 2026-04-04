# Phase 6: Frontend Sending Integration - Research

**Researched:** 2026-04-04
**Domain:** Preact Signals state management, fetch()-based API integration, modal UX patterns, E2E encryption workflow, Cloudflare Worker API consumption
**Confidence:** HIGH

## Summary

Phase 6 replaces the existing mailto:-based email sending with relay-based "Send All" that dispatches GDPR erasure requests through the Cloudflare Worker at `api.erasurekit.uk`. The primary refactoring target is `src/lib/email-sender.js`, which currently opens mailto: links -- it must be rewritten to call the Worker's POST /send endpoint with encrypted payloads. The crypto module (`src/lib/crypto.js`) is already complete and ready to use for encryption. Campaign key pair generation and temp address creation must be wired into the campaign creation flow.

The Worker API is fully built (Phase 5) and deployed. The POST /send endpoint expects `{ to, subject, encryptedBody, wrappedKey, iv, tempAddress, publicKey }` and returns `{ success: true, data: { emailId, tempAddress } }` on success or `{ success: false, error: { code, message } }` on failure. The DELETE /address endpoint accepts `?slug=...` for campaign cleanup. Error codes are RATE_LIMITED (429 with Retry-After header), RESEND_FAILED (502), and INVALID_PAYLOAD (400).

The UI work involves: (1) a full-screen progress modal on the Brokers page during batch sending, (2) a confirmation dialog before sending, (3) temp address display on the Welcome screen, (4) STATUS.FAILED addition to the status tracker with retry UI on the Track page, (5) an "End Campaign" button on Track that calls DELETE /address, and (6) complete demo mode simulation of the relay flow.

**Primary recommendation:** Refactor `email-sender.js` to an async relay-based sender with encryption, rate-limit pause handling, and per-broker error tracking. Build the progress modal as a standalone Preact component. Wire key pair generation into `startNewCampaign()`. Add STATUS.FAILED to the status tracker. Keep the delay between sends at 500ms for API calls (down from 1500ms for mailto:) to stay well under Resend's 2 req/sec limit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full-screen modal with progress during batch sending. Shows: progress bar, current broker name, sent/failed/remaining counts, abort button. User can't navigate away mid-send.
- **D-02:** Confirmation dialog before sending. Shows broker count, temp sender address, and Send + Cancel buttons. Always required -- prevents accidental sends of real emails to real brokers.
- **D-03:** After batch send completes, modal shows completion summary (sent/failed counts), then "View Campaign" button auto-navigates to Track page.
- **D-04:** New STATUS.FAILED in the status lifecycle. Failed brokers show red on Track page with the error reason (RATE_LIMITED, RESEND_FAILED, INVALID_PAYLOAD) and a per-broker "Retry" button. Also a "Retry All Failed" button at the top of Track page.
- **D-05:** When Worker returns RATE_LIMITED with retry-after hint, the progress modal pauses and shows "Rate limited -- resuming in Xs" with a countdown. Auto-resumes when cooldown expires. No user action needed.
- **D-06:** Key pair and temp address generated on campaign creation (when user clicks "Start New Campaign"). Available immediately for display on the welcome screen. Stored in campaign.encryption and campaign.tempEmail fields.
- **D-07:** Welcome screen shows temp address prominently with explanation: "Your requests will be sent from a7k9x3mq@erasurekit.uk -- your real email is never shared with brokers."
- **D-08:** Returning users (resume campaign) also see their temp address in the resume section of the welcome screen.
- **D-09:** "End Campaign" button on the Track page. Visible always as a manual "stop" option.
- **D-10:** End Campaign deletes temp address only (calls DELETE /address on Worker). Campaign data (identity, statuses, history) stays in the local file for records. User can view campaign history but can't send more emails.
- **D-11:** Confirmation dialog before ending: "This will delete your temporary email address. You won't be able to send more requests or receive broker replies. Continue?"
- **D-12:** Demo mode simulates the full relay flow with fake encrypted payloads and realistic delays. Progress modal, error handling, rate limit pauses all work identically. No real Worker calls or emails sent. Tests the complete new UI path.

### Claude's Discretion
- Delay between relay sends (currently 1.5s for mailto:, may need adjustment for API calls)
- Progress modal visual design details
- Whether to add STATUS.FAILED to the status tracker colors map

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RELAY-04 | "Send All" button dispatches all selected brokers' erasure requests in automated sequence through the relay | email-sender.js refactor to async fetch(), batchSend() with encryption, progress modal UX |
| RELAY-05 | Frontend email-sender module calls the Worker relay API instead of opening mailto: links | sendToBroker() rewrite: template generation -> encryption -> POST /send -> status update |
| STAT-01 | Each broker has a tracked status: not selected -> selected -> awaiting response -> confirmed / rejected / escalated / overdue | STATUS.FAILED addition, markBrokerFailed() helper, retry flow to re-send and transition back to awaiting |
| STAT-02 | App calculates "one calendar month" deadline from send date using proper date arithmetic | Already built in markBrokerSent() via date-fns addMonths -- no changes needed |
| STAT-03 | App flags brokers as overdue when they exceed the calendar-month deadline | Already built in checkOverdueBrokers() -- no changes needed |
| STAT-04 | Dashboard shows aggregate stats: total brokers, selected, sent, awaiting, confirmed, rejected, overdue | Infrastructure built in v1.0 Phase 5; add "failed" count to getStatusCounts() |
| STAT-05 | Dashboard shows overall campaign progress as a percentage | Infrastructure built in v1.0 Phase 5; consider whether failed brokers count toward progress |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed. Phase 6 is purely frontend refactoring using existing dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Preact | 10.29.0 | UI framework (already installed) | Core framework, no change needed |
| @preact/signals | 1.3.x | Reactive state (already installed) | All state management uses signals |
| HTM | 3.1.1 | JSX alternative (already installed) | Template literals, no build step |
| date-fns | 4.x | Date arithmetic (already installed) | Calendar-month deadline calculation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Crypto API | (browser native) | E2E encryption | Every send operation (already wrapped in crypto.js) |
| Fetch API | (browser native) | Worker API calls | Every send operation, campaign cleanup |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw fetch() to Worker | Axios / ky | Overkill for 2 endpoints. fetch() is native, zero bundle cost. The Worker returns simple JSON. |
| Preact Signals for progress state | useReducer | Signals are already the project pattern. useReducer would be inconsistent. |
| Inline progress modal | Separate route/page | D-01 requires user can't navigate away. Modal overlay is correct pattern. |

**Installation:** No new packages to install.

## Architecture Patterns

### Recommended Project Structure

```
src/
  lib/
    email-sender.js      # MAJOR REFACTOR: mailto: -> relay API calls
    relay-client.js       # NEW: fetch() wrapper for Worker API (POST /send, DELETE /address)
    crypto.js             # UNCHANGED: encryption/decryption already complete
    campaign.js           # MODIFIED: startNewCampaign() generates key pair + temp address
    status-tracker.js     # MODIFIED: add STATUS.FAILED, markBrokerFailed(), update getStatusCounts()
    notifications.js      # UNCHANGED: ready for send events
    demo-mode.js          # UNCHANGED: demoMode signal
    template-engine.js    # UNCHANGED: template generation
  components/
    SendProgressModal.js  # NEW: full-screen progress modal (D-01, D-03, D-05)
    EndCampaignDialog.js  # NEW: confirmation dialog for ending campaign (D-11)
    WelcomeScreen.js      # MODIFIED: temp address display (D-07, D-08)
  pages/
    Brokers.js            # MODIFIED: confirmation dialog uses temp address (D-02), progress modal integration
    Track.js              # MODIFIED: failed status display, retry buttons (D-04), End Campaign button (D-09, D-10)
```

### Pattern 1: Relay Client Module

**What:** A thin fetch() wrapper that handles the Worker API contract, including CORS, JSON parsing, and error code extraction.

**When to use:** Every interaction with the Worker API (send email, delete address).

**Example:**
```javascript
// src/lib/relay-client.js
const RELAY_URL = 'https://api.erasurekit.uk';

/**
 * Send an encrypted email via the relay Worker.
 * @param {{ to, subject, encryptedBody, wrappedKey, iv, tempAddress, publicKey }} payload
 * @returns {Promise<{ success: true, data: { emailId, tempAddress } } | { success: false, error: { code, message }, retryAfter?: number }>}
 */
export async function relaySend(payload) {
  const response = await fetch(`${RELAY_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok && response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
    return { ...result, retryAfter };
  }

  return result;
}

/**
 * Delete a temp address via the relay Worker.
 * @param {string} slug - 8-char temp address slug
 * @returns {Promise<{ success: boolean }>}
 */
export async function relayDeleteAddress(slug) {
  const response = await fetch(`${RELAY_URL}/address?slug=${slug}`, {
    method: 'DELETE',
  });
  return response.json();
}
```

### Pattern 2: Async Send-to-Broker with Encryption

**What:** The new sendToBroker() function generates the email template, encrypts the body, and posts to the Worker relay. Returns structured result for progress tracking.

**When to use:** Every individual broker send (called by batchSend loop).

**Example:**
```javascript
// Updated email-sender.js sendToBroker()
export async function sendToBroker(broker, options = {}) {
  const identity = options.identity || campaign.value.identity;
  const customTemplates = options.customTemplates || campaign.value.brokers.templates || {};
  const { subject, body } = getTemplateForBroker(identity, broker, customTemplates);

  // Demo mode: simulate relay with fake delay
  if (demoMode.value) {
    await sleep(300 + Math.random() * 400);
    // Simulate occasional failure for testing (1 in 8)
    if (Math.random() < 0.125) {
      return { success: false, error: { code: 'RESEND_FAILED', message: 'Simulated failure' } };
    }
    markBrokerSent(broker.id);
    return { success: true, method: 'demo' };
  }

  // Encrypt email body
  const publicKeyJwk = campaign.value.encryption.publicKeyJwk;
  const encrypted = await encryptEmailBody(body, publicKeyJwk);

  // Send via relay
  const result = await relaySend({
    to: broker.email,
    subject,
    encryptedBody: encrypted.encryptedBody,
    wrappedKey: encrypted.wrappedKey,
    iv: encrypted.iv,
    tempAddress: campaign.value.tempEmail.split('@')[0],
    publicKey: publicKeyJwk,
  });

  if (result.success) {
    markBrokerSent(broker.id);
  }

  return result;
}
```

### Pattern 3: Rate-Limit Pause in Batch Loop

**What:** When the Worker returns RATE_LIMITED with a retry-after value, the batch loop pauses with a visible countdown, then auto-retries the same broker.

**When to use:** During batchSend() when a 429 response is received.

**Example:**
```javascript
// Inside batchSend() loop
const result = await sendToBroker(broker);

if (!result.success && result.error?.code === 'RATE_LIMITED') {
  const retryAfter = result.retryAfter || 60;
  // Update progress modal to show rate limit countdown
  if (onRateLimited) {
    onRateLimited({ seconds: retryAfter, broker });
  }
  // Wait for the cooldown period
  await sleep(retryAfter * 1000, abortSignal);
  // Retry the same broker (decrement i to re-process)
  i--;
  continue;
}
```

### Pattern 4: Campaign Initialization with Crypto

**What:** When user clicks "Start New Campaign", generate key pair and temp address synchronously before anything else.

**When to use:** Campaign creation only (once per campaign lifecycle).

**Example:**
```javascript
// Modified startNewCampaign() in campaign.js
export async function startNewCampaign() {
  localStorage.removeItem(STORAGE_KEY);

  // Generate key pair and temp address (D-06)
  const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
  const tempSlug = generateTempSlug();
  const tempEmail = `${tempSlug}@erasurekit.uk`;

  const empty = createEmptyCampaign();
  campaign.value = {
    ...empty,
    tempEmail,
    encryption: { publicKeyJwk, privateKeyJwk },
  };
  hasExistingCampaign.value = false;
}
```

### Pattern 5: Campaign-Ended State Flag

**What:** After calling DELETE /address, set a `campaignEnded` flag in the campaign data. This prevents further sends while preserving campaign history.

**When to use:** End Campaign flow (D-10).

**Example:**
```javascript
// campaign.js helper
export async function endCampaign() {
  const slug = campaign.value.tempEmail?.split('@')[0];
  if (slug) {
    await relayDeleteAddress(slug);
  }
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    settings: { ...campaign.value.settings, ended: true, endedAt: new Date().toISOString() },
    tempEmail: null, // Clear temp email since address is deleted
  };
}
```

### Anti-Patterns to Avoid

- **Calling fetch() without CORS awareness:** The Worker has `Access-Control-Allow-Origin: *` but only allows POST, DELETE, and OPTIONS methods. Do not attempt PUT or PATCH.
- **Storing the encryption private key anywhere besides the campaign file:** The private key lives in `campaign.value.encryption.privateKeyJwk` and is persisted via localStorage auto-save and file save. Never send it to the Worker.
- **Retrying indefinitely on RESEND_FAILED:** A 502 error means Resend could not deliver the email (possibly invalid domain). Mark as FAILED and let the user decide whether to retry. Do not auto-retry RESEND_FAILED.
- **Auto-retrying INVALID_PAYLOAD:** This means the request was malformed. Retrying the exact same payload will fail again. Mark as FAILED with the error message.
- **Blocking UI during key generation:** RSA key generation takes 200-800ms. Since D-06 puts it in campaign creation, it runs once and the slight pause is acceptable with a loading indicator on the "Start New Campaign" button.
- **Using synchronous startNewCampaign():** Must become async since it now calls generateCampaignKeyPair(). All callers (WelcomeScreen, campaign.js) must await it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Encryption | Custom crypto | `src/lib/crypto.js` (already built) | Uses Web Crypto API correctly, handles base64 encoding, tested |
| Template generation | Per-broker formatting | `src/lib/template-engine.js` (already built) | Handles GDPR/UK-GDPR/CCPA variants, custom templates |
| Date arithmetic for deadlines | Manual month calculation | date-fns `addMonths()` (already used) | Handles edge cases like Jan 31 + 1 month = Feb 28 |
| Status lifecycle | Custom state machine | `src/lib/status-tracker.js` (extend existing) | Just add FAILED status + colors, existing helpers handle the rest |
| Notification toasts | Custom toast system | `src/lib/notifications.js` (already built) | Has auto-dismiss, bell history, type-based colors |
| File persistence | Custom localStorage/file logic | `campaign.js` auto-save + browser-fs-access (already built) | Signal effect handles localStorage, file save/load is complete |

**Key insight:** Phase 6 is an integration phase, not a greenfield phase. Nearly all the building blocks exist. The work is: (1) rewiring email-sender.js to use relay instead of mailto:, (2) building the progress modal UI, (3) adding STATUS.FAILED handling, (4) wiring campaign creation to crypto, and (5) adding the End Campaign flow.

## Common Pitfalls

### Pitfall 1: startNewCampaign() Becomes Async

**What goes wrong:** `startNewCampaign()` is currently synchronous. Adding `generateCampaignKeyPair()` makes it async. All callers break if they don't await it.
**Why it happens:** WelcomeScreen calls `startNewCampaign(); navigateTo('identity');` in a single expression. If startNewCampaign becomes async, navigation happens before keys are generated.
**How to avoid:** Make startNewCampaign async and update all callers to await it. In WelcomeScreen, the "Start New" button handler becomes an async function. Show a brief loading state on the button during key generation (~500ms).
**Warning signs:** `campaign.value.encryption` is null after starting a new campaign.

### Pitfall 2: Sending Before Encryption Keys Exist

**What goes wrong:** User clicks "Send All" but campaign has no encryption keys (old campaign from v1 loaded via file).
**Why it happens:** Campaigns saved before Phase 6 have `encryption: null`. If loaded via file, the migration fills missing fields but does not generate crypto keys.
**How to avoid:** Before sending, check `campaign.value.encryption !== null`. If null, show a warning: "This campaign needs to be upgraded for relay sending. Please start a new campaign." Alternatively, offer an "Upgrade Campaign" action that generates keys and temp address for an existing campaign.
**Warning signs:** `encryptEmailBody()` throws when called with null publicKeyJwk.

### Pitfall 3: Retry-After Header Parsing

**What goes wrong:** The Worker's Retry-After header is a string. Parsing it as integer gives NaN if the header is missing or malformed.
**Why it happens:** Cloudflare passes through Resend's Retry-After. The format could vary (seconds or HTTP-date).
**How to avoid:** Use `parseInt(retryAfter) || 60` to fall back to 60 seconds. The Worker already normalizes to seconds strings, but defensive parsing is cheap.
**Warning signs:** Rate limit countdown shows "NaN seconds remaining".

### Pitfall 4: Demo Mode Must Simulate Failures

**What goes wrong:** Demo mode always succeeds, so the user never sees the failure/retry UI path during testing.
**Why it happens:** Current demo mode does `console.log` and immediately marks as sent. D-12 requires full relay simulation including occasional errors.
**How to avoid:** Demo mode should simulate: (a) realistic 300-700ms delays per send, (b) ~1 in 8 random RESEND_FAILED errors, (c) ~1 in 15 rate limit pauses with 3-5 second countdowns. This exercises the full progress modal UI.
**Warning signs:** Demo mode completes instantly with no progress visible.

### Pitfall 5: End Campaign Requires Network

**What goes wrong:** User clicks "End Campaign" while offline. The DELETE /address request fails silently, and the temp address persists in KV.
**Why it happens:** The Worker call requires network access. Cloudflare KV does not have offline support.
**How to avoid:** If the DELETE call fails (network error or non-200), show a toast: "Could not delete temp address. It will expire automatically after 90 days." Still mark the campaign as ended locally -- the KV TTL is the safety net (D-08).
**Warning signs:** Campaign shows "ended" but temp address still receives replies.

### Pitfall 6: Send Progress Modal Prevents Navigation but Not Browser Close

**What goes wrong:** User closes the browser tab mid-send. Some brokers are marked awaiting, others are still unsent.
**Why it happens:** The modal prevents in-app navigation but cannot prevent browser close/refresh.
**How to avoid:** This is acceptable behavior. Campaign state is auto-saved to localStorage after each status update (signal effect). On next app load, the user sees which brokers were sent and can "Send Remaining" for the rest. No special handling needed -- the existing auto-save mechanism covers this.
**Warning signs:** None -- this is a non-issue thanks to existing persistence.

### Pitfall 7: publicKey Field in Worker Payload

**What goes wrong:** The Worker's validate.js does NOT validate the `publicKey` field. The Worker uses it to store in KV alongside the temp address. If publicKey is missing, the KV entry has no key for future reply decryption (Phase 7).
**Why it happens:** The current validate.js checks for `to`, `subject`, `encryptedBody`, `wrappedKey`, `iv`, `tempAddress` but not `publicKey`. The handleSend function reads `body.publicKey` without validation.
**How to avoid:** Always include `publicKey: campaign.value.encryption.publicKeyJwk` in every relay send payload. The publicKey is the same for every send in a campaign, but the Worker stores it on each call (idempotent -- just overwrites the same KV entry). No Worker-side fix needed; just ensure the frontend always includes it.
**Warning signs:** KV entry for temp address has `publicKey: undefined`.

## Code Examples

Verified patterns from the existing codebase:

### Worker POST /send Payload Format

```javascript
// What the Worker expects (from worker/src/lib/validate.js)
const payload = {
  to: 'privacy@broker.com',                    // required: string with @
  subject: 'Data Erasure Request - GDPR...',    // required: non-empty string
  encryptedBody: 'base64-encoded-ciphertext',   // required: non-empty string
  wrappedKey: 'base64-encoded-wrapped-key',     // required: non-empty string
  iv: 'base64-encoded-iv',                      // required: non-empty string
  tempAddress: 'a7k9x3mq',                     // required: 8 lowercase alphanumeric chars
  publicKey: { /* JWK object */ },              // used by Worker but not validated
};

// Worker success response
{ success: true, data: { emailId: 'abc-123', tempAddress: 'a7k9x3mq@erasurekit.uk' } }

// Worker error responses
{ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }    // 429
{ success: false, error: { code: 'RESEND_FAILED', message: 'Email delivery failed' } } // 502
{ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Invalid field...' } }   // 400
```

### Worker DELETE /address Format

```javascript
// DELETE https://api.erasurekit.uk/address?slug=a7k9x3mq

// Success response
{ success: true, data: { deleted: 'a7k9x3mq' } }

// Error response (invalid slug)
{ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Slug must be 8 alphanumeric characters' } }
```

### Encryption Flow (from crypto.js)

```javascript
// Already implemented in src/lib/crypto.js
import { encryptEmailBody } from './crypto.js';

const encrypted = await encryptEmailBody(
  'Dear Data Protection Officer...',  // plaintext body
  campaign.value.encryption.publicKeyJwk  // campaign public key
);
// Returns: { encryptedBody: 'base64...', wrappedKey: 'base64...', iv: 'base64...' }
```

### Temp Address Slug Generation (from Phase 5 research)

```javascript
// 8 random alphanumeric chars via crypto.getRandomValues
function generateTempSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}
```

### Existing Batch Send Pattern (to refactor)

```javascript
// Current batchSend() structure in email-sender.js -- keep this loop pattern
// but replace sendToBroker() internals and add rate-limit handling
for (let i = 0; i < toSend.length; i++) {
  if (abortSignal && abortSignal.aborted) break;

  const result = await sendToBroker(broker);

  // NEW: Handle rate limit pause
  if (!result.success && result.error?.code === 'RATE_LIMITED') {
    // pause with countdown, then retry same broker
  }

  // NEW: Handle failure
  if (!result.success && result.error?.code !== 'RATE_LIMITED') {
    markBrokerFailed(broker.id, result.error.code, result.error.message);
    failed++;
  }

  if (result.success) sent++;

  if (onProgress) onProgress({ current: i + 1, total, broker, sent, failed });

  // Delay between sends (adjustable -- 500ms for API calls)
  if (i < toSend.length - 1) await sleep(delayMs, abortSignal);
}
```

### Signal-Based Immutable Update Pattern (established)

```javascript
// All campaign updates follow this pattern (from campaign.js)
campaign.value = {
  ...campaign.value,
  updatedAt: new Date().toISOString(),
  statuses: {
    ...campaign.value.statuses,
    [brokerId]: { ...existing, status: STATUS.FAILED, error: { code, message } },
  },
};
```

### Modal Pattern (from TemplateModal.js)

```javascript
// Established modal pattern: backdrop click to dismiss, ESC key, z-50
html`
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onClick=${(e) => { if (e.target === e.currentTarget) handleClose(); }}>
    <div class="bg-[var(--ek-surface-alt)] rounded-xl shadow-2xl border border-[var(--ek-border)] ...">
      <!-- content -->
    </div>
  </div>
`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| mailto: links for sending | fetch() to Worker relay | Phase 6 (now) | Automated sending, no email client needed, temp address protection |
| window.open(mailto:, '_self') | encrypted POST to Worker API | Phase 6 (now) | E2E encrypted body, Worker never sees PII |
| Synchronous sendToBroker() | Async sendToBroker() with encryption | Phase 6 (now) | Requires await in all callers, enables progress tracking |
| No temp address display | Temp address on Welcome screen | Phase 6 (now) | Trust-building UX, user sees their anonymous address |
| No campaign end mechanism | End Campaign button + DELETE /address | Phase 6 (now) | User-controlled cleanup of temp email |

**Deprecated after this phase:**
- `buildMailtoUrl()` -- no longer needed (relay replaces mailto:)
- `MAILTO_LIMIT` constant -- no longer relevant
- `window.open(mailtoUrl, '_self')` -- replaced by fetch()
- `copyToClipboard` fallback for long mailto: URLs -- relay has no URL length limit

## Open Questions

1. **Should migrated v1 campaigns get automatic key generation?**
   - What we know: Old campaigns have `encryption: null`. D-06 only generates on "Start New Campaign".
   - What's unclear: Whether loading an old campaign file should auto-generate keys.
   - Recommendation: Do NOT auto-generate. Show a message in the Brokers page: "This campaign was created before relay sending was available. Start a new campaign to use automated sending." The old mailto: send path can remain as a fallback for legacy campaigns, or we can completely remove it and require new campaigns.

2. **Should failed brokers count toward progress percentage?**
   - What we know: `getProgressPercent()` currently counts `(confirmed + rejected) / total`. Failed is a new status.
   - What's unclear: Whether a failed send means "not resolved" (like awaiting) or "partially resolved."
   - Recommendation: Failed brokers should NOT count toward progress. They need retry or manual resolution. Failed is a transient state, not a resolution.

3. **Delay between API sends: 500ms or keep 1500ms?**
   - What we know: Resend rate limit is 2 req/sec. Worker rate limit is 10 req/60s. 500ms between sends = 2 req/sec (exactly at Resend limit). 1500ms is very conservative.
   - What's unclear: Whether Resend measures per-second strictly or uses a sliding window.
   - Recommendation: Use 500ms (RELAY_SEND_DELAY_MS constant). The Worker's rate limiter and the retry-after handling provide safety nets. If we hit Resend's limit, the Worker returns RATE_LIMITED and the frontend auto-pauses. 500ms feels responsive without being aggressive. Leave as a configurable constant so it can be tuned.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Cloudflare Worker (api.erasurekit.uk) | All relay sends | Assumed deployed (Phase 5) | -- | Must verify deployment before Phase 6 execution |
| Web Crypto API | Encryption | Yes (all modern browsers) | -- | -- |
| Fetch API | Worker communication | Yes (all modern browsers) | -- | -- |
| localStorage | Auto-save | Yes (all browsers) | -- | -- |

**Missing dependencies with no fallback:**
- The Cloudflare Worker must be deployed and accessible at `api.erasurekit.uk` before any real sends work. Phase 5 built the code; deployment status needs verification.

**Missing dependencies with fallback:**
- None. All browser APIs are universally available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.js` (exists at project root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && cd worker && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RELAY-04 | batchSend() dispatches all brokers sequentially through relay | unit | `npx vitest run src/lib/email-sender.test.js -t "batch send"` | Wave 0 |
| RELAY-05 | sendToBroker() calls relay API with encrypted payload instead of mailto: | unit | `npx vitest run src/lib/email-sender.test.js -t "relay send"` | Wave 0 |
| STAT-01 | STATUS.FAILED added, markBrokerFailed() works, retry transitions back to awaiting | unit | `npx vitest run src/lib/status-tracker.test.js -t "failed"` | Wave 0 |
| STAT-02 | Calendar-month deadline calculation | unit | Already passing (existing tests) | Existing |
| STAT-03 | Overdue detection | unit | Already passing (existing tests) | Existing |
| STAT-04 | getStatusCounts() includes failed count | unit | `npx vitest run src/lib/status-tracker.test.js -t "counts"` | Wave 0 |
| STAT-05 | getProgressPercent() excludes failed from resolution count | unit | `npx vitest run src/lib/status-tracker.test.js -t "progress"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (frontend tests only)
- **Per wave merge:** `npx vitest run && cd worker && npx vitest run` (both suites)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/email-sender.test.js` -- covers RELAY-04, RELAY-05 (sendToBroker with mocked fetch, batchSend with abort, rate-limit pause)
- [ ] `src/lib/status-tracker.test.js` -- covers STAT-01, STAT-04, STAT-05 (STATUS.FAILED, getStatusCounts with failed, progress excludes failed)
- [ ] `src/lib/relay-client.test.js` -- covers relay-client module (relaySend success/error, relayDeleteAddress, Retry-After parsing)
- [ ] Test mocking strategy: global fetch mock for relay calls, crypto mock for deterministic encryption output

## Project Constraints (from CLAUDE.md)

- **GSD workflow enforcement:** All work through GSD commands.
- **Security/PII:** Never commit API keys. RELAY_URL is a public endpoint, not a secret. Private encryption keys stay in browser only.
- **Dynamic over hardcoded:** RELAY_URL, RELAY_SEND_DELAY_MS, demo mode failure rates, rate limit default seconds -- all must be configurable constants at module top, not inline strings.
- **Preact + HTM + Signals:** This is the established stack. No React, no JSX, no build-step-required patterns.
- **CSS variables for theming:** All colors use `var(--ek-*)` CSS custom properties. New UI elements (progress modal, failed status) must use the same tokens.
- **Immutable signal updates:** Always spread `campaign.value` when updating. Never mutate in place.
- **No framer-motion or animation libraries:** Use CSS transitions (150-200ms ease-out) per the project's convention.

## Sources

### Primary (HIGH confidence)
- **Worker source code** (worker/src/) -- Exact API contract, payload validation rules, error code mapping, CORS config
- **Frontend source code** (src/lib/) -- Existing sendToBroker/batchSend patterns, campaign schema, status tracker, crypto module
- **Phase 5 CONTEXT.md** -- D-01 through D-16 decisions (Worker API design, encryption model, temp address lifecycle)
- **Phase 6 CONTEXT.md** -- D-01 through D-12 decisions (send flow UX, error handling, key pair init, End Campaign, demo mode)

### Secondary (MEDIUM confidence)
- **Phase 5 RESEARCH.md** -- Resend rate limits (2 req/sec, 100/day free tier), KV limits, Web Crypto patterns
- **MDN Web Crypto API** -- SubtleCrypto methods used in crypto.js (verified by reading the actual module)

### Tertiary (LOW confidence)
- None -- all findings are based on reading the actual deployed codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries. All patterns already established in the codebase.
- Architecture: HIGH -- Based on reading every file that will be modified. Worker API contract is clear from source code.
- Pitfalls: HIGH -- Identified from concrete code analysis (async migration, null encryption check, rate limit parsing, demo simulation).

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- no external API changes expected)
