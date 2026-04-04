# Phase 6: Frontend Sending Integration - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the mailto:-based email sending with relay-based "Send All" that dispatches GDPR erasure requests through the Cloudflare Worker at api.erasurekit.uk. Refactor email-sender.js to call the relay API instead of opening mailto: links. Integrate the crypto module for E2E encryption of email bodies. Add real-time send progress UI, error handling with retry, and an "End Campaign" flow. Update the welcome screen to show the temp address and explain the relay workflow.

</domain>

<decisions>
## Implementation Decisions

### Send Flow UX
- **D-01:** Full-screen modal with progress during batch sending. Shows: progress bar, current broker name, sent/failed/remaining counts, abort button. User can't navigate away mid-send.
- **D-02:** Confirmation dialog before sending. Shows broker count, temp sender address, and Send + Cancel buttons. Always required — prevents accidental sends of real emails to real brokers.
- **D-03:** After batch send completes, modal shows completion summary (sent/failed counts), then "View Campaign" button auto-navigates to Track page.

### Error Handling and Retry
- **D-04:** New STATUS.FAILED in the status lifecycle. Failed brokers show red on Track page with the error reason (RATE_LIMITED, RESEND_FAILED, INVALID_PAYLOAD) and a per-broker "Retry" button. Also a "Retry All Failed" button at the top of Track page.
- **D-05:** When Worker returns RATE_LIMITED with retry-after hint, the progress modal pauses and shows "Rate limited — resuming in Xs" with a countdown. Auto-resumes when cooldown expires. No user action needed.

### Key Pair Initialization
- **D-06:** Key pair and temp address generated on campaign creation (when user clicks "Start New Campaign"). Available immediately for display on the welcome screen. Stored in campaign.encryption and campaign.tempEmail fields.
- **D-07:** Welcome screen shows temp address prominently with explanation: "Your requests will be sent from a7k9x3mq@erasurekit.uk — your real email is never shared with brokers."
- **D-08:** Returning users (resume campaign) also see their temp address in the resume section of the welcome screen.

### End Campaign Flow
- **D-09:** "End Campaign" button on the Track page. Visible always as a manual "stop" option.
- **D-10:** End Campaign deletes temp address only (calls DELETE /address on Worker). Campaign data (identity, statuses, history) stays in the local file for records. User can view campaign history but can't send more emails.
- **D-11:** Confirmation dialog before ending: "This will delete your temporary email address. You won't be able to send more requests or receive broker replies. Continue?"

### Demo Mode Integration
- **D-12:** Demo mode simulates the full relay flow with fake encrypted payloads and realistic delays. Progress modal, error handling, rate limit pauses all work identically. No real Worker calls or emails sent. Tests the complete new UI path.

### Claude's Discretion
- Delay between relay sends (currently 1.5s for mailto:, may need adjustment for API calls)
- Progress modal visual design details
- Whether to add STATUS.FAILED to the status tracker colors map

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — v2.0 relay architecture, infrastructure details
- `.planning/REQUIREMENTS.md` — RELAY-04, RELAY-05, STAT-01..05 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 6 success criteria, dependency on Phase 5

### Phase 5 Artifacts (relay infrastructure)
- `.planning/phases/05-relay-infrastructure-and-e2e-encryption/05-CONTEXT.md` — Worker API design decisions (D-01 through D-16), encryption model, temp address lifecycle
- `.planning/phases/05-relay-infrastructure-and-e2e-encryption/05-RESEARCH.md` — Resend API details, rate limits (2 req/sec, 100/day free tier), Web Crypto patterns
- `worker/src/routes/send.js` — POST /send handler: expected payload format, response envelope, error codes
- `worker/src/routes/address.js` — DELETE /address handler for campaign cleanup
- `worker/src/lib/validate.js` — Payload validation rules (what fields are required)

### Frontend Code to Modify
- `src/lib/email-sender.js` — Primary refactoring target: replace mailto: with relay fetch() calls. Has sendToBroker(), batchSend(), getUnsentCount()
- `src/lib/crypto.js` — encryptEmailBody(text, publicKeyJwk) returns { encryptedBody, wrappedKey, iv }
- `src/lib/campaign.js` — Campaign signal, createEmptyCampaign(), schema v3 with encryption field
- `src/lib/status-tracker.js` — STATUS enum, markBrokerSent(), updateBrokerStatus(), getStatusCounts()
- `src/lib/notifications.js` — addNotification() for send success/failure events
- `src/lib/demo-mode.js` — demoMode signal, needs relay simulation
- `src/components/WelcomeScreen.js` — Needs temp address display
- `src/pages/Brokers.js` — Send All button and progress modal
- `src/pages/Track.js` — Failed status display, retry buttons, End Campaign button

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `email-sender.js` — batchSend() already has: sequential send loop, onProgress/onComplete callbacks, AbortSignal support, sleep() helper. Can be refactored in-place to call relay instead of mailto:.
- `crypto.js` — generateCampaignKeyPair(), encryptEmailBody(), decryptEmailBody() all ready to use.
- `status-tracker.js` — markBrokerSent() sets status to AWAITING with calendar-month deadline. STATUS enum needs FAILED added.
- `notifications.js` — addNotification({ type, message, brokerId }) ready for send events.
- `TemplateModal.js` — Centered modal pattern (max-w-3xl, full-screen mobile) can inform progress modal design.
- `campaign.js` — createEmptyCampaign() already has tempEmail: null and encryption: null fields.

### Established Patterns
- Preact Signals for all state (immutable updates via spread)
- Signal effects for auto-save to localStorage
- Demo mode check: `if (demoMode.value) { ... simulate ... }`
- buildMailtoUrl() and MAILTO_LIMIT can be removed after relay replaces mailto:

### Integration Points
- email-sender.js sendToBroker() → needs to call fetch(RELAY_URL + '/send') instead of window.open(mailto:)
- campaign.js createEmptyCampaign() → needs to generate key pair and temp address
- WelcomeScreen.js → needs to display campaign.value.tempEmail when it exists
- Brokers.js → confirmation dialog before batchSend(), progress modal during
- Track.js → failed broker display with retry, End Campaign button with DELETE /address call

</code_context>

<specifics>
## Specific Ideas

- User specifically wants the temp address visible on the home/welcome screen with an explanation of the relay workflow — this is a trust-building UX element
- Returning users must also see their temp address when resuming a campaign
- Demo mode must simulate the full relay path (fake encrypted payloads, realistic delays, progress modal) — not just the old console.log path

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-frontend-sending-integration*
*Context gathered: 2026-04-04*
