# Domain Pitfalls

**Domain:** Relay-based email architecture for GDPR erasure automation
**Researched:** 2026-04-01
**Milestone:** v2.0 -- Adding relay-based email sending to existing client-side app
**Supersedes:** Previous PITFALLS.md (2026-03-28, v1 concerns -- mail.tm, CORS, localStorage)

---

## Critical Pitfalls

Mistakes that cause architectural rewrites, service blacklisting, permanent data loss, or complete feature failure.

### Pitfall 1: New Domain Deliverability Penalty -- erasurekit.uk Has Zero Reputation

**What goes wrong:** The `erasurekit.uk` domain was recently registered. New domains face approximately a 30 percentage point penalty versus mature domains for inbox placement. Email providers (Gmail, Outlook, Yahoo) distrust new domains by default. Sending 100 erasure request emails from day one will trigger spam filters, potentially blacklisting the domain permanently. Organizations with full SPF+DKIM+DMARC enforcement plus aged domains consistently achieve 85-95% inbox placement; new domains without warm-up achieve 55-65%.

**Why it happens:** Email providers use domain age as a trust signal. New domains are statistically more likely to be spam sources. The 2024-2025 authentication requirements from Google (Feb 2024), Yahoo (Feb 2024), and Microsoft (May 2025) further penalize domains without established sending history.

**Consequences:**
- Erasure request emails land in broker spam folders, never seen by privacy teams
- The GDPR deadline clock never starts because the request was never effectively received
- Users believe requests were sent successfully (relay confirms dispatch) but brokers never respond
- Domain gets blacklisted early, making all future sending from `erasurekit.uk` permanently compromised
- Resend's sending reputation on shared IPs may further degrade deliverability for new/small senders

**Prevention:**
- **Immediate DNS setup:** Configure SPF, DKIM, and DMARC records before sending a single email. Resend requires SPF and DKIM for domain verification; add DMARC as well. Start with `p=none` for monitoring, escalate to `p=quarantine` after 2-4 weeks of clean sending.
- **Warm-up schedule:** Do NOT launch "Send All" to 169 brokers on day one. Implement a mandatory warm-up:
  - Week 1-2: 5-10 emails/day (internal testing, known-good recipients)
  - Week 3-4: 15-25 emails/day (small batch of brokers)
  - Week 5-6: 30-50 emails/day
  - Week 7+: Up to 100 emails/day (which conveniently matches Resend's free tier daily limit)
- **Use a subdomain:** Send from `mail.erasurekit.uk` or `send.erasurekit.uk` instead of the root domain. This isolates sending reputation -- if the subdomain gets burned, the root domain remains clean for future use.
- **Google Postmaster Tools:** Register the domain to monitor inbox placement, spam complaint rates, and authentication results.
- **Calendar batching UI:** The planned "calendar UI showing send schedule across days" is not just a nice feature -- it is mandatory infrastructure for warm-up. The app must enforce volume limits per day, not just display them.

**Detection:** Monitor Resend webhook events for `bounced` and `complained` statuses. If bounce rate exceeds 4% or spam complaint rate exceeds 0.08%, pause sending immediately. Check Google Postmaster Tools for domain reputation classification (High/Medium/Low/Bad).

**Phase impact:** Phase 1 (relay infrastructure setup). DNS and warm-up strategy must be configured before any user-facing sending. The calendar batching UI is not a "nice-to-have" -- it is the warm-up enforcement mechanism.

**Confidence:** HIGH -- verified via multiple email deliverability guides, Resend's own documentation on bounce/spam rate thresholds, and domain warm-up best practices for 2025-2026.

---

### Pitfall 2: Resend Free Tier Limits Will Bottleneck Real Usage

**What goes wrong:** Resend free tier allows 100 emails/day and 3,000 emails/month. ErasureKit's broker database contains 169 brokers. A single user sending to all brokers needs 169 emails minimum (more if follow-ups and escalations are counted). That is 1.7 days of the daily limit for one user. With follow-up reminders at 30 days and escalation emails, one complete campaign could use 400-500 emails. The free tier supports approximately 6-7 complete user campaigns per month.

**Why it happens:** The free tier is designed for prototyping, not production automation. Several subtle gotchas compound the problem:
- Multiple To/CC/BCC recipients count as separate emails (if templates CC the user, each email costs 2 quota)
- Both sent AND received emails count toward the monthly quota (incoming broker replies via Cloudflare Email Routing that pass through Resend also count)
- Data retention is only 1 day on the free tier (no ability to debug delivery issues after 24 hours)
- No analytics on the free tier (cannot track open rates or delivery rates)
- Rate limit of 5 requests per second is per-team, shared across all API keys

**Consequences:**
- A single power user sending to all 169 brokers consumes nearly 2 days of the daily quota
- If even 5-10 users use the tool in a month, the free tier is exhausted
- Rate limit errors from Resend are silent (return error objects, not exceptions) -- emails may be silently dropped if the relay does not check response status
- With 1-day log retention, debugging delivery failures is nearly impossible
- CC'ing the user on their own erasure requests doubles the email cost per broker

**Prevention:**
- **Never CC the user on sent emails.** Store the sent email content locally in the browser and show it in the campaign dashboard. The relay should send one email per broker, not two.
- **Implement quota tracking in Cloudflare KV.** The relay Worker must maintain a running count of daily and monthly sends. Check before each send and reject with a clear error if the limit would be exceeded. Do not rely on Resend's error response alone.
- **Design the multi-domain relay registry from the start.** Each contributor-donated domain adds 3,000 emails/month. The Worker must load-balance across available domains. This is not a "future feature" -- it is the scaling architecture.
- **Batch API endpoint.** Resend supports sending up to 100 emails per API call (batch endpoint), which counts as 100 emails toward quota but only 1 request toward rate limit. Use this for multi-broker dispatch.
- **Queue with retry.** If Resend returns a rate limit (429) or error, the relay must queue the email and retry after a delay, not silently drop it. Store pending emails in KV with exponential backoff.
- **Do not use Resend for incoming email routing.** Use Cloudflare Email Routing (free, unlimited) for receiving. Only use Resend for outbound sending. If both sent and received emails count, misconfiguring this could double quota consumption.

**Detection:** Track `X-Resend-*` headers in responses. Log daily/monthly counters in KV. Set up an alert when daily usage exceeds 80 emails (80% of limit). Surface quota status in the app UI so users can see remaining capacity.

**Phase impact:** Phase 1-2 (relay design + quota management). Quota tracking must be baked into the relay from day one. The multi-domain registry is not optional for scaling beyond 6-7 users/month.

**Confidence:** HIGH -- verified via Resend official docs, pricing page, and knowledge base articles on quotas.

---

### Pitfall 3: erasurekit.uk Will Be Blacklisted as a Disposable Email Domain

**What goes wrong:** The project's core design generates temporary email addresses like `a7k9x@erasurekit.uk`. This is functionally identical to a disposable email service. Services like Block-Disposable-Email.com track 188,384+ disposable domains. Once erasurekit.uk appears on any of these lists, data brokers using disposable email blockers will automatically reject all erasure requests sent from the domain.

**Why it happens:** Disposable email detection services add domains programmatically based on behavior patterns: many different usernames sending from the same domain, short-lived addresses, automated sending patterns. ErasureKit exhibits all of these characteristics. It may take weeks to months for the domain to appear on blacklists, but once it does, removal is difficult.

**Why it matters more for v2.0 than v1.0:** The v1 mail.tm-based approach already had this problem (mail.tm is universally blacklisted). The v2.0 relay approach was supposed to solve it by using a custom domain. But the custom domain will eventually face the same fate if it generates addresses that look disposable.

**Consequences:**
- Brokers using commercial disposable email blockers (IPQualityScore, ZeroBounce, IsTempMail) will silently reject emails from `@erasurekit.uk`
- The domain may be added to open-source disposable domain lists on GitHub (900+ contributors maintaining lists of 100,000+ domains)
- Once blacklisted, the domain is permanently compromised for email sending
- Users believe requests were sent but they never arrive at the broker

**Prevention:**
- **Use persistent-looking addresses.** Instead of random strings like `a7k9x@erasurekit.uk`, generate human-readable aliases: `privacy.request.2026.04@erasurekit.uk` or `gdpr.{hash}@erasurekit.uk`. These look less like throwaway addresses to automated filters.
- **Monitor blacklists proactively.** Periodically check major disposable email domain lists (GitHub repos, block-disposable-email.com, istempmail.com) for `erasurekit.uk`. If it appears, request removal immediately -- some services like IsTempMail allow domain owners to request removal.
- **Multi-domain strategy is critical.** When `erasurekit.uk` gets blacklisted, the contributor-donated domains become the fallback. Design the relay to rotate sending domains so no single domain carries all traffic.
- **Include broker-specific sending method in broker database.** Some brokers check disposable email lists; others do not. Test each broker and flag accordingly. For brokers that block temp-like domains, provide alternative opt-out methods (web portals, postal mail).
- **GDPR legal argument.** Under GDPR, a broker cannot refuse an erasure request solely because the sender uses a temporary email domain. The request is valid if it identifies the data subject. However, making this argument is only possible if the user knows the request was blocked -- and silent drops give no indication.

**Detection:** Monthly automated test: send a test email from `test@erasurekit.uk` to a set of known disposable-email-blocking services. If delivery fails, the domain has been blacklisted. Also check domain against the GitHub `disposable-email-domains/disposable-email-domains` repository.

**Phase impact:** Phase 1-2 (relay design + broker database). Address format and multi-domain architecture decisions must happen during relay infrastructure design. Broker-level sending method metadata must be in the schema.

**Confidence:** HIGH -- verified via Block-Disposable-Email.com statistics, GitHub disposable domain repos, and commercial email validation service documentation.

---

### Pitfall 4: E2E Encryption Key Loss = Permanent Data Loss (No Recovery Possible)

**What goes wrong:** The project requires E2E encryption where "the domain owner cannot read user emails." This means the decryption key exists only in the user's browser. If the user clears browser data, switches devices, reinstalls their browser, or uses incognito mode, the key is permanently lost. All encrypted email responses from brokers become unreadable. The user cannot resume their campaign or prove broker compliance/non-compliance.

**Why it happens:** The Web Crypto API stores CryptoKey objects in IndexedDB, which is the only browser API capable of persisting opaque key objects. But IndexedDB data is:
- Cleared when users "Clear browsing data" (the most common cause)
- Lost when switching to a new device or browser
- Destroyed in incognito/private browsing when the window closes
- Subject to browser storage eviction under storage pressure (though rare for IndexedDB)
- Not synced across devices by any browser

Without user accounts, there is no server-side key backup. Without a password, there is no key derivation that could reconstruct the key.

**Consequences:**
- User loses months of campaign tracking data encrypted with the lost key
- Broker responses that prove compliance or non-compliance become inaccessible
- User cannot generate evidence for DPA complaints (the encrypted evidence is useless)
- No recovery path exists -- the encryption is genuinely unbreakable without the key
- Users who switch devices mid-campaign lose everything

**Prevention:**
- **Export keys with the save file.** When the user saves their campaign to a JSON file (via File System Access API), include the encryption key material in the export. The key should be wrapped (encrypted) with a user-provided password using PBKDF2 before export. This gives a recovery path while maintaining E2E encryption.
- **Prominent key backup UI.** On first key generation, force the user to either: (a) save a JSON backup file containing the wrapped key, or (b) copy a base64-encoded key recovery string. Do not allow campaign creation without a backup step.
- **Re-derive key from password.** Instead of generating a random key, derive the encryption key from a user-chosen password using PBKDF2 or Argon2 (via WebAssembly). The password itself is never stored. The user can regenerate the key on any device by entering the same password. Tradeoff: weaker than random keys, and users may choose bad passwords.
- **Use AES-256-GCM exclusively.** This is authenticated encryption -- it prevents both data theft and data tampering. Use "raw" or "jwk" key export formats for cross-browser interoperability. Do NOT use AES-CBC or AES-CTR, which require separate authentication.
- **Detect insecure contexts.** `crypto.subtle` is undefined in insecure contexts (plain HTTP, `file://` in some browsers). The app must detect this and warn the user. Since ErasureKit is distributed as a local HTML file, it may hit this restriction -- test from `file://` origin explicitly.
- **No streaming needed.** Erasure request emails are small (< 100KB), so the Web Crypto API's lack of streaming support is not a problem for this use case.

**Detection:** On app startup, check if `window.crypto.subtle` exists. If not, the app is in an insecure context and encryption will fail. Check if a previously stored key exists in IndexedDB -- if the user has campaign data but no key, show a recovery dialog requesting the password or backup file.

**Phase impact:** Phase 2-3 (E2E encryption design). The key management strategy is an architectural decision that affects every other feature. Must be decided before any encryption code is written.

**Confidence:** HIGH -- verified via MDN Web Crypto API docs, browser crypto key storage research, IndexedDB persistence behavior documentation.

---

### Pitfall 5: Cloudflare KV 1,000 Writes/Day Limit Will Fail Under Load

**What goes wrong:** Cloudflare KV free tier allows only 1,000 write operations per day (reset at UTC 00:00). The relay Worker needs to write to KV for: quota tracking, campaign state, email status updates, rate limit counters, pending email queues, temporary encryption key storage. A single user campaign sending 100 emails could generate 300-500 KV writes (status tracking per email x multiple state transitions: queued -> sending -> sent/failed). Two concurrent campaigns would blow through the 1,000 daily limit.

**Why it happens:** KV is designed as a read-heavy, write-light store. Cloudflare intentionally chose these limits to discourage write-heavy workloads. The ErasureKit relay is inherently write-heavy -- every email send requires multiple state transitions stored in KV.

**Consequences:**
- KV write operations fail with HTTP 429 errors after hitting the daily cap
- Emails that were sent cannot have their status updated -- the app loses track of what was sent
- Quota counters become stale, potentially allowing over-sending (or under-sending if writes fail on counter increments)
- The relay enters an inconsistent state where some emails are tracked and others are not
- Users see "campaign in progress" but no status updates

**Prevention:**
- **Minimize writes aggressively.** Batch multiple status updates into a single KV write. Instead of writing one key per email status, write one key per campaign with all email statuses as a JSON object. One write updates 100 email statuses instead of 100 writes updating 1 each.
- **Read-before-write.** Only write to KV when data has actually changed. Read the existing value, compare, and skip the write if unchanged. This optimization reduced one developer's KV writes by 91%.
- **Use the Cache API for transient data.** Cloudflare's Cache API does not count toward KV write limits. Use it for rate limit counters, temporary state, and data that can be reconstructed. KV should store only durable state that must survive Worker restarts.
- **Design for write budget.** Calculate the maximum writes per campaign and set a hard cap. With 1,000 writes/day and batched status writes, the relay can support approximately 5-10 concurrent campaigns comfortably. Document this as a system capacity limit.
- **Consider Durable Objects if budget allows.** For $5/month (Workers Paid plan), Durable Objects provide strongly consistent, write-heavy storage with no daily write cap. This may be worth the cost if the tool gets popular.

**Detection:** Track KV write count per day in the Worker itself (using a KV key for the counter -- but this itself costs a write, so initialize at start of UTC day and cache in Worker memory). If approaching 800 writes, switch to degraded mode (stop tracking per-email status, batch everything).

**Phase impact:** Phase 1 (relay architecture). KV write budget must be calculated during architecture design. The data model (one key per campaign vs. one key per email) has massive impact on write consumption.

**Confidence:** HIGH -- verified via Cloudflare KV pricing docs, free tier limits documentation, and community optimization reports.

---

### Pitfall 6: Relay Becomes an Open Relay / Abuse Vector

**What goes wrong:** The Cloudflare Worker relay accepts requests from any browser (no user accounts, no authentication) and sends emails on behalf of anonymous users. This is functionally an open email relay. Attackers can script the relay endpoint to send spam or phishing emails through `@erasurekit.uk`, burning the domain's reputation and potentially getting the Resend account suspended.

**Why it happens:** The "no accounts, no tracking" design philosophy means there is no authenticated identity to rate-limit against. Without user accounts, the relay cannot distinguish a legitimate user from an attacker. The relay endpoint URL is public (embedded in the client-side code), so anyone can call it.

**Consequences:**
- Attackers use the relay to send spam, phishing, or malware distribution emails
- `erasurekit.uk` domain gets blacklisted by email providers
- Resend suspends the API key for abuse (free tier accounts have no SLA and limited abuse tolerance)
- Cloudflare may disable the Worker for terms of service violations
- Legitimate users cannot send erasure requests because the infrastructure is burned

**Prevention:**
- **Content restriction:** The relay Worker must ONLY send emails using pre-defined erasure request templates. The relay should accept a template ID and broker ID, not arbitrary email content. The Worker constructs the email from templates stored server-side -- the client never provides raw email body text.
- **Recipient restriction:** The relay should only send to email addresses listed in the broker database. The Worker should have its own copy of `brokers.json` and reject any request targeting an unlisted address. This prevents the relay from being used to email arbitrary recipients.
- **Rate limiting per client:** Without user accounts, rate limit by IP address, browser fingerprint, or a proof-of-work challenge (e.g., hashcash). Limit each IP to N emails per day (e.g., 200 -- enough for one full campaign). Use KV to track per-IP usage.
- **CAPTCHA or challenge on first use:** Before a client can use the relay, require a one-time CAPTCHA solve (e.g., Cloudflare Turnstile, which is free). Store the challenge token in KV with a TTL. This prevents automated scripting.
- **HMAC request signing:** Generate a short-lived token on the client side that includes a timestamp and a hash of the request parameters. The Worker validates the token. This is not authentication but raises the bar above trivial curl abuse.
- **Monitor and kill switch:** Implement a "kill switch" KV flag that the relay operator can set to immediately halt all sending if abuse is detected. Monitor Resend bounce/complaint rates via webhooks and auto-disable if thresholds are exceeded.
- **Never expose the Resend API key to the client.** The Worker must be the only thing that has the API key. The client sends structured requests to the Worker; the Worker constructs and sends the email via Resend.

**Detection:** Monitor Resend webhook events for unusual patterns: sending to non-broker addresses, high bounce rates, spam complaints. Log all relay requests in KV (sender IP, timestamp, recipient) for forensic analysis. Set up Cloudflare Workers analytics to detect traffic spikes.

**Phase impact:** Phase 1 (relay security design). Anti-abuse measures must be built into the relay from the first deployment. Retrofitting abuse prevention after an incident is too late -- the domain reputation is already damaged.

**Confidence:** HIGH -- verified via open relay abuse documentation, email relay security best practices, and the inherent risk profile of anonymous relay services.

---

## Moderate Pitfalls

### Pitfall 7: Cloudflare KV Eventual Consistency Causes Stale Quota Reads

**What goes wrong:** KV is eventually consistent. Changes may take up to 60 seconds to propagate globally. If a user in London sends 5 emails (updating the quota counter) and a user in Tokyo sends 5 emails simultaneously, both Workers read the same stale quota counter and each believes there is room for their emails. The actual quota consumption is double what either Worker calculated. Over time, this causes the relay to exceed Resend's daily limit and fail.

Additionally, Cloudflare disclosed in 2025 that read-your-own-write consistency (previously available within the same PoP) had regressed and is no longer guaranteed, even for requests hitting the same data center.

**Why it happens:** KV is optimized for read-heavy workloads with infrequent writes. It uses aggressive caching at edge locations. A write in one PoP may not be visible to another PoP for 60+ seconds. The quota counter is a classic "shared mutable state" problem that KV is not designed to handle.

**Prevention:**
- **Conservative quota calculation.** Reserve a safety margin. If the daily limit is 100 emails, set the effective limit to 80 in the Worker. This absorbs eventual consistency lag.
- **Per-PoP quota partitioning.** Instead of one global counter, partition the daily quota across regions. Each PoP gets a fixed allocation (e.g., 25 emails for EU PoPs, 25 for US PoPs, 25 for Asia PoPs, 25 reserve). This eliminates cross-PoP contention at the cost of underutilization.
- **Durable Objects for quota coordination.** If consistency matters (and for quota tracking, it does), use a Durable Object as the single source of truth for the quota counter. Durable Objects guarantee global uniqueness -- exactly one instance handles all quota decisions. This requires Workers Paid ($5/month).
- **Accept occasional over-sends.** Design the system to tolerate 5-10% over-sending. Resend will reject with 429 errors when the real limit is hit. The relay should handle this gracefully (queue and retry next day) rather than crashing.

**Detection:** Compare the KV quota counter against Resend's actual daily send count (available via Resend API, though not on free tier). If they diverge by more than 10%, the eventual consistency lag is causing miscounts.

**Phase impact:** Phase 2 (quota management). Decide whether eventual consistency is acceptable for quota tracking or whether Durable Objects are needed.

**Confidence:** HIGH -- verified via Cloudflare KV documentation on eventual consistency, community reports on RYOW regression, and the June 2025 KV outage post-mortem.

---

### Pitfall 8: SPF/DKIM/DMARC Misconfiguration Silently Kills Deliverability

**What goes wrong:** Resend requires SPF and DKIM DNS records for domain verification. If these records are misconfigured, partially configured, or conflict with other DNS entries, emails will fail authentication silently. Common mistakes:
- Multiple SPF records (only one is allowed per domain; having two causes both to fail)
- SPF record exceeds the 10 DNS lookup limit (Resend's include counts toward this)
- DKIM key rotation not handled (Resend periodically rotates DKIM keys; if DNS records are stale, verification fails)
- DMARC set to `p=none` permanently (provides zero protection, signals low trustworthiness to providers)
- Using the root domain instead of a subdomain (SPF/DKIM failures on the root domain affect ALL email from that domain)

**Why it happens:** DNS configuration is error-prone, and email authentication failures are invisible to the sender. Resend's domain verification checks confirm the initial setup but do not continuously validate that records remain correct. Resend has a "Temporary Failure" status when it can no longer detect records, but this can take days to appear.

**Prevention:**
- **Use a sending subdomain.** Configure `mail.erasurekit.uk` as the sending domain in Resend. This keeps the root domain clean for future use (website, other email services).
- **One SPF record only.** If using Cloudflare for both Email Routing (receiving) and Resend (sending), merge the SPF includes into a single record: `v=spf1 include:_spf.mx.cloudflare.net include:send.resend.com ~all`
- **DMARC escalation plan.** Start with `v=DMARC1; p=none; rua=mailto:erasurekit@proton.me` for monitoring. After 2-4 weeks of clean sending and alignment, change to `p=quarantine`. After 2 more months, move to `p=reject`.
- **Monitor Resend domain status.** Check the Resend dashboard for domain verification status. If it changes to "Temporary Failure," fix DNS records within 72 hours or it will change to "Failure" and sending will stop.
- **DNS validation CI check.** Add an automated check (weekly cron or manual script) that queries DNS for the domain and verifies SPF, DKIM, and DMARC records are present and correct.

**Detection:** Resend domain status page shows verification state. Use external tools like MXToolbox or Google Postmaster Tools to verify authentication alignment. Send a test email to `check@mail-tester.com` to see authentication score.

**Phase impact:** Phase 1 (DNS setup). Must be done correctly before any sending begins. The DMARC escalation plan spans multiple weeks/months after initial setup.

**Confidence:** HIGH -- verified via Resend domain verification docs, email authentication best practices for 2025-2026, and SPF/DKIM/DMARC setup guides.

---

### Pitfall 9: Cloudflare Email Routing Worker Limitations for Inbound Processing

**What goes wrong:** Inbound email processing via Cloudflare Email Workers has several undocumented or under-documented limitations:
- Free tier Workers processing emails may hit CPU allocation errors on large messages (25 MiB max message size, but CPU limits are 10ms on free tier)
- Local development with `wrangler dev` does not support email triggers -- all testing must happen on deployed Workers
- Forwarding from a Worker requires pre-verified destination addresses -- you cannot dynamically forward to arbitrary addresses (like the user's real email)
- Only `X-*` headers can be added when forwarding
- "Dropped" status in Activity Log is a known bug for successfully forwarded messages -- you cannot trust the dashboard
- Routing rules limit: 200 rules, 200 destination addresses

**Why it happens:** Cloudflare Email Routing is a free service designed for simple forwarding. The Workers integration extends it into programmable email processing, but the free tier imposes significant constraints.

**Consequences:**
- Cannot test email processing locally -- development cycle is slow (deploy, send test email, check logs)
- Large broker responses with attachments may exceed Worker CPU limits and fail silently
- Cannot forward decrypted emails to the user's real inbox (since the user's email is not pre-verified as a destination)
- Dashboard shows misleading "Dropped" status, causing false alarms during monitoring

**Prevention:**
- **Do not plan to forward emails to users.** Instead, store incoming email content (encrypted) in KV and let the user's browser fetch it. The Worker processes the email, encrypts the content, stores it in KV, and the client polls for new messages. This avoids the destination verification requirement entirely.
- **Strip attachments.** Most broker responses are plain text or simple HTML. Strip large attachments before processing to stay within CPU limits. Store a note that an attachment existed and its size.
- **Budget for Workers Paid ($5/month) if email processing is complex.** Free tier's 10ms CPU time may not be enough for parsing, encrypting, and storing complex email responses. Paid tier gives 30 seconds.
- **Automated testing via external email.** Set up a test sender (Resend, or another email service) that sends test emails to `test@erasurekit.uk` on a schedule. The Worker processes them and writes results to KV. A CI job checks KV for expected results.
- **Ignore Activity Log status.** Do not build monitoring dashboards that rely on Cloudflare's Activity Log. Instead, have the Worker log all processing results to KV with timestamps.

**Detection:** Use `wrangler tail` during development to see real-time Worker logs. Check for `EXCEEDED_CPU` errors. Monitor KV for expected write patterns after sending test emails.

**Phase impact:** Phase 2 (inbound email processing). Development workflow must account for no-local-testing. The Worker must be designed to store-then-serve rather than forward-to-user.

**Confidence:** HIGH -- verified via Cloudflare Email Routing documentation, Worker limits documentation, and community bug reports.

---

### Pitfall 10: Web Crypto API Fails on file:// Origin (Breaks Portable App)

**What goes wrong:** ErasureKit is distributed as a portable HTML file opened directly from disk (`file://` protocol). The Web Crypto API's `crypto.subtle` is supposed to be `undefined` in insecure contexts. The `file://` protocol is considered insecure in most browsers. This means the E2E encryption feature may be completely unavailable when users open the app from a downloaded HTML file.

**Why it happens:** The Web Crypto API spec requires a "secure context" (HTTPS or localhost). Browser implementations vary:
- Chrome: `crypto.subtle` is defined on `file://` but operations fail with `NotSupportedError`
- Firefox: `crypto.subtle` is available on `file://` (historically more permissive)
- Safari: behavior varies by version
- Edge: follows Chrome behavior

**Consequences:**
- Users download the portable HTML file, open it, try to create a campaign with E2E encryption, and it fails silently or with a cryptic error
- The feature works in development (localhost) but breaks in the primary distribution mode (file://)
- No fallback exists because encryption is a core privacy promise -- the relay depends on it

**Prevention:**
- **Test explicitly from `file://` in all target browsers.** This must be the first test case, not an afterthought. If `crypto.subtle` is unavailable, the entire E2E encryption architecture is invalid for the portable distribution model.
- **Provide a simple localhost server option.** Include instructions (and possibly a one-line Python/Node command) for users to serve the file over localhost, which qualifies as a secure context. Example: `npx serve .` or `python -m http.server 8000`.
- **Consider a hosted fallback.** Publish the app at `https://erasurekit.uk` as a hosted version with full crypto support. The portable HTML file becomes a "lite" version without encryption, while the hosted version is the "full" version. This is a significant UX/architecture tradeoff.
- **Feature detection with clear messaging.** On startup, check `if (!window.crypto?.subtle)` and show a clear, user-friendly message: "E2E encryption is not available in this mode. For full privacy protection, open the app from [hosted URL] or serve it locally."
- **Do not silently degrade.** If encryption is unavailable, do NOT send emails without encryption. Either block relay access entirely or clearly warn the user that the domain owner will be able to read broker responses.

**Detection:** `typeof window.crypto?.subtle` returns `undefined` in insecure contexts (or operations throw `NotSupportedError` in Chrome). Test this check in every target browser from a `file://` path.

**Phase impact:** Phase 1-2 (architecture decision). This is a fundamental compatibility question that determines whether E2E encryption is viable in the portable distribution model. Must be validated before any encryption code is written.

**Confidence:** HIGH -- verified via MDN Web Crypto API docs, Chromium WebCrypto documentation, and secure context requirements.

---

### Pitfall 11: Campaign State Split Between Browser and Server Creates Sync Nightmares

**What goes wrong:** v2.0 creates a split-state architecture:
- **Browser holds:** User identity info, campaign progress, encryption keys, UI state, saved file data
- **KV holds:** Quota counters, email send status, queued emails, incoming encrypted responses
- **Neither holds a complete picture.** The browser thinks 50 emails were sent; KV says 48 (2 failed silently). The browser shows a broker as "pending" but KV has already received a response. The user saves their file, closes the browser, and comes back a day later -- the KV state has changed (new broker responses arrived) but the local file is stale.

**Why it happens:** The "no server, no accounts" design means there is no server-side session that ties browser state to relay state. KV stores relay-side data keyed by... what? Campaign ID? User-generated encryption key hash? There is no stable identifier linking a browser session to its KV data without an account system.

**Consequences:**
- Users see conflicting status between what their browser shows and what the relay knows
- Emails that failed at the relay level appear as "sent" in the browser
- Incoming broker responses stored in KV are not visible until the browser actively polls for them
- If the user loses their save file, KV still has data but no way to authenticate the user to access it
- Resume across sessions is fragile -- the browser must synchronize with KV on every load, and eventual consistency means it may get stale data

**Prevention:**
- **Define a campaign ID scheme.** Generate a unique campaign ID (UUID or derived from encryption key) on the client side. This ID is the KV namespace prefix for all relay data. The client authenticates to the relay using a hash of the encryption key + campaign ID.
- **Server-side is source of truth for send status.** The browser should always defer to KV for email send status, not its own cache. On load, the browser fetches all KV data for its campaign ID and reconciles with local state. Local state is a cache; KV is authoritative.
- **Client-side is source of truth for user identity.** KV never stores unencrypted user identity. The browser is the only place that knows who the user is.
- **Polling with conflict resolution.** Define clear conflict resolution rules: if browser says "pending" and KV says "sent," trust KV. If browser says "sent" and KV says "failed," show "failed" with the error reason. Document every possible state combination.
- **Include sync timestamp.** Every KV read includes a timestamp. Every save file includes a "last synced" timestamp. Show the user when their data was last synchronized with the relay.

**Detection:** Compare browser campaign state with KV campaign state on every app load. Log discrepancies. If more than 5% of email statuses differ, show a warning.

**Phase impact:** Phase 2-3 (state management design). The state synchronization protocol must be designed alongside the relay API. This is one of the most architecturally complex aspects of v2.0.

**Confidence:** HIGH -- inherent architectural complexity of split-state systems without server-side sessions.

---

## Minor Pitfalls

### Pitfall 12: Cloudflare Worker 10ms CPU Limit May Not Be Enough for Encryption

**What goes wrong:** The free tier Cloudflare Worker has a 10ms CPU time limit per request. If the relay Worker needs to encrypt incoming email content before storing it in KV (for E2E encryption), the encryption operation may exceed 10ms for larger emails. AES-256-GCM encryption of a 100KB email body takes approximately 1-5ms, which seems safe, but key derivation (PBKDF2) can easily take 50-100ms+ depending on iteration count.

**Prevention:**
- Do encryption on the client side, not the Worker. The Worker stores incoming emails in raw (or lightly obfuscated) form in KV, and the client decrypts on fetch. But this partially defeats E2E encryption if the Worker can read the raw email before the client encrypts it.
- Alternative: Use the user's public key (provided at campaign creation) to encrypt incoming emails in the Worker using asymmetric encryption (RSA-OAEP or ECDH). This is fast (< 5ms for small payloads) and keeps the Worker from seeing decrypted content.
- Budget for Workers Paid ($5/month) if encryption workload exceeds 10ms consistently.

**Phase impact:** Phase 2-3 (encryption implementation). Benchmark encryption operations within the Worker CPU budget before committing to server-side encryption.

**Confidence:** MEDIUM -- depends on actual payload sizes and chosen encryption scheme. Needs benchmarking.

---

### Pitfall 13: Contributor Domain Donation Creates Trust and Legal Complexity

**What goes wrong:** The planned scaling model involves contributors donating $2/year domains to increase relay capacity. Each donated domain sends emails on behalf of ErasureKit users. This creates several problems:
- The domain owner (contributor) could configure their domain to read emails or redirect traffic
- If a contributor domain is used for abuse, the contributor's domain gets blacklisted (not erasurekit.uk)
- Contributors may abandon domains mid-year, causing sending failures
- Legal responsibility for emails sent through contributed domains is unclear
- DMARC/SPF/DKIM must be configured on each contributed domain

**Prevention:**
- Require all contributed domains to use Cloudflare DNS (so the project maintainer can manage DNS records directly)
- Establish a simple contributor agreement covering liability and domain maintenance
- Implement health checks for contributed domains (DNS verification, test email delivery)
- Build graceful failover: if a contributed domain fails, the relay automatically routes through other available domains
- Start with project-owned domains only. Add contributor domains as a future scaling phase, not in the initial v2.0 launch.

**Phase impact:** Phase 3+ (scaling). Defer until the relay architecture is proven with the primary domain.

**Confidence:** MEDIUM -- logical inference from distributed infrastructure management challenges.

---

### Pitfall 14: Resend Rate Limit Errors Are Silent (Not Exceptions)

**What goes wrong:** Resend does not throw exceptions when rate limits are hit. Instead, it returns error objects in the response body. If the relay Worker does not explicitly check every response for error fields, rate-limited emails will be silently dropped. The Worker logs no error, the user sees no failure, and the erasure request never reaches the broker.

**Prevention:**
- Always parse Resend API responses for `statusCode` and `error` fields before marking an email as "sent"
- Implement structured response validation: `if (response.statusCode >= 400) { ... handle error ... }`
- Log all Resend error responses to KV for debugging (with 1-day TTL to stay within write budget)
- Implement retry with exponential backoff for 429 (rate limit) responses
- Surface send failures in the client UI with clear error messages

**Phase impact:** Phase 1 (relay implementation). Error handling must be part of the initial Worker code.

**Confidence:** HIGH -- verified via Resend API documentation and developer community reports.

---

### Pitfall 15: Cloudflare Workers Free Tier 50-Subrequest Limit per Invocation

**What goes wrong:** Workers on the free plan are limited to 50 external subrequests (fetch calls to external APIs) per invocation. If the relay Worker tries to batch-send emails by making multiple Resend API calls in a single invocation, it will fail after 50 calls. Subrequests to Cloudflare services (KV reads/writes) have a separate 1,000 limit per invocation.

**Prevention:**
- Use Resend's batch API endpoint (send up to 100 emails per API call). This counts as 1 subrequest to send 100 emails.
- If batch is not suitable, design the Worker to handle one email per invocation. The client makes N requests to the Worker, each Worker invocation sends one email. This uses N of the 100K daily request quota but stays within the 50-subrequest limit.
- Each redirect in a subrequest counts separately -- ensure Resend's API endpoint does not redirect.

**Phase impact:** Phase 1 (relay architecture). The Worker's request/response model must be designed around this limit.

**Confidence:** HIGH -- verified via Cloudflare Workers limits documentation (updated February 2026).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| DNS & Domain Setup (Phase 1) | SPF/DKIM/DMARC misconfiguration; domain has zero reputation | Set up all DNS records before first send. Use subdomain. Plan 6-8 week warm-up. |
| Relay Worker Design (Phase 1) | Open relay abuse; Resend silent errors; 50-subrequest limit; 10ms CPU limit | Template-only sending, recipient whitelist, CAPTCHA, error response parsing, batch API |
| KV Data Model (Phase 1) | 1,000 writes/day limit; eventual consistency on quota reads | Batch writes (one key per campaign), read-before-write, conservative quota margins |
| Anti-Abuse (Phase 1) | Relay used for spam; domain blacklisted | IP rate limiting, content restriction, Turnstile CAPTCHA, kill switch |
| E2E Encryption (Phase 2) | Key loss = permanent data loss; `file://` origin breaks crypto.subtle | Password-based key derivation, mandatory backup, secure context detection, hosted fallback |
| State Synchronization (Phase 2) | Browser vs KV state divergence; campaign resume failures | Campaign ID scheme, KV as truth for send status, polling with conflict resolution |
| Quota Management (Phase 2) | Resend 100/day exceeded; CC doubles cost; multi-user contention | Never CC user, batch API, per-domain quota tracking, multi-domain load balancing |
| Inbound Email Processing (Phase 2) | Worker CPU limits; no local testing; forwarding requires pre-verified addresses | Store-then-serve model, strip attachments, deploy-and-test workflow |
| Disposable Domain Blacklisting (Phase 2-3) | erasurekit.uk added to disposable email blocklists | Human-readable addresses, multi-domain rotation, broker-level method metadata |
| Domain Warm-Up (Phase 2-3) | Sending too aggressively burns domain reputation permanently | Calendar batching UI enforces warm-up schedule, monitor bounce/complaint rates |
| Contributor Domains (Phase 3+) | Trust issues, DNS management, abandonment, legal liability | Defer to post-launch. Require Cloudflare DNS. Health checks. Contributor agreement. |

---

## Risk Priority Matrix

| Pitfall | Severity | Likelihood | Phase to Address | Cost of Fixing Late |
|---------|----------|------------|------------------|---------------------|
| Domain deliverability / warm-up | Critical | Certain | Phase 1 | Domain permanently blacklisted |
| Open relay abuse | Critical | High | Phase 1 | Domain + Resend account burned |
| KV write limit exceeded | Critical | High | Phase 1 | Service outage, lost state |
| Disposable domain blacklisting | Critical | High | Phase 2 | Domain reputation destroyed |
| E2E key loss | Critical | High | Phase 2 | Permanent data loss for users |
| Resend quota exhaustion | High | Certain | Phase 1-2 | Users cannot send requests |
| SPF/DKIM/DMARC misconfiguration | High | Medium | Phase 1 | Silent delivery failure |
| KV eventual consistency | Moderate | Medium | Phase 2 | Over-sending, quota miscounts |
| State sync complexity | Moderate | High | Phase 2-3 | Confusing UX, lost campaigns |
| Worker CPU limits | Moderate | Medium | Phase 2 | Need paid tier ($5/month) |
| `file://` origin breaks crypto | Moderate | Certain | Phase 2 | Architecture rethink needed |
| Inbound Worker limitations | Moderate | Medium | Phase 2 | Slow development, test gaps |
| Contributor domain trust | Low | Low | Phase 3+ | Manageable if deferred |
| Silent rate limit errors | Low | Certain | Phase 1 | Emails silently dropped |

---

## Sources

### Resend
- [Resend Account Quotas and Limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits) -- free tier: 100/day, 3,000/month, 5 req/sec rate limit
- [Resend Pricing](https://resend.com/pricing) -- free vs Pro vs Scale comparison
- [Resend Domain Management](https://resend.com/docs/dashboard/domains/introduction) -- domain verification, SPF/DKIM setup, subdomain recommendations
- [Resend Top 10 Deliverability Tips](https://resend.com/blog/top-10-email-deliverability-tips) -- use subdomains, monitor bounce rates
- [Resend New Free Tier Announcement](https://resend.com/blog/new-free-tier) -- 30x increase, adjusted limits
- [Resend Pricing Guide 2025 (Flexprice)](https://flexprice.io/blog/detailed-resend-pricing-guide) -- CC/BCC counting, data retention differences
- [Resend Rate Limit Debugging (Medium)](https://dalenguyen.medium.com/mastering-email-rate-limits-a-deep-dive-into-resend-api-and-cloud-run-debugging-f1b97c995904) -- silent error handling, 429 responses

### Cloudflare Workers & KV
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) -- 10ms CPU free tier, 50 subrequests
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) -- 100K requests/day free
- [Cloudflare KV Pricing](https://developers.cloudflare.com/kv/platform/pricing/) -- 1,000 writes/day free tier
- [Cloudflare KV Limits](https://developers.cloudflare.com/kv/platform/limits/) -- write rate limits
- [How KV Works](https://developers.cloudflare.com/kv/concepts/how-kv-works/) -- eventual consistency, 60-second propagation
- [KV FAQ](https://developers.cloudflare.com/kv/reference/faq/) -- last-write-wins, write ordering
- [Cloudflare KV Rearchitecture (2025)](https://blog.cloudflare.com/rearchitecting-workers-kv-for-redundancy/) -- RYOW regression, June 2025 outage
- [Workers KV Write Optimization (91% Reduction)](https://aarongxa.com/posts/optimizing-cloudflare-workers-kv-a-91-reduction-in-write-operations/) -- read-before-write strategy
- [Cloudflare Workers Cold Start Optimization (InfoQ)](https://www.infoq.com/news/2025/10/workers-shard-conquer-cold-start/) -- V8 isolates, sub-1ms starts
- [Workers Subrequest Limit Removed (Feb 2026)](https://developers.cloudflare.com/changelog/2026-02-11-subrequests-limit/) -- paid plan only

### Cloudflare Email Routing
- [Email Routing Overview](https://developers.cloudflare.com/email-routing/) -- free, unlimited receiving
- [Email Workers](https://developers.cloudflare.com/email-routing/email-workers/) -- programmable email processing
- [Email Routing Limits](https://developers.cloudflare.com/email-routing/limits/) -- 25 MiB message size, 200 rules, 200 destinations
- [Email Workers Runtime API](https://developers.cloudflare.com/email-routing/email-workers/runtime-api/) -- forward requirements, header restrictions

### Email Deliverability
- [Email Deliverability in 2026 (EGen Consulting)](https://www.egenconsulting.com/blog/email-deliverability-2026.html) -- SPF/DKIM/DMARC checklist
- [Domain Warming Best Practices 2026 (MailForge)](https://www.mailforge.ai/blog/domain-warming-best-practices) -- warm-up schedule, new domain penalty
- [Email Warm-Up Guide 2025 (Skylead)](https://skylead.io/blog/how-to-warm-up-email-domain/) -- week-by-week volume plan
- [SPF DKIM DMARC Explained 2026](https://skynethosting.net/blog/spf-dkim-dmarc-explained-2026/) -- DNS record setup
- [Resend SPF DKIM DMARC Configuration](https://dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records/) -- Resend-specific DNS setup

### Disposable Email Blocking
- [Block-Disposable-Email.com](https://www.block-disposable-email.com/cms/) -- 188,384 blocked domains
- [disposable-email-domains (GitHub)](https://github.com/disposable-email-domains/disposable-email-domains) -- community-maintained blocklist
- [IPQualityScore Disposable Email Detection](https://www.ipqualityscore.com/features/block-disposable-emails) -- commercial blocking service

### Web Crypto API & Browser Security
- [SubtleCrypto (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) -- misuse warnings, secure context requirement
- [Web Crypto API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) -- algorithm support, compatibility
- [Web Cryptography (Can I Use)](https://caniuse.com/cryptography) -- browser support matrix
- [Saving Web Crypto Keys in IndexedDB (GitHub)](https://gist.github.com/saulshanabrook/b74984677bccd08b028b30d9968623f5) -- key persistence patterns
- [Storing Cryptographic Keys in Persistent Browser Storage (Pomcor)](https://pomcor.com/2017/06/02/keys-in-browser/) -- non-extractable keys, binding concerns
- [Encrypting Offline Storage for Local-First Apps (Browsertech)](https://digest.browsertech.com/archive/browsertech-digest-encrypting-offline-storage-for/) -- cookie-based key storage, missing APIs

### Email Relay Security
- [Mail Relay Server Security (DuoCircle)](https://www.duocircle.com/email-security/mail-relay-server-security-preventing-spam-and-unauthorized-access) -- abuse prevention strategies
- [Open Mail Relay (Wikipedia)](https://en.wikipedia.org/wiki/Open_mail_relay) -- historical risks, <1% remain today
- [SMTP Open Relay Vulnerabilities (DuoCircle)](https://www.duocircle.com/email-security/smtp-open-relay-vulnerabilities-how-to-prevent-security-breaches) -- rate limiting, content filtering

### GDPR & Identity Verification
- [GDPR Recital 64 (Identity Verification)](https://gdpr-info.eu/recitals/no-64/) -- proportionate verification requirement
- [Identity Verification for DSARs (IAPP)](https://iapp.org/news/a/how-to-verify-identity-of-data-subjects-for-dsars-under-the-gdpr) -- cannot use verification as barrier
- [Non-Compliant Data Brokers (Privacy Bee)](https://support.privacybee.com/en-us/article/understanding-non-compliant-data-brokers-when-opt-outs-are-ignored-pujzx6/) -- excessive verification as delay tactic
