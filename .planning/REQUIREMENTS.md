# Requirements: ErasureKit

**Defined:** 2026-03-28
**Core Value:** One-click automated data erasure across all known brokers without exposing the user's real email address.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

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

### Sending

- [ ] **SEND-01**: App sends erasure requests via `mailto:` links that open the user's default email client with pre-filled subject, recipient, and body
- [ ] **SEND-02**: User can batch-send to all selected brokers via sequential mailto: link activation
- [ ] **SEND-03**: After each send, user confirms the email was sent and broker status updates to "sent"
- [ ] **SEND-04**: App handles mailto: URL length limits — if template exceeds ~2000 chars, automatically falls back to clipboard copy with instructions

### Temp Email Monitoring

- [ ] **TEMP-01**: App creates a temporary email inbox via mail.tm API for monitoring broker responses
- [ ] **TEMP-02**: User can include the temp email address in their erasure request as a "respond to" contact address
- [ ] **TEMP-03**: App polls the temp inbox for new messages and displays them in-app
- [ ] **TEMP-04**: App caches all fetched messages locally (mail.tm has 7-day server retention)
- [ ] **TEMP-05**: App classifies broker responses using keyword heuristics: confirmed deletion, rejection, request for more info, auto-reply, unclassified
- [ ] **TEMP-06**: User can delete the temp email account when all brokers have responded or campaign is complete
- [ ] **TEMP-07**: App shows mail.tm service health status and gracefully handles API downtime

### Status Tracking

- [ ] **STAT-01**: Each broker has a tracked status: not selected → selected → sent → awaiting response → confirmed / rejected / escalated / overdue
- [ ] **STAT-02**: App calculates "one calendar month" deadline from send date using proper date arithmetic (not naive +30 days)
- [ ] **STAT-03**: App flags brokers as overdue when they exceed the calendar-month deadline
- [ ] **STAT-04**: Dashboard shows aggregate stats: total brokers, selected, sent, awaiting, confirmed, rejected, overdue
- [ ] **STAT-05**: Dashboard shows overall campaign progress as a percentage

### Escalation

- [ ] **ESCL-01**: App generates follow-up warning emails for overdue brokers citing original request date and elapsed time
- [ ] **ESCL-02**: App generates DPA complaint letter templates pre-filled with broker name, original request date, and relevant national DPA contact
- [ ] **ESCL-03**: User is notified when any broker becomes overdue with a clear "Escalate" action

### Legal Reference

- [ ] **LEGL-01**: App includes a dedicated page with full GDPR Article 17 text alongside plain-English explanations
- [ ] **LEGL-02**: App includes an identity verification guide: what brokers can legally ask for, what is disproportionate under Art. 12(6), and template pushback responses
- [ ] **LEGL-03**: App includes a DPA directory with all 30+ EU/EEA Data Protection Authorities and UK ICO, including name, website, and complaint form URL
- [ ] **LEGL-04**: App includes escalation templates: follow-up warning, formal DPA complaint letter, identity verification pushback response

### Persistence

- [x] **PERS-01**: User can save full campaign state (identity, broker statuses, temp email credentials, messages, deadlines) to a local JSON file via File System API
- [x] **PERS-02**: User can load a previously saved campaign file to resume progress
- [x] **PERS-03**: App falls back to download/upload JSON for browsers without File System API (Firefox, Safari)
- [x] **PERS-04**: App auto-saves to localStorage as a secondary cache to prevent data loss between explicit saves

### Identity Input

- [x] **IDEN-01**: User enters their full name (required for GDPR requests)
- [x] **IDEN-02**: User enters one or more email addresses they want erased from broker records
- [x] **IDEN-03**: User can optionally provide phone number and postal address for more thorough data matching
- [x] **IDEN-04**: Identity data is stored only locally — never transmitted to any server other than the email send

### Distribution

- [x] **DIST-01**: App builds to a single portable HTML file via Vite + vite-plugin-singlefile
- [x] **DIST-02**: App works in development mode with zero build step (CDN-loaded modules, open index.html directly)
- [x] **DIST-03**: `brokers.json` is a standalone file that can be updated independently of the app

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Sending

- **ESND-01**: Optional EmailJS integration for true automated bulk sending without manual mailto: interaction (200/month free tier)
- **ESND-02**: Broker-specific sending preferences (some brokers require web form, flagged as "manual action required")

### Community

- **COMM-01**: Version check against GitHub to notify users of new broker database updates
- **COMM-02**: "Refresh broker list" button to pull latest brokers.json from GitHub raw URL
- **COMM-03**: Community broker-reporting mechanism (flag broken links/emails)

### Internationalization

- **I18N-01**: i18n framework for community-contributed translations
- **I18N-02**: Auto-detect browser language and serve matching translation

### Enhanced Monitoring

- **EMON-01**: mail.tm SSE/Mercure real-time push instead of polling
- **EMON-02**: Multiple temp email provider support (mail.gw, guerrillamail as fallbacks)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Defeats privacy-first, zero-tracking philosophy. No server = no accounts. |
| Cloud storage / syncing | Creates server dependency, breach target. Contradicts "portable" design. |
| Hosted SaaS deployment | Distribution is portable file, not a hosted service. |
| Automated DPA complaint filing | Legal processes vary by country. Auto-filing could create legal liability. |
| Sending from user's real email as default | Core value is protecting real email. Temp email is the point. |
| Browser extension | Adds distribution complexity, store review processes. |
| Dark web monitoring | Feature creep into security suite territory. |
| Recurring removal cycles | Requires persistent infrastructure (server, scheduler). Users re-run manually. |
| People-search site scanning | Requires web scraping, CAPTCHA solving, constant maintenance. |
| Native desktop app | Portable web app covers the use case with zero install friction. |
| Multi-language (v1) | Ship fast. i18n-ready patterns for community contributions later. |

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
| SEND-01 | Phase 5: Sending and Status Tracking | Pending |
| SEND-02 | Phase 5: Sending and Status Tracking | Pending |
| SEND-03 | Phase 5: Sending and Status Tracking | Pending |
| SEND-04 | Phase 5: Sending and Status Tracking | Pending |
| STAT-01 | Phase 5: Sending and Status Tracking | Pending |
| STAT-02 | Phase 5: Sending and Status Tracking | Pending |
| STAT-03 | Phase 5: Sending and Status Tracking | Pending |
| STAT-04 | Phase 5: Sending and Status Tracking | Pending |
| STAT-05 | Phase 5: Sending and Status Tracking | Pending |
| TEMP-01 | Phase 6: Temp Email Monitoring | Pending |
| TEMP-02 | Phase 6: Temp Email Monitoring | Pending |
| TEMP-03 | Phase 6: Temp Email Monitoring | Pending |
| TEMP-04 | Phase 6: Temp Email Monitoring | Pending |
| TEMP-05 | Phase 6: Temp Email Monitoring | Pending |
| TEMP-06 | Phase 6: Temp Email Monitoring | Pending |
| TEMP-07 | Phase 6: Temp Email Monitoring | Pending |
| LEGL-01 | Phase 7: Legal Reference | Pending |
| LEGL-02 | Phase 7: Legal Reference | Pending |
| LEGL-03 | Phase 7: Legal Reference | Pending |
| LEGL-04 | Phase 7: Legal Reference | Pending |
| ESCL-01 | Phase 8: Escalation | Pending |
| ESCL-02 | Phase 8: Escalation | Pending |
| ESCL-03 | Phase 8: Escalation | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation (8 phases)*
