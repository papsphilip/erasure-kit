# Roadmap: ErasureKit

## Overview

ErasureKit delivers a portable, zero-server GDPR erasure tool through 8 phases following the natural dependency chain: architecture validation, then data entry and persistence, then broker data, then template generation, then the send-and-track loop, then response monitoring via temp email, then legal reference content, and finally the escalation workflow that transforms the tool from "email sender" to "GDPR enforcement assistant." Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: App Shell and Distribution** - Validate Preact + HTM + Vite architecture with two-mode dev/build workflow (completed 2026-03-28)
- [x] **Phase 2: Identity Input and Persistence** - Users can enter personal data and save/load campaign progress (completed 2026-03-29)
- [x] **Phase 3: Broker Database** - Users can browse, search, filter, and select data brokers from the compiled database (completed 2026-03-29)
- [x] **Phase 4: Email Templates** - App generates legally accurate, region-aware GDPR erasure request emails (completed 2026-03-30)
- [x] **Phase 5: Sending and Status Tracking** - Users can send erasure requests and track per-broker status with a campaign dashboard (completed 2026-04-01)
- [ ] **Phase 6: Temp Email Monitoring** - App monitors broker responses via a temporary mail.tm inbox
- [ ] **Phase 7: Legal Reference** - Users can access GDPR legal text, identity verification guidance, and DPA directory
- [ ] **Phase 8: Escalation** - Users can generate follow-up warnings and DPA complaint letters for non-responsive brokers

## Phase Details

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
- [x] 01-01-PLAN.md — Project scaffolding, Vite config, dev-mode index.html, theme/router/broker-loader libs, distribution assets
- [x] 01-02-PLAN.md — App shell UI components (Header, Stepper, HamburgerMenu, ThemeToggle, Footer), WelcomeScreen, placeholder pages, root App, build verification
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
- [x] 02-01-PLAN.md — Campaign state module (signal, CRUD helpers, auto-save, file save/load), Vitest config, unit tests
- [x] 02-02-PLAN.md — Identity form UI (name, multi-email, optional phone/address, validation, Continue button)
- [x] 02-03-PLAN.md — App shell integration (Header save/load buttons, Footer auto-save indicator, WelcomeScreen resume flow)
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
**Plans**: TBD
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
- [x] 04-01-PLAN.md — Template engine (GDPR/UK-GDPR/CCPA generators, unit tests), campaign schema v2 with templates field, clipboard utility
- [x] 04-02-PLAN.md — Template UI (TemplateDrawer, TemplateSidebar with edit/copy/reset), Brokers page integration, human verification

### Phase 5: Sending and Status Tracking
**Goal**: Users can send erasure requests to all selected brokers via mailto: links and track each broker's status through a lifecycle with a dashboard showing campaign-wide progress
**Depends on**: Phase 4
**Requirements**: SEND-01, SEND-02, SEND-03, SEND-04, STAT-01, STAT-02, STAT-03, STAT-04, STAT-05
**Success Criteria** (what must be TRUE):
  1. User can click a send button that opens their email client via mailto: with the correct recipient, subject, and pre-filled GDPR template body
  2. User can batch-send to all selected brokers via sequential mailto: activation, confirming each send
  3. When a template exceeds ~2000 characters (mailto: URL limit), the app automatically falls back to clipboard copy with clear instructions
  4. Each broker displays its current status (not selected / selected / sent / awaiting response / confirmed / rejected / escalated / overdue) and the status updates correctly through the lifecycle
  5. Dashboard shows aggregate campaign stats (total brokers, selected, sent, awaiting, confirmed, rejected, overdue) and overall progress percentage
**Plans:** 1/1 plans complete
Plans:
- [x] 05-01-PLAN.md -- Sending infrastructure, status tracking data model, stepper refactoring, modal, sticky send bar, Track page dashboard
**UI hint**: yes

### Phase 6: Temp Email Monitoring
**Goal**: App creates a temporary email inbox via mail.tm, polls for broker responses, classifies them automatically, and caches all messages locally to survive mail.tm's 7-day retention limit
**Depends on**: Phase 5
**Requirements**: TEMP-01, TEMP-02, TEMP-03, TEMP-04, TEMP-05, TEMP-06, TEMP-07
**Success Criteria** (what must be TRUE):
  1. User can create a temporary mail.tm inbox from within the app and include that address in their erasure requests as a "respond to" contact
  2. App polls the temp inbox and displays received messages in-app, with all messages cached locally
  3. App automatically classifies broker responses as: confirmed deletion, rejection, request for more info, auto-reply, or unclassified
  4. User can delete the temp email account when the campaign is complete
  5. App shows mail.tm service health status and handles API downtime gracefully (clear error messages, no crashes)
**Plans**: TBD
**UI hint**: yes

### Phase 7: Legal Reference
**Goal**: Users can access comprehensive legal reference material including GDPR Article 17 full text, identity verification guidance, DPA directory, and template letters
**Depends on**: Phase 1
**Requirements**: LEGL-01, LEGL-02, LEGL-03, LEGL-04
**Success Criteria** (what must be TRUE):
  1. User can read GDPR Article 17 full text alongside plain-English explanations of each provision
  2. User can access an identity verification guide explaining what brokers can legally ask for, what is disproportionate under Art. 12(6), and template pushback responses
  3. User can look up any of the 30+ EU/EEA Data Protection Authorities and UK ICO with direct links to complaint forms
  4. User can access escalation template letters (follow-up warning, formal DPA complaint, identity verification pushback) for reference
**Plans**: TBD
**UI hint**: yes

### Phase 8: Escalation
**Goal**: Users can generate pre-filled follow-up warnings and DPA complaint letters for overdue brokers, turning the tool from a one-shot email sender into a GDPR enforcement assistant
**Depends on**: Phase 5, Phase 7
**Requirements**: ESCL-01, ESCL-02, ESCL-03
**Success Criteria** (what must be TRUE):
  1. User can generate a follow-up warning email for any overdue broker, pre-filled with the original request date and elapsed time
  2. User can generate a DPA complaint letter pre-filled with the broker name, original request date, and the correct national DPA contact for that broker's jurisdiction
  3. When any broker becomes overdue, the user sees a clear notification with an "Escalate" action that navigates to the escalation workflow
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell and Distribution | 2/2 | Complete   | 2026-03-28 |
| 2. Identity Input and Persistence | 3/3 | Complete   | 2026-03-29 |
| 3. Broker Database | 1/1 | Complete   | 2026-03-29 |
| 4. Email Templates | 2/2 | Complete   | 2026-03-30 |
| 5. Sending and Status Tracking | 1/1 | Complete   | 2026-04-01 |
| 6. Temp Email Monitoring | 0/0 | Not started | - |
| 7. Legal Reference | 0/0 | Not started | - |
| 8. Escalation | 0/0 | Not started | - |
