# Requirements: ErasureKit

**Defined:** 2026-03-28
**Core Value:** One-click automated data erasure across all known brokers without exposing the user's real email address.

## v1.0 Requirements (Shipped)

Requirements delivered in v1.0. All complete.

### Distribution

- [x] **DIST-01**: App builds to a single portable HTML file via Vite + vite-plugin-singlefile
- [x] **DIST-02**: App works in development mode with zero build step (CDN-loaded modules, open index.html directly)
- [x] **DIST-03**: `brokers.json` is a standalone file that can be updated independently of the app

### Identity Input

- [x] **IDEN-01**: User enters their full name (required for GDPR requests)
- [x] **IDEN-02**: User enters one or more email addresses they want erased from broker records
- [x] **IDEN-03**: User can optionally provide phone number and postal address for more thorough data matching
- [x] **IDEN-04**: Identity data is stored only locally -- never transmitted to any server other than the email send

### Persistence

- [x] **PERS-01**: User can save full campaign state (identity, broker statuses, temp email credentials, messages, deadlines) to a local JSON file via File System API
- [x] **PERS-02**: User can load a previously saved campaign file to resume progress
- [x] **PERS-03**: App falls back to download/upload JSON for browsers without File System API (Firefox, Safari)
- [x] **PERS-04**: App auto-saves to localStorage as a secondary cache to prevent data loss between explicit saves

### Broker Database

- [x] **BRKR-01**: App loads broker data from a separate `brokers.json` file that users can view and edit independently
- [x] **BRKR-02**: Broker database contains 100+ entries compiled from open-source GitHub lists (BADBOOL, JustVanish, data-eraser, Vermont/CA registries, datarequests.org)
- [x] **BRKR-03**: Each broker entry includes: name, email, region, type/category, privacy portal URL, legal framework (GDPR/UK-GDPR/CCPA), and notes
- [x] **BRKR-04**: User can search and filter brokers by name, region, and category
- [x] **BRKR-05**: User can select/deselect individual brokers or bulk-select by region/category
- [x] **BRKR-06**: Broker database includes a `tempEmailAccepted` field indicating whether the broker is known to block disposable email addresses

### Email Templates

- [x] **TMPL-01**: App generates legally accurate GDPR Article 17 erasure request emails citing Art. 17(1), Art. 19 (third-party notification), Art. 12(3) (response deadline), and Art. 12(4) (refusal explanation)
- [x] **TMPL-02**: Templates are region-aware: strict GDPR for EU/EEA brokers, UK GDPR for UK brokers, CCPA/broader for US brokers
- [x] **TMPL-03**: Templates use correct legal terminology: "one calendar month" (not "30 days") for response deadline
- [x] **TMPL-04**: Templates include user's identity information (name + email addresses to erase) as provided in identity input
- [x] **TMPL-05**: User can preview the generated email text before sending
- [x] **TMPL-06**: User can copy email text to clipboard as fallback when mailto: is impractical

## v2.0 Requirements (Active -- Relay-Based Email Architecture)

Requirements for the relay-based sending system. Each maps to roadmap phases 5-10.

### Relay Infrastructure

- [ ] **RELAY-01**: Cloudflare Worker deployed at api.erasurekit.uk accepts encrypted email payloads and sends them via Resend API from generated @erasurekit.uk addresses
- [ ] **RELAY-02**: Each campaign gets a unique temporary sender address (e.g. a7k9x@erasurekit.uk) that persists across the campaign session
- [ ] **RELAY-03**: Worker returns structured JSON responses (success/failure per broker, quota remaining, error details) for frontend consumption
- [ ] **RELAY-04**: "Send All" button dispatches all selected brokers' erasure requests in automated sequence through the relay
- [ ] **RELAY-05**: Frontend email-sender module calls the Worker relay API instead of opening mailto: links

### End-to-End Encryption

- [x] **E2EE-01**: User's browser generates a Web Crypto API key pair; only the browser holds the private decryption key
- [x] **E2EE-02**: All email content (template body, identity data, broker replies) is encrypted before leaving the browser -- the Worker and domain owner cannot decrypt it

### Reply Monitoring

- [ ] **RPLY-01**: Cloudflare Email Routing delivers broker reply emails to the Worker, which stores encrypted reply content in Cloudflare KV
- [ ] **RPLY-02**: Frontend polls or checks for new replies and displays them in-app with broker name, date, and classified response type
- [ ] **RPLY-03**: Broker responses are automatically classified as: confirmed deletion, rejection, request for more info, auto-reply, or unclassified
- [ ] **RPLY-04**: Broker campaign status updates automatically based on response classification (confirmed/rejected/needs-info)

### Batching and Scheduling

- [ ] **BATCH-01**: When selected brokers exceed daily quota (100/day free tier), app shows a calendar UI with daily batches and estimated send dates
- [ ] **BATCH-02**: Queued emails automatically resume sending when the user reopens the app (campaign resume across sessions)
- [ ] **BATCH-03**: App displays remaining daily quota, next batch time, and allows manual batch priority adjustment

### Contributor Scaling

- [ ] **SCALE-01**: Worker maintains a relay registry of available domains and load-balances sends across them to maximize throughput
- [ ] **SCALE-02**: Contributor page explains the $2/year domain donation process with step-by-step DNS and Resend setup instructions
- [ ] **SCALE-03**: New domains added to the registry are automatically included in load balancing rotation
- [ ] **SCALE-04**: About page displays current relay network capacity (total domains, monthly quota, usage percentage)

### Status Tracking

- [ ] **STAT-01**: Each broker has a tracked status: not selected -> selected -> awaiting response -> confirmed / rejected / escalated / overdue
- [ ] **STAT-02**: App calculates "one calendar month" deadline from send date using proper date arithmetic (not naive +30 days)
- [ ] **STAT-03**: App flags brokers as overdue when they exceed the calendar-month deadline
- [x] **STAT-04**: Dashboard shows aggregate stats: total brokers, selected, sent, awaiting, confirmed, rejected, overdue *(infrastructure built in v1.0 Phase 5)*
- [x] **STAT-05**: Dashboard shows overall campaign progress as a percentage *(infrastructure built in v1.0 Phase 5)*

### Escalation

- [ ] **ESCL-01**: App generates follow-up warning emails for overdue brokers citing original request date and elapsed time, sent through the relay
- [ ] **ESCL-02**: App generates DPA complaint letter templates pre-filled with broker name, original request date, and relevant national DPA contact
- [ ] **ESCL-03**: User is notified when any broker becomes overdue with a clear "Escalate" action

### Legal Reference

- [ ] **LEGL-01**: App includes a dedicated page with full GDPR Article 17 text alongside plain-English explanations
- [ ] **LEGL-02**: App includes an identity verification guide: what brokers can legally ask for, what is disproportionate under Art. 12(6), and template pushback responses
- [ ] **LEGL-03**: App includes a DPA directory with all 30+ EU/EEA Data Protection Authorities and UK ICO, including name, website, and complaint form URL
- [ ] **LEGL-04**: App includes escalation templates: follow-up warning, formal DPA complaint letter, identity verification pushback response

### Privacy Transparency

- [ ] **PRVCY-01**: About page explains the full relay architecture, E2E encryption model, temp address lifecycle, and what data the domain owner can and cannot access

## Deferred (Future)

Tracked but not in current roadmap.

### Community

- **COMM-01**: Version check against GitHub to notify users of new broker database updates
- **COMM-02**: "Refresh broker list" button to pull latest brokers.json from GitHub raw URL
- **COMM-03**: Community broker-reporting mechanism (flag broken links/emails)

### Internationalization

- **I18N-01**: i18n framework for community-contributed translations
- **I18N-02**: Auto-detect browser language and serve matching translation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Defeats privacy-first, zero-tracking philosophy. No server = no accounts. |
| Cloud storage / syncing | Creates server dependency, breach target. Contradicts "portable" design. |
| Hosted SaaS deployment | Distribution is portable file, not a hosted service. |
| Automated DPA complaint filing | Legal processes vary by country. Auto-filing could create legal liability. |
| Sending from user's real email | Core value is protecting real email. Temp relay address is the point. |
| Browser extension | Adds distribution complexity, store review processes. |
| Dark web monitoring | Feature creep into security suite territory. |
| Recurring removal cycles | Requires persistent infrastructure (server, scheduler). Users re-run manually. |
| People-search site scanning | Requires web scraping, CAPTCHA solving, constant maintenance. |
| Native desktop app | Portable web app covers the use case with zero install friction. |
| Multi-language (v2) | Ship relay architecture first. i18n-ready patterns for community contributions later. |
| mailto: links | Superseded by relay-based sending in v2.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DIST-01 | Phase 1: App Shell and Distribution | Complete |
| DIST-02 | Phase 1: App Shell and Distribution | Complete |
| DIST-03 | Phase 1: App Shell and Distribution | Complete |
| IDEN-01 | Phase 2: Identity Input and Persistence | Complete |
| IDEN-02 | Phase 2: Identity Input and Persistence | Complete |
| IDEN-03 | Phase 2: Identity Input and Persistence | Complete |
| IDEN-04 | Phase 2: Identity Input and Persistence | Complete |
| PERS-01 | Phase 2: Identity Input and Persistence | Complete |
| PERS-02 | Phase 2: Identity Input and Persistence | Complete |
| PERS-03 | Phase 2: Identity Input and Persistence | Complete |
| PERS-04 | Phase 2: Identity Input and Persistence | Complete |
| BRKR-01 | Phase 3: Broker Database | Complete |
| BRKR-02 | Phase 3: Broker Database | Complete |
| BRKR-03 | Phase 3: Broker Database | Complete |
| BRKR-04 | Phase 3: Broker Database | Complete |
| BRKR-05 | Phase 3: Broker Database | Complete |
| BRKR-06 | Phase 3: Broker Database | Complete |
| TMPL-01 | Phase 4: Email Templates | Complete |
| TMPL-02 | Phase 4: Email Templates | Complete |
| TMPL-03 | Phase 4: Email Templates | Complete |
| TMPL-04 | Phase 4: Email Templates | Complete |
| TMPL-05 | Phase 4: Email Templates | Complete |
| TMPL-06 | Phase 4: Email Templates | Complete |
| RELAY-01 | Phase 5: Relay Infrastructure and E2E Encryption | Pending |
| RELAY-02 | Phase 5: Relay Infrastructure and E2E Encryption | Pending |
| RELAY-03 | Phase 5: Relay Infrastructure and E2E Encryption | Pending |
| E2EE-01 | Phase 5: Relay Infrastructure and E2E Encryption | Complete |
| E2EE-02 | Phase 5: Relay Infrastructure and E2E Encryption | Complete |
| RELAY-04 | Phase 6: Frontend Sending Integration | Pending |
| RELAY-05 | Phase 6: Frontend Sending Integration | Pending |
| STAT-01 | Phase 6: Frontend Sending Integration | Pending |
| STAT-02 | Phase 6: Frontend Sending Integration | Pending |
| STAT-03 | Phase 6: Frontend Sending Integration | Pending |
| STAT-04 | Phase 6: Frontend Sending Integration | Complete |
| STAT-05 | Phase 6: Frontend Sending Integration | Complete |
| RPLY-01 | Phase 7: Reply Monitoring and Response Classification | Pending |
| RPLY-02 | Phase 7: Reply Monitoring and Response Classification | Pending |
| RPLY-03 | Phase 7: Reply Monitoring and Response Classification | Pending |
| RPLY-04 | Phase 7: Reply Monitoring and Response Classification | Pending |
| BATCH-01 | Phase 8: Quota-Aware Batching and Campaign Resume | Pending |
| BATCH-02 | Phase 8: Quota-Aware Batching and Campaign Resume | Pending |
| BATCH-03 | Phase 8: Quota-Aware Batching and Campaign Resume | Pending |
| SCALE-01 | Phase 9: Contributor Scaling and Relay Registry | Pending |
| SCALE-02 | Phase 9: Contributor Scaling and Relay Registry | Pending |
| SCALE-03 | Phase 9: Contributor Scaling and Relay Registry | Pending |
| SCALE-04 | Phase 9: Contributor Scaling and Relay Registry | Pending |
| LEGL-01 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| LEGL-02 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| LEGL-03 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| LEGL-04 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| ESCL-01 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| ESCL-02 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| ESCL-03 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |
| PRVCY-01 | Phase 10: Legal Reference, Escalation, and Privacy Transparency | Pending |

**Coverage:**
- v1.0 requirements: 23 total (all complete)
- v2.0 requirements: 27 total (0 complete, 2 partially built)
- Total mapped: 50/50
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-04-03 after v2.0 roadmap creation (10 phases)*
