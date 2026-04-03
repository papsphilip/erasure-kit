# Phase 5: Relay Infrastructure and E2E Encryption - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy a Cloudflare Worker at api.erasurekit.uk that accepts encrypted email payloads from the browser and sends GDPR erasure request emails via Resend API from temporary @erasurekit.uk addresses. E2E encryption is baked in from day 1 so the Worker never sees plaintext email body content. This is backend-only — no frontend changes (Phase 6 handles UI integration).

</domain>

<decisions>
## Implementation Decisions

### Worker API Design
- **D-01:** Single POST /send endpoint. Additional endpoints (health, quota, replies) added in later phases as needed.
- **D-02:** CORS policy: Access-Control-Allow-Origin: * — required for file://, localhost, and portable HTML use cases.
- **D-03:** Structured JSON responses: always return `{ success: bool, error?: { code: string, message: string }, data?: {...} }`. Error codes include RATE_LIMITED, RESEND_FAILED, INVALID_PAYLOAD, etc.
- **D-04:** Worker also exposes DELETE /address endpoint for campaign cleanup (temp address deletion from KV).

### Temp Address Lifecycle
- **D-05:** Browser generates the temp address slug — 8 random alphanumeric chars via crypto.getRandomValues (e.g. a7k9x3mq@erasurekit.uk). No server round-trip to claim an address.
- **D-06:** Temp address stored in campaign JSON file (campaign.tempEmail field). Worker KV maps address → public encryption key for reply routing.
- **D-07:** User-controlled deletion: temp address is deleted when user clicks "End Campaign" or when all brokers are resolved. Phase 5 provides the DELETE /address Worker endpoint; Phase 6 adds the frontend button.
- **D-08:** Safety-net TTL on KV entries for abandoned campaigns (e.g. 90 days). Prevents KV bloat from campaigns that are never explicitly ended.
- **D-09:** Multiple campaigns allowed per IP — no restriction. Households and shared networks may have multiple users.

### E2E Encryption Model
- **D-10:** Encrypt email body only. Worker sees in plaintext: recipient email, subject line, sender temp address (all needed to call Resend API). Worker CANNOT see: email body (contains user identity info, legal text).
- **D-11:** Browser generates a key pair per campaign via Web Crypto API. Private key exported (JWK) and stored in the campaign JSON file for portability. Public key sent to Worker and stored in KV alongside the temp address.
- **D-12:** Hybrid encryption pattern: asymmetric key wraps a random symmetric session key, symmetric key encrypts the body. Specific algorithm at Claude's discretion (likely RSA-OAEP 2048-bit + AES-256-GCM).

### Claude's Discretion
- Auth model: Claude decides (recommended: open + IP rate limiting via Cloudflare, simplest for no-account portable app)
- Encryption algorithm: Claude picks best fit for browser compatibility, key size, and simplicity (likely RSA-OAEP + AES-GCM)

### Resend Integration
- **D-13:** Resend API key stored as Cloudflare Worker environment variable (wrangler secret). Never exposed to browser.
- **D-14:** Reply-To header set to the same temp address from day 1 (From: a7k9x3mq@erasurekit.uk, Reply-To: a7k9x3mq@erasurekit.uk). Ensures broker replies route correctly when Phase 7 adds Email Routing.
- **D-15:** Worker handles Resend failures by returning immediate structured errors (RATE_LIMITED with retry-after hint, or RESEND_FAILED with details). Frontend is responsible for retry logic. Worker stays stateless.
- **D-16:** Worker deployed globally (Cloudflare default routing). Resend configured in eu-west-1 region for GDPR data residency. Worker is just a proxy — actual email processing stays in EU.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` — v2.0 relay architecture, infrastructure details (erasurekit.uk domain, Resend free tier limits, Cloudflare KV/Workers)
- `.planning/REQUIREMENTS.md` — RELAY-01, RELAY-02, RELAY-03, E2EE-01, E2EE-02 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 5 success criteria, dependency chain

### Existing Codebase (carries forward from v1.0)
- `src/lib/email-sender.js` — Current mailto-based sender; Phase 6 will refactor to call relay. Phase 5 doesn't modify this file.
- `src/lib/campaign.js` — Campaign signal schema: has `tempEmail`, `messages`, `settings` fields ready for relay data
- `src/lib/status-tracker.js` — Status lifecycle and deadline calculation. Phase 5 doesn't modify.
- `package.json` — Current dependencies (Preact, HTM, Signals, date-fns, browser-fs-access)

### External Documentation
- Resend API docs: https://resend.com/docs/api-reference/emails/send-email
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Cloudflare KV docs: https://developers.cloudflare.com/kv/
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Cloudflare Email Routing: https://developers.cloudflare.com/email-routing/ (for Phase 7 compatibility planning)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `campaign.js` — Signal-based campaign state with `tempEmail` field already in schema. Key pair can be stored here.
- `email-sender.js` — `sendToBroker()` and `batchSend()` functions with abort support. Phase 6 will refactor these to call the relay.
- `status-tracker.js` — `markBrokerSent()`, `updateBrokerStatus()`, `STATUS` enum. Worker responses will map to these status transitions.
- `notifications.js` — `addNotification()` ready for send success/failure events.

### Established Patterns
- Preact Signals for all reactive state (immutable updates via spread)
- Campaign schema versioning with `migrateCampaign()` — will need v3 bump when adding encryption keys
- Auto-save to localStorage via signal effect
- File save/load via browser-fs-access

### Integration Points
- Worker will be a new `worker/` directory at the project root (separate from Preact app)
- Worker deployment via wrangler (Cloudflare CLI) — new devDependency
- Campaign schema needs `encryption` field for key pair storage (v3 migration)
- `email-sender.js` is the primary refactoring target in Phase 6

</code_context>

<specifics>
## Specific Ideas

- User explicitly requested a "stop button" / "End Campaign" flow for temp address deletion — not just automatic cleanup
- Temp address deletion triggers: (1) user clicks End Campaign, (2) all brokers resolved (confirmed/rejected), (3) TTL safety net for abandoned campaigns
- The Worker must be testable independently with curl/httpie before any frontend changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-relay-infrastructure-and-e2e-encryption*
*Context gathered: 2026-04-03*
