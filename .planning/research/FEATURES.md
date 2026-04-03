# Feature Landscape: v2.0 Relay-Based Email Architecture

**Domain:** GDPR data erasure automation -- relay-based automated email sending
**Researched:** 2026-04-01
**Milestone:** v2.0 (builds on completed v1.0: app shell, identity input, broker database, email templates, status tracking)

## Context: What v1.0 Already Delivers

The following are BUILT and SHIPPED. This document does NOT re-evaluate them -- it only covers new v2.0 features.

| Built Feature | Phase | Status |
|---------------|-------|--------|
| Preact + HTM app shell, two-mode dev/build | Phase 1 | Complete |
| Identity input (name, emails, optional phone/address) | Phase 2 | Complete |
| Save/load campaign to local JSON file | Phase 2 | Complete |
| Broker database (169 brokers, search, filter, select) | Phase 3 | Complete |
| Region-aware GDPR/UK-GDPR/CCPA email templates | Phase 4 | Complete |
| Template preview sidebar with copy-to-clipboard | Phase 4 | Complete |
| Per-broker status tracking (lifecycle states) | Phase 5 | In progress |
| Campaign dashboard with aggregate stats | Phase 5 | In progress |
| Demo mode for exploring the app without real data | Quick task | Complete |

v2.0 replaces the `mailto:` sending model (user's email client opens per broker) with fully automated relay-based sending from temporary `@erasurekit.uk` addresses.

---

## Table Stakes

Features users will expect from a relay-based automated sender. Missing any of these makes the relay architecture feel broken or untrustworthy.

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| 1 | **"Send All" one-click dispatch** | Core value prop of the relay upgrade. Users selected 169 brokers -- they expect one button, not 169 clicks. Every commercial competitor (Incogni, DeleteMe) sends everything automatically. | Med | Broker selections (Phase 3), templates (Phase 4), relay worker | Dispatches all selected brokers to the relay worker. Must handle partial failures gracefully. Queue locally, POST to worker endpoint. |
| 2 | **Temporary email address per campaign** | The relay's purpose is hiding real email. User must see their assigned `a7k9x@erasurekit.uk` address and understand brokers will respond there. | Low | Relay worker | Worker generates random 5-char prefix. Address shown prominently in UI before sending starts. |
| 3 | **Quota-aware batch scheduling** | Resend free tier caps at 100 emails/day, 3,000/month. With 169 brokers, sending takes 2+ days. Users must know this BEFORE clicking Send All, not discover it via cryptic errors. | Med | Resend API limits, send queue | Calculate batches: ceil(selectedCount / dailyQuota). Show "Day 1: brokers 1-100, Day 2: brokers 101-169" schedule before user commits. |
| 4 | **Batch progress visualization** | Users need to see what sent today, what sends tomorrow, what failed. Email marketing tools (HighLevel, SiteGround, Mautic) all show per-batch status with sent/pending/failed counts. | Med | Send queue, status tracker | Status per batch-day: scheduled / in-progress / complete / partial-failure. Per-broker within batch: queued / sending / sent / failed / retrying. |
| 5 | **Campaign resume across sessions** | User closes browser after Day 1 batch. Returns tomorrow. Remaining batches must pick up automatically or with a "Resume" button. Campaign state persists in the local JSON save file. | Med | Save/load (Phase 2), send queue | Store queue state (which brokers sent, which pending, which day) in campaign JSON. On reload, detect incomplete campaign and offer resume. |
| 6 | **Send confirmation with receipt** | After each batch completes, user needs proof: "100 emails sent at 14:32 UTC via relay-a.erasurekit.uk". Trust requires transparency. | Low | Relay worker response | Worker returns per-email status (messageId from Resend, or error). Store in campaign JSON alongside broker status. |
| 7 | **Error handling with retry** | Emails fail: Resend rate limits, network issues, invalid broker addresses, bounce-backs. Users expect the system to retry intelligently, not silently drop. | Med | Relay worker, Resend API | Retry failed sends up to 3 times with exponential backoff. Mark as permanently failed after 3 attempts. Show clear error reason in UI. |
| 8 | **Automatic reply monitoring** | Brokers reply to the temp address. User needs to see responses in-app without checking an external inbox. Cloudflare Email Routing can receive and route to a Worker. | High | CF Email Routing, E2E encryption, KV storage | Email Worker receives inbound, encrypts with user's public key, stores in KV. Client polls for new messages, decrypts locally. |
| 9 | **30-day compliance deadline tracking** | Already partially built in Phase 5 (status tracking). Must integrate with relay: deadline countdown starts from actual send timestamp returned by the relay, not from when user clicked Send. | Low | Phase 5 status tracker, relay send timestamps | Use the relay's confirmed send timestamp (from Resend API response) as the deadline start, not the local click time. |
| 10 | **Dashboard stats update** | Already partially built in Phase 5. Must reflect relay states: queued, scheduled, sending, sent, awaiting-response, responded, overdue, completed. | Low | Phase 5 dashboard | Add new states for queued/scheduled. Dashboard counters must handle multi-day campaigns where some brokers are still waiting to be sent. |

---

## Differentiators

Features that elevate ErasureKit from "email sender with relay" to a genuinely novel privacy tool. Not expected, but create significant user trust and competitive advantage.

| # | Feature | Value Proposition | Complexity | Dependencies | Notes |
|---|---------|-------------------|------------|--------------|-------|
| 1 | **End-to-end encryption** | Domain owner (the developer running the relay) cannot read user emails. No other open-source erasure tool offers this. Zero-access architecture like Proton Mail, but for a relay. User's browser generates keypair via Web Crypto API; public key sent to worker; all stored responses encrypted before storage. | High | Web Crypto API (SubtleCrypto), CF KV, relay worker | Use ECDH P-256 for key agreement + AES-256-GCM for payload encryption. Browser generates keypair, stores private key in IndexedDB + exports to campaign JSON. Public key registered with relay worker. Worker encrypts inbound emails before KV storage. Only the user's browser can decrypt. |
| 2 | **Calendar UI for batch schedule** | Most tools show a flat progress bar. ErasureKit shows a mini calendar grid: "Mon: 100 brokers (sent), Tue: 69 brokers (scheduled), Wed: reserve day". Gantt-style timeline borrowed from project management (Asana, Monday.com). Visual and intuitive. | Med | Batch scheduler, date-fns | Simple month-grid component. Each day cell shows: count of brokers, status color (green=sent, blue=scheduled, gray=empty). Click day to see broker list for that batch. Not a full calendar component -- just a styled grid. |
| 3 | **Relay health monitoring** | User sees live relay status: "erasurekit.uk: healthy, 73/100 daily quota used". If relay is down or quota exhausted, user knows immediately. Builds trust through transparency. | Low | Relay worker health endpoint | Worker exposes `/health` endpoint returning: relay domain, daily sends remaining, monthly sends remaining, uptime. Client polls every 60s during active campaign. |
| 4 | **Contributor relay registry** | Scale beyond one domain. Contributors donate $2/year domains (e.g., `erasure-helper.uk`), each adding 3,000 emails/month. Registry distributes load across available relays. No competitor has community-powered infrastructure scaling. | High | Multi-domain Resend config, registry API, load balancer | Registry: JSON file or KV-stored list of relay domains with their Resend API keys, current quota usage, health status. Load balancer picks least-loaded relay. Contributor onboards by: buying domain, adding CF Email Routing + Resend, submitting PR to registry. |
| 5 | **Contributor donation/onboarding flow** | Clear, welcoming flow for contributors to add relay capacity. "Donate a domain" page with step-by-step guide: buy domain, configure Cloudflare, add Resend, submit PR. Shows community impact: "12 relays serving 36,000 emails/month". | Med | GitHub workflow, documentation | Not a payment processing flow -- contributor buys their own domain independently. The "donation" is the domain + $5.30/year cost. Onboarding page is instructional content with verification checklist. |
| 6 | **Privacy transparency page** | Full architecture explanation: "How ErasureKit protects your privacy" with diagrams showing data flow, encryption points, what the relay sees vs. cannot see. Progressive disclosure: simple version for normal users, technical deep-dive for curious ones. Mozilla Firefox, Signal, and Proton Mail all use this pattern to build trust. | Low | Static content | Three layers: (1) TL;DR -- "Your real email is never shared. Broker responses are encrypted." (2) How it works -- data flow diagram with numbered steps. (3) Technical details -- algorithms, key management, what's stored where, threat model. Link to open-source code. |
| 7 | **Automatic response classification** | Parse broker replies: "confirmed deletion" vs "need more info" vs "rejected" vs "auto-reply". Saves users from reading 169 emails. Use keyword/pattern matching -- no AI needed. | Med | Reply monitoring, response parser | Heuristic classifier: scan subject + body for patterns. "completed" / "deleted" / "removed" -> confirmed. "verify" / "ID" / "proof" -> needs_verification. "unable" / "cannot" / "denied" -> rejected. "out of office" / "automatic reply" -> auto_reply. Store classification in campaign JSON. |
| 8 | **Relay usage transparency** | Show users exactly how the relay infrastructure works: "Your email was sent from relay-a.erasurekit.uk via Resend (eu-west-1). The relay cannot read your email because [E2E encryption explanation]." Per-email transparency, not just a generic about page. | Low | Send receipt data | Each sent email gets a transparency card: relay domain used, Resend region, encryption status, relay operator (if contributed domain). Accessible from the broker detail view. |

---

## Anti-Features

Features to explicitly NOT build for v2.0. These are tempting but would compromise the project's values, add unjustified complexity, or exceed free-tier constraints.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time WebSocket push for responses** | Adds persistent connection complexity. CF Workers free tier has no WebSocket support. KV polling is simpler and sufficient -- broker responses come over days, not seconds. | Poll relay health endpoint every 60s during active sessions. Check for new replies every 5 minutes. Show "last checked: 2 min ago" timestamp. |
| **User-managed relay infrastructure** | Asking every user to set up their own Cloudflare Worker + Resend + domain is a non-starter. The whole point is one-click simplicity. Self-hosting option can exist for power users, but must not be required. | Default: use project-managed relay. Power users: document self-hosting as an advanced option in a separate guide. |
| **Payment processing for contributor domains** | ErasureKit should not handle money. No Stripe integration, no payment forms. Contributors buy their own domains -- the cost ($2-5/year) is trivially small. | "Donate a domain" guide with instructions. Link to Cloudflare Registrar. No money flows through ErasureKit. |
| **Guaranteed email delivery SLA** | Free-tier Resend has no SLA. New domains face deliverability challenges (30% penalty vs mature domains). Making promises about delivery rates creates liability. | Be transparent: "Emails are sent on a best-effort basis using industry-standard SPF/DKIM/DMARC authentication. Some brokers may filter or delay emails from new domains." Show delivery status per broker. |
| **Broker auto-discovery / web scraping** | Automatically finding new brokers via web scraping is fragile, legally uncertain, and a maintenance burden. | Community-maintained `brokers.json` via GitHub PRs. Static, versioned, reviewed by humans. |
| **Mobile push notifications** | Requires service worker registration, push API setup, and a notification server. Overkill for a tool that runs for a few days then is done. | In-app notification bell (already built in v1.0). Browser Notification API for background tab alerts. |
| **Email threading / conversation view** | Building a full email client UI for broker response threads is scope creep. Users need to read responses, not manage an inbox. | Show latest reply per broker as a single card. If broker sends multiple replies, show them in chronological list. No threading, no reply drafting. |
| **Automated follow-up sending via relay** | Auto-sending escalation emails to DPAs or overdue brokers is legally sensitive. The user must review and decide. | Generate pre-filled escalation templates (Phase 8). User reviews, then clicks "Send via relay" for each escalation individually. No bulk auto-escalation. |
| **Multi-user / shared campaigns** | No user accounts means no multi-user. Sharing campaign files could expose personal data. | Single-user, single-campaign model. Each campaign JSON file is one person's erasure campaign. |
| **Custom email templates via relay** | Allowing users to send arbitrary email content through the relay creates abuse potential (spam, phishing). | Relay only sends ErasureKit-generated GDPR templates. Worker validates template hash/structure before sending. |

---

## Feature Dependencies (v2.0 Specific)

```
[EXISTING: Identity + Brokers + Templates]
          |
          v
Temporary Email Address Generation (relay assigns @erasurekit.uk)
          |
          v
E2E Encryption Keypair (browser generates, public key sent to relay)
          |
          v
"Send All" Dispatch ──> Quota-Aware Batch Scheduler
          |                        |
          v                        v
Send Queue (local) ──> Calendar UI (batch visualization)
          |
          v
Relay Worker Sends (Resend API) ──> Send Receipts
          |                                |
          v                                v
Batch Progress Tracking ──> Dashboard Stats Update
          |
          v
Reply Monitoring (CF Email Routing ──> Worker ──> KV)
          |
          v
Response Decryption (browser, private key)
          |
          v
Automatic Response Classification
          |
          v
30-Day Deadline Tracking (from actual send timestamp)
          |
          v
[FUTURE: Phase 8 Escalation Templates via relay]

PARALLEL (no dependencies on send flow):
  Privacy Transparency Page ──> (standalone static content)
  Relay Health Monitoring ──> (relay /health endpoint)
  Contributor Donation Flow ──> Relay Registry ──> Load Balancer
```

### Critical Path (Minimum Viable Relay)

The absolute minimum to ship v2.0:

1. **Cloudflare Worker relay** -- send emails via Resend API
2. **Temp email assignment** -- random `@erasurekit.uk` address per campaign
3. **"Send All" dispatch** -- POST selected brokers to relay
4. **Batch scheduling** -- split across days respecting 100/day Resend limit
5. **Send receipt + status update** -- confirm what was sent
6. **Campaign resume** -- persist queue state in local JSON

Everything else (E2E encryption, reply monitoring, calendar UI, contributor registry, privacy page) builds on this foundation.

### Complexity Budget

| Feature Group | Estimated Complexity | Risk Level |
|---------------|---------------------|------------|
| Relay worker (send via Resend) | Medium | Low -- well-documented, official tutorials exist |
| Batch scheduler + queue | Medium | Low -- arithmetic + state management |
| Calendar/progress UI | Medium | Low -- UI component, no external dependencies |
| E2E encryption (Web Crypto) | High | Medium -- crypto is easy to get wrong, key management is the hard part |
| Reply monitoring (CF Email Routing) | High | Medium -- inbound email processing, parsing, storage |
| Response classification | Medium | Low -- keyword heuristics, no ML needed |
| Contributor relay registry | High | Medium -- multi-domain coordination, load balancing, trust model |
| Privacy transparency page | Low | Very Low -- static content |
| Contributor onboarding | Medium | Low -- documentation + verification |

---

## MVP Recommendation for v2.0

### Must ship (Core Relay):

1. **Cloudflare Worker relay** with Resend integration (table stakes -- the entire milestone depends on this)
2. **"Send All" one-click dispatch** with batch scheduling across days (table stakes)
3. **Batch progress visualization** showing sent/pending/failed per day (table stakes)
4. **Campaign resume** -- queued emails persist and pick up on reload (table stakes)
5. **Send receipts** with relay transparency (table stakes)
6. **Error handling with retry** (table stakes)
7. **30-day deadline from actual send timestamp** (table stakes -- integrates with existing Phase 5)

### Should ship (Trust Layer):

8. **E2E encryption** -- browser keypair, relay cannot read responses (differentiator -- core privacy promise)
9. **Reply monitoring** via Cloudflare Email Routing (differentiator -- closes the feedback loop)
10. **Privacy transparency page** (differentiator -- builds trust, low effort)
11. **Relay health monitoring** (differentiator -- low effort, high trust impact)

### Defer to v2.1+:

12. **Calendar UI** for batch schedule (differentiator -- nice but a simple list/progress bar works for v2.0)
13. **Automatic response classification** (differentiator -- can be added after reply monitoring works)
14. **Contributor relay registry** (differentiator -- premature until primary relay is proven in production)
15. **Contributor donation/onboarding flow** (differentiator -- depends on registry)

### Rationale:

- **Core Relay** delivers the fundamental upgrade: automated sending that works. Without this, nothing else matters.
- **Trust Layer** is what makes users comfortable sending personal data through someone else's infrastructure. E2E encryption is not optional for a privacy tool -- it IS the privacy tool.
- **Deferred features** are genuine enhancements but can ship incrementally. The calendar UI is cosmetic polish over a working progress tracker. The contributor registry requires production experience to design correctly.

---

## Competitive Positioning Update (v2.0)

| Capability | ErasureKit v1.0 | ErasureKit v2.0 | data-eraser | Incogni | DeleteMe |
|-----------|----------------|----------------|-------------|---------|----------|
| **Automated sending** | No (mailto:) | Yes (relay) | Yes (Gmail) | Yes | Yes |
| **Real email protected** | No | Yes (temp @erasurekit.uk) | No (your Gmail) | Yes (proxy) | Yes (proxy) |
| **E2E encrypted responses** | N/A | Yes (Web Crypto) | No | Unknown | Unknown |
| **Domain owner can't read** | N/A | Yes (zero-access) | N/A (your account) | Unknown | Unknown |
| **Open source relay** | N/A | Yes | No | No | No |
| **Community-scalable infra** | N/A | Yes (donated domains) | No | No | No |
| **Batch schedule visibility** | N/A | Yes (calendar/progress) | No | No | No |
| **Free** | Yes | Yes | Yes | $96/yr | $129/yr |
| **Portable / no server needed** | Yes | Yes (relay is optional infra) | No (needs Gmail) | No (SaaS) | No (SaaS) |

v2.0 puts ErasureKit in a unique position: the only tool with **automated sending + E2E encrypted relay + zero-access architecture + community-scalable infrastructure + completely free and open source**.

---

## Infrastructure Constraints Affecting Features

These constraints directly shape what features are feasible and how they must be designed.

| Constraint | Limit | Impact on Features |
|------------|-------|--------------------|
| Resend free tier: 100 emails/day | Hard daily cap | Batch scheduling is mandatory, not optional. 169 brokers = 2 days minimum. |
| Resend free tier: 3,000 emails/month | Monthly cap | At full broker list, supports ~17 full campaigns/month on one domain. Contributor relay registry becomes important at scale. |
| Resend API: 5 req/sec | Rate limit | Batch API (100 emails/call) helps. No risk of hitting this with daily cap of 100 total. |
| Resend batch API: 100 per call | Per-request limit | Convenient: one API call per day's batch. Aligns perfectly with daily quota. |
| Cloudflare KV free: 100K reads/day | Generous for reads | Reply polling every 5 min = ~288 reads/day per user. Supports hundreds of concurrent users. |
| Cloudflare KV free: 1K writes/day | Tight for writes | Each inbound email = 1 write. 1,000 broker replies/day across all users is the limit. Fine for early scale. |
| Cloudflare KV free: 1 GB storage | Storage cap | Encrypted email bodies are small (1-5 KB each). 1 GB = ~200K-1M stored replies. More than sufficient. |
| Cloudflare Workers free: 100K req/day | Request cap | Each send = 1 request. Each health check = 1 request. Each reply poll = 1 request. 100K is generous. |
| Cloudflare Workers free: 10ms CPU/req | CPU time limit | Email send via fetch() is I/O-bound, not CPU-bound. 10ms CPU is sufficient. Encryption adds ~1ms CPU. |
| New domain deliverability penalty | ~30% lower inbox rate vs mature domains | Domain warm-up period needed. Start with small test sends before "Send All" goes live. Document expected deliverability. |
| Resend bounce rate: under 4% | Account health requirement | Broker emails are verified addresses (from curated database). Bounce rate should be low. Monitor and remove bouncing brokers. |

---

## Sources

### Relay Architecture
- [Cloudflare Workers + Resend tutorial](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/)
- [Resend: Send with Cloudflare Workers](https://resend.com/docs/send-with-cloudflare-workers)
- [Cloudflare Queues: batching, retries, delays](https://developers.cloudflare.com/queues/configuration/batching-retries/)
- [Cloudflare Email Service private beta (2025)](https://blog.cloudflare.com/email-service/)

### Rate Limits and Quotas
- [Resend account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
- [Resend API rate limit changelog](https://resend.com/changelog/api-rate-limit)
- [Resend pricing](https://resend.com/pricing)
- [Cloudflare KV pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [Cloudflare KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### Email Deliverability
- [Domain warm-up best practices 2025 (PrimeForge)](https://www.primeforge.ai/blog/best-practices-for-warming-up-domains-in-2025)
- [Domain warm-up best practices 2025 (Salesforge)](https://www.salesforge.ai/blog/best-practices-for-domain-warm-up-in-2025)
- [B2B email deliverability benchmarks 2025](https://thedigitalbloom.com/learn/b2b-email-deliverability-benchmarks-2025/)
- [Google sender compliance enforcement (Valimail)](https://www.valimail.com/blog/google-email-compliance-enforcement/)

### Reply Monitoring
- [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/email-workers/)
- [Cloudflare Email Routing overview](https://developers.cloudflare.com/email-routing/)
- [Process incoming emails with CF Workers (dev.to)](https://dev.to/elvisans/how-to-process-incoming-emails-and-trigger-webhooks-in-app-actions-and-more-using-cloudflare-5d07)

### E2E Encryption
- [SubtleCrypto generateKey (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey)
- [Web Crypto API keypair generation (dev.to)](https://dev.to/jrgould/use-the-web-crypto-api-to-generate-a-public-private-key-pair-for-end-to-end-asymmetric-cryptography-on-the-web-2mpe)
- [Mailfence browser-based encryption](https://mailfence.com)
- [Proton Mail zero-access architecture](https://proton.me/)

### Batch UX Patterns
- [Calendar UI examples and UX tips (Eleken)](https://www.eleken.co/blog-posts/calendar-ui)
- [Batch scheduling patterns (OneUptime)](https://oneuptime.com/blog/post/2026-01-30-batch-processing-scheduling-patterns/view)
- [HighLevel: batch schedule email campaigns](https://help.gohighlevel.com/support/solutions/articles/48001215379-how-to-schedule-batch-email-campaign-s-)
- [HighLevel: email campaign statuses](https://help.gohighlevel.com/support/solutions/articles/155000006659-understanding-email-campaign-statuses)

### Privacy UX
- [Privacy-First UX and Design Systems (Medium)](https://medium.com/@harsh.mudgal_27075/privacy-first-ux-design-systems-for-trust-9f727f69a050)
- [Designing Trust: Security and Privacy as Core UX Principles (Medium)](https://medium.com/design-bootcamp/designing-trust-security-and-privacy-as-core-ux-principles-71834eca216c)
- [Privacy by Design in AI UX (DeveloperUX)](https://developerux.com/2025/04/09/privacy-by-design-in-ai-ux/)

### Contributor/Donation Patterns
- [Open Source Collective](https://oscollective.org/)
- [Funding open source projects guide (Sealos)](https://sealos.io/blog/funding-open-source/)
- [Open source funding platforms (ItsFOSS)](https://itsfoss.com/open-source-funding-platforms/)

### Competitor Landscape
- [Consumer Reports automated deletion tool](https://innovation.consumerreports.org/new-open-source-project-automates-data-deletion-requests-by-email/)
- [Resend pricing guide 2025 (Flexprice)](https://flexprice.io/blog/detailed-resend-pricing-guide)
- [Mastering email rate limits with Resend (Dale Nguyen)](https://dalenguyen.me/blog/2025-09-07-mastering-email-rate-limits-resend-api-cloud-run-debugging)
