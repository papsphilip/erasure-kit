# Roadmap: ErasureKit

## Milestones

- v1.0 App Foundation (Phases 1-4) -- shipped 2026-03-30
- v2.0 Relay-Based Email Architecture (Phases 5-10) -- in progress

## Overview

ErasureKit v1.0 delivered the portable GDPR erasure tool with app shell, identity input, broker database, email templates, status tracking infrastructure, notification system, and a campaign dashboard. v2.0 replaces the mailto: sending path with a fully automated Cloudflare Worker relay that sends emails from temporary @erasurekit.uk addresses via Resend API. The relay architecture follows a strict dependency chain: deploy the Worker with E2E encryption baked in, then wire the frontend to call it, then add reply monitoring, then quota-aware batching with calendar scheduling, then multi-domain contributor scaling, and finally the legal reference and escalation workflows that complete the GDPR enforcement assistant vision.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 App Foundation (Phases 1-4) -- SHIPPED 2026-03-30</summary>

- [x] **Phase 1: App Shell and Distribution** - Validate Preact + HTM + Vite architecture with two-mode dev/build workflow (completed 2026-03-28)
- [x] **Phase 2: Identity Input and Persistence** - Users can enter personal data and save/load campaign progress (completed 2026-03-29)
- [x] **Phase 3: Broker Database** - Users can browse, search, filter, and select data brokers from the compiled database (completed 2026-03-29)
- [x] **Phase 4: Email Templates** - App generates legally accurate, region-aware GDPR erasure request emails (completed 2026-03-30)

</details>

- [ ] **Phase 5: Relay Infrastructure and E2E Encryption** - Deploy Cloudflare Worker that sends emails via Resend from encrypted temp addresses
- [ ] **Phase 6: Frontend Sending Integration** - Replace mailto: with relay-based "Send All" that dispatches requests through the Worker
- [ ] **Phase 7: Reply Monitoring and Response Classification** - Cloudflare Email Routing receives broker replies, Worker classifies and forwards them
- [ ] **Phase 8: Quota-Aware Batching and Campaign Resume** - Calendar UI showing send schedule, quota tracking, session-resumable queued emails
- [ ] **Phase 9: Contributor Scaling and Relay Registry** - Multi-domain relay network with contributor donation flow and load balancing
- [ ] **Phase 10: Legal Reference, Escalation, and Privacy Transparency** - GDPR legal text, DPA directory, escalation templates, and architecture transparency page

## Phase Details

<details>
<summary>v1.0 App Foundation (Phases 1-4) -- SHIPPED 2026-03-30</summary>

### Phase 1: App Shell and Distribution
**Goal**: A working Preact + HTM application that runs in two modes -- zero-build-step development (open index.html directly) and Vite production build (single portable HTML file) -- with the separate brokers.json file loaded at runtime
**Depends on**: Nothing (first phase)
**Requirements**: DIST-01, DIST-02, DIST-03
**Success Criteria** (what must be TRUE):
  1. User can open index.html directly in a browser and see a functioning app shell with navigation (no build step, CDN-loaded modules)
  2. User can run a Vite build that produces a single self-contained HTML file that works identically when double-clicked
  3. The brokers.json file exists as a separate standalone file that loads at runtime in both dev and production modes
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md -- Project scaffolding, Vite config, dev-mode index.html, theme/router/broker-loader libs, distribution assets
- [x] 01-02-PLAN.md -- App shell UI components (Header, Stepper, HamburgerMenu, ThemeToggle, Footer), WelcomeScreen, placeholder pages, root App, build verification
**UI hint**: yes

### Phase 2: Identity Input and Persistence
**Goal**: Users can enter their identity information for GDPR requests and save/load their full campaign state to local files, with data never leaving the browser
**Depends on**: Phase 1
**Requirements**: IDEN-01, IDEN-02, IDEN-03, IDEN-04, PERS-01, PERS-02, PERS-03, PERS-04
**Success Criteria** (what must be TRUE):
  1. User can enter their full name, one or more email addresses to erase, and optionally phone/address
  2. User can save their campaign state (identity + all future data) to a local JSON file and load it back to resume
  3. App gracefully falls back to download/upload JSON in browsers without File System API (Firefox, Safari)
  4. Identity data is stored only in the browser -- inspecting network traffic shows zero outbound transmissions of user data
  5. App auto-saves to localStorage between explicit saves so progress is not lost if the user closes the tab
**Plans:** 3/3 plans complete
Plans:
- [x] 02-01-PLAN.md -- Campaign state module (signal, CRUD helpers, auto-save, file save/load), Vitest config, unit tests
- [x] 02-02-PLAN.md -- Identity form UI (name, multi-email, optional phone/address, validation, Continue button)
- [x] 02-03-PLAN.md -- App shell integration (Header save/load buttons, Footer auto-save indicator, WelcomeScreen resume flow)
**UI hint**: yes

### Phase 3: Broker Database
**Goal**: Users can browse, search, filter, and select brokers from a comprehensive database of 100+ data brokers compiled from open-source lists
**Depends on**: Phase 1
**Requirements**: BRKR-01, BRKR-02, BRKR-03, BRKR-04, BRKR-05, BRKR-06
**Success Criteria** (what must be TRUE):
  1. App loads and displays 100+ broker entries from the separate brokers.json file, each showing name, email, region, type, privacy portal URL, legal framework, and notes
  2. User can search brokers by name and filter by region and category
  3. User can select/deselect individual brokers or bulk-select all brokers matching a region or category
  4. Brokers known to block disposable email addresses are flagged with a visible indicator (tempEmailAccepted field)
**Plans:** 1/1 plans complete
Plans:
- [x] 03-01-PLAN.md -- Broker database compilation, broker table UI, search/filter/sort, selection logic
**UI hint**: yes

### Phase 4: Email Templates
**Goal**: App generates legally accurate GDPR Article 17 erasure request emails with correct legal citations, region-aware language, and the user's identity data pre-filled
**Depends on**: Phase 2, Phase 3
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06
**Success Criteria** (what must be TRUE):
  1. Generated email text cites GDPR Art. 17(1), Art. 19, Art. 12(3), and Art. 12(4) with correct legal terminology including "one calendar month" (not "30 days")
  2. Templates vary by broker region: strict GDPR for EU/EEA, UK GDPR for UK brokers, CCPA language for US brokers
  3. Templates include the user's identity information (name + email addresses) as entered in the identity form
  4. User can preview the generated email text for any selected broker and copy it to clipboard
**Plans:** 2/2 plans complete
Plans:
- [x] 04-01-PLAN.md -- Template engine (GDPR/UK-GDPR/CCPA generators, unit tests), campaign schema v2 with templates field, clipboard utility
- [x] 04-02-PLAN.md -- Template UI (TemplateDrawer, TemplateSidebar with edit/copy/reset), Brokers page integration, human verification

</details>

### Phase 5: Relay Infrastructure and E2E Encryption
**Goal**: A deployed Cloudflare Worker accepts email send requests from the frontend, generates temporary @erasurekit.uk sender addresses, sends GDPR erasure emails via Resend API, and encrypts all user-identifiable content so the domain owner cannot read it
**Depends on**: Phase 4
**Requirements**: RELAY-01, RELAY-02, RELAY-03, E2EE-01, E2EE-02
**Success Criteria** (what must be TRUE):
  1. A Cloudflare Worker deployed at api.erasurekit.uk accepts POST requests with encrypted email payloads and sends them via Resend API from a generated @erasurekit.uk address
  2. Each campaign gets a unique temporary sender address (e.g. a7k9x@erasurekit.uk) that persists across the campaign session
  3. The Worker cannot decrypt user email content -- only the user's browser holds the decryption key (Web Crypto API key pair)
  4. Calling the Worker API from a browser with a valid encrypted payload results in a real email delivered to the target broker address
  5. The Worker returns structured success/failure responses that the frontend can use to update broker status
**Plans:** 3 plans
Plans:
- [x] 05-01-PLAN.md -- Cloudflare Worker project scaffold, POST /send + DELETE /address routes, Resend API client, rate limiter, CORS, tests
- [x] 05-02-PLAN.md -- Browser crypto module (RSA-OAEP + AES-256-GCM hybrid encryption), campaign schema v3 with encryption field
- [x] 05-03-PLAN.md -- Deployment: DNS/Resend/KV setup, wrangler deploy, live email verification

### Phase 6: Frontend Sending Integration
**Goal**: Users can click "Send All" to dispatch GDPR erasure requests to all selected brokers through the relay, with the existing status tracking and notification systems reflecting real-time send progress
**Depends on**: Phase 5
**Requirements**: RELAY-04, RELAY-05, STAT-01, STAT-02, STAT-03, STAT-04, STAT-05
**Success Criteria** (what must be TRUE):
  1. User can click "Send All" on the Brokers page and see a progress indicator as each broker's request is dispatched through the relay
  2. The email-sender module calls the Worker relay instead of opening mailto: links -- no email client involvement
  3. Each broker's status updates automatically from "selected" to "awaiting" as the relay confirms each send
  4. The Track page dashboard reflects real-time send progress with aggregate stats (sent, awaiting, confirmed, rejected, overdue)
  5. If the relay returns an error for a specific broker, that broker is marked as "failed" with a retry option
**Plans**: TBD
**UI hint**: yes

### Phase 7: Reply Monitoring and Response Classification
**Goal**: Broker reply emails are automatically received via Cloudflare Email Routing, classified by the Worker, and forwarded to the user's browser where they update campaign state
**Depends on**: Phase 5, Phase 6
**Requirements**: RPLY-01, RPLY-02, RPLY-03, RPLY-04
**Success Criteria** (what must be TRUE):
  1. When a broker replies to the temp @erasurekit.uk address, Cloudflare Email Routing delivers it to the Worker which stores the encrypted reply in KV
  2. The frontend polls or checks for new replies and displays them in-app with the broker name, date, and classified response type
  3. Broker responses are automatically classified as: confirmed deletion, rejection, request for more info, auto-reply, or unclassified -- and the broker's campaign status updates accordingly
  4. User can view the full reply content (decrypted in-browser) for any broker that has responded
  5. The Track page shows which brokers have replied and their classified response type alongside the existing deadline and status indicators
**Plans**: TBD
**UI hint**: yes

### Phase 8: Quota-Aware Batching and Campaign Resume
**Goal**: Users with more selected brokers than the daily Resend quota can see a calendar-based send schedule, and queued emails automatically resume when the user returns
**Depends on**: Phase 6
**Requirements**: BATCH-01, BATCH-02, BATCH-03
**Success Criteria** (what must be TRUE):
  1. When selected brokers exceed the daily quota (100/day on free tier), the app shows a calendar UI breaking the campaign into daily batches with estimated send dates
  2. Queued emails that were not sent (due to quota or session end) automatically resume sending when the user reopens the app
  3. The app displays remaining daily quota and next batch time so the user knows when more emails will go out
  4. User can manually adjust batch priority -- moving specific brokers to send sooner or later within the schedule
**Plans**: TBD
**UI hint**: yes

### Phase 9: Contributor Scaling and Relay Registry
**Goal**: Contributors can donate $2/year domains to expand the relay network capacity, with the Worker load-balancing sends across all available domains
**Depends on**: Phase 5, Phase 8
**Requirements**: SCALE-01, SCALE-02, SCALE-03, SCALE-04
**Success Criteria** (what must be TRUE):
  1. The Worker maintains a registry of available relay domains and distributes sends across them to stay within each domain's Resend quota
  2. A contributor page in the app explains how to donate a domain (buy a cheap domain, point DNS to Cloudflare, add Resend verification) with step-by-step instructions
  3. When a new domain is added to the registry, the Worker automatically includes it in the load balancing rotation
  4. The app displays the current relay network capacity (total domains, total monthly quota, usage percentage) on the About page
**Plans**: TBD
**UI hint**: yes

### Phase 10: Legal Reference, Escalation, and Privacy Transparency
**Goal**: Users can access comprehensive GDPR legal reference material, generate pre-filled escalation letters for non-responsive brokers, and understand exactly how the relay architecture protects their privacy
**Depends on**: Phase 6, Phase 7
**Requirements**: LEGL-01, LEGL-02, LEGL-03, LEGL-04, ESCL-01, ESCL-02, ESCL-03, PRVCY-01
**Success Criteria** (what must be TRUE):
  1. User can read GDPR Article 17 full text alongside plain-English explanations of each provision on a dedicated Legal Reference page
  2. User can look up any EU/EEA Data Protection Authority or UK ICO with direct links to complaint forms in a searchable DPA directory
  3. User can generate a pre-filled follow-up warning email for any overdue broker, citing the original request date and elapsed time, sent through the relay
  4. User can generate a DPA complaint letter pre-filled with the broker name, original request date, and the correct national DPA contact for that broker's jurisdiction
  5. The About page includes a full privacy transparency section explaining the relay architecture, E2E encryption, temp addresses, and what data the domain owner can and cannot see
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell and Distribution | v1.0 | 2/2 | Complete | 2026-03-28 |
| 2. Identity Input and Persistence | v1.0 | 3/3 | Complete | 2026-03-29 |
| 3. Broker Database | v1.0 | 1/1 | Complete | 2026-03-29 |
| 4. Email Templates | v1.0 | 2/2 | Complete | 2026-03-30 |
| 5. Relay Infrastructure and E2E Encryption | v2.0 | 0/3 | Planning complete | - |
| 6. Frontend Sending Integration | v2.0 | 0/0 | Not started | - |
| 7. Reply Monitoring and Response Classification | v2.0 | 0/0 | Not started | - |
| 8. Quota-Aware Batching and Campaign Resume | v2.0 | 0/0 | Not started | - |
| 9. Contributor Scaling and Relay Registry | v2.0 | 0/0 | Not started | - |
| 10. Legal Reference, Escalation, and Privacy Transparency | v2.0 | 0/0 | Not started | - |
