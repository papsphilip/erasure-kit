# Project Research Summary

**Project:** ErasureKit
**Domain:** GDPR data erasure automation (portable, serverless, open-source browser app)
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

ErasureKit is a portable, zero-server browser application that automates GDPR Article 17 data erasure requests against data brokers. Research reveals that the original architecture -- using mail.tm to both send and receive erasure emails -- is fundamentally impossible. mail.tm is a **receive-only** service with no outgoing email capability whatsoever. This is the single most important finding: the entire sending mechanism must be redesigned around a **dual-service architecture**. The recommended approach uses `mailto:` links (user's email client sends the request) as the primary sending method, with mail.tm repurposed exclusively as a response monitoring inbox. This is actually a stronger design: emails from the user's real client have better deliverability, since 188,000+ temp email domains are actively blacklisted by data brokers.

The recommended stack is **Preact + HTM + Preact Signals** (not React), enabling a no-build-step development mode where contributors can edit and test by simply opening `index.html` in a browser. For distribution, Vite 7 + vite-plugin-singlefile produces a single portable HTML file (~50-100KB). Tailwind CSS v4 provides styling in both modes: CDN for development, pre-compiled for production builds. File persistence uses browser-fs-access (Google Chrome Labs) for cross-browser save/load to local JSON files, replacing the fragile localStorage approach in the reference prototype.

The primary risks are: (1) mail.tm's chronic reliability issues (frequent outages, 7-day message retention) requiring aggressive local caching and a provider abstraction layer; (2) 40%+ of data brokers simply never responding to deletion requests, making the escalation workflow (DPA complaints, follow-up templates) arguably more important than the initial send; (3) legal inaccuracies in the existing prototype's templates (missing Article 19, Article 12(3), Article 12(4) citations; using "30 days" instead of the legally correct "one calendar month"); and (4) the portable distribution model having no built-in update mechanism, requiring a version-check-against-GitHub approach for broker database freshness.

## Key Findings

### Recommended Stack

The stack is optimized for the unique distribution model: a single downloadable HTML file with no server dependency. Every technology choice serves the "double-click and open" portability requirement. Development uses CDN-loaded modules with no build step; production uses Vite to inline everything into one file.

**Core technologies:**
- **Preact 10.29.0 + HTM 3.1.1**: UI framework + JSX alternative -- 3KB gzipped, React-compatible API, runs directly in browser via tagged template literals with no transpiler
- **Preact Signals 1.3.x**: Reactive state -- fine-grained reactivity without hooks boilerplate, 1.6KB, native to Preact ecosystem
- **Tailwind CSS v4 (two-mode)**: `@tailwindcss/browser` CDN for development, `@tailwindcss/vite` for production builds
- **browser-fs-access 0.35.0**: File persistence -- Google Chrome Labs library, File System Access API with automatic `<a download>` fallback for Firefox/Safari
- **Vite 7 + vite-plugin-singlefile 2.3.2**: Build tooling -- produces single inlined HTML file. Vite 8 not yet supported by the singlefile plugin.
- **mail.tm REST API**: Temp inbox for monitoring broker responses (receive-only). CORS fully open (`access-control-allow-origin: *`), verified via curl preflight.
- **`mailto:` protocol**: Primary email sending mechanism -- zero dependencies, works offline, uses user's real email client
- **date-fns 4.x**: Calendar-month deadline arithmetic (not naive 30-day addition)

**Not using (with rationale):** React (40KB+, requires build step), TypeScript (requires compilation, incompatible with no-build dev mode), Zustand (requires bundler), localStorage (fragile for weeks-long campaigns), Vite 8 (singlefile plugin incompatible with Rolldown).

### Expected Features

**Must have (table stakes):**
- Broker database with 100+ entries compiled from open-source lists (BADBOOL, JustVanish, Vermont/CA registries)
- One-click bulk sending via `mailto:` links with pre-filled GDPR templates
- Legally accurate, region-aware email templates (GDPR EU + UK GDPR + CCPA minimum)
- Per-broker status tracking with state machine (selected -> sent -> awaiting -> confirmed/rejected/escalated)
- Calendar-month deadline tracking with overdue flagging
- Save/load campaign progress to local JSON file
- Dashboard with aggregate stats (sent, responded, overdue, completed)
- Minimal identity input (name + emails only; optional phone/address with data-minimization warnings)

**Should have (differentiators):**
- Temporary email creation via mail.tm for response monitoring (the killer feature -- no other open-source tool does this)
- Automated response detection and classification (confirmed/rejected/needs-more-info/auto-reply)
- Pre-filled escalation templates for overdue brokers with DPA complaint letter generation
- DPA directory with direct complaint form URLs for all 30+ EU/EEA DPAs + UK ICO
- Identity verification pushback guide (what brokers can legally demand, proportionality under Art. 12(6))
- Legal reference pages (Article 17 full text, plain-English explanations, Recitals 65-66)

**Defer (v2+):**
- EmailJS integration for true automated bulk sending (200/month free limit constrains this)
- Broker categorization by type (people-search, marketing, financial, health, recruiting)
- Temp email auto-cleanup (delete mail.tm account after campaign completion)
- Community broker-reporting mechanism (flag broken links/emails)
- Version update checking against GitHub
- Multi-language i18n

**Explicitly excluded (anti-features):**
User accounts, cloud syncing, browser extension, dark web monitoring, recurring removal cycles, automated DPA complaint filing, sending from user's real email as default, people-search site scanning.

### Architecture Approach

The architecture follows a **dual-service model** with clear component boundaries. The browser app has nine components organized in three tiers: UI layer (Identity Form, Broker Manager, Dashboard), Core Engine (Email Composer, Inbox Monitor, Deadline Tracker, Response Classifier), and Infrastructure (State Manager, Persistence Layer). All state flows through a central State Manager using Preact Signals. External dependencies are limited to mail.tm (receive-only, via Service Adapter pattern for provider swappability) and the `mailto:` protocol (send). The broker database is a separate JSON file loaded at runtime, enabling community contributions without app rebuilds.

**Major components:**
1. **State Manager** (Preact Signals) -- central campaign state: identity, broker statuses, temp email credentials, settings. All components read/write through this hub.
2. **Email Composer** -- generates legally accurate, region-aware GDPR/CCPA templates and dispatches via `mailto:` links or clipboard copy.
3. **Inbox Monitor** -- creates mail.tm temp accounts, polls for incoming messages (SSE/Mercure preferred, polling fallback), caches all messages locally.
4. **Response Classifier** -- keyword-based heuristic classification of broker responses into confirmed/rejected/needs-more-info/auto-reply/unclassified.
5. **Persistence Layer** -- browser-fs-access for explicit file save/load, with localStorage as secondary auto-save cache. File is the authoritative copy.
6. **Deadline Tracker** -- proper calendar-month arithmetic from send date, weekend/holiday awareness, conservative vs generous deadline display.

**Key architectural patterns:**
- Service Adapter pattern for mail.tm (enables provider swap if service dies)
- Optimistic state updates (mailto: provides no delivery confirmation -- status is a user assertion)
- Progressive enhancement for persistence (File System API -> download/upload fallback)
- Token refresh guard for mail.tm JWT authentication
- Aggressive local message caching (7-day server retention is too short for weeks-long campaigns)

### Critical Pitfalls

1. **mail.tm is receive-only** -- Cannot send emails. The entire sending architecture must use `mailto:` links or EmailJS. This must be resolved before any code is written. (Phase 1 impact)

2. **188K+ temp email domains are blacklisted** -- Data brokers actively block disposable email addresses. Emails from mail.tm may be silently dropped. Mitigation: use mail.tm only for receiving responses; send from user's real email client via `mailto:`. Add a `tempEmailAccepted` field to the broker database schema.

3. **"30 days" is legally wrong** -- GDPR specifies "one calendar month" (28-31 days) with weekend/holiday extensions. All templates, UI text, and deadline calculations must use calendar-month arithmetic. Use date-fns for proper date math.

4. **40%+ of brokers never respond** -- The escalation workflow (DPA complaints, follow-up warnings) is not a nice-to-have; it is arguably more important than the initial send. Build it as a core feature, not an afterthought.

5. **mail.tm has chronic reliability issues** -- Frequent outages, 7-day message retention. Mitigation: provider abstraction layer (swap to mail.gw or future alternatives), aggressive local caching of all fetched messages, clear health indicators in the UI.

6. **Existing templates have legal weaknesses** -- Missing Art. 19 (third-party notification), Art. 12(3) (response deadline), Art. 12(4) (refusal notification). Base templates on datarequests.org CC0-licensed templates, not blog post derivatives.

## Implications for Roadmap

Based on research, the project naturally decomposes into 5 phases following the dependency chains identified in the architecture analysis. The critical path is: State Management -> Persistence -> Broker Data -> Email Templates -> Sending -> Tracking -> Monitoring -> Escalation.

### Phase 1: Foundation and Core Infrastructure
**Rationale:** Everything depends on the state manager and persistence layer. The broker database loader and schema must be established before any email features work. The two-mode development architecture (no-build CDN dev + Vite production build) must be validated early.
**Delivers:** Working app shell with Preact + HTM, state management via Signals, file save/load via browser-fs-access, broker database loading and display, identity input form.
**Addresses:** Broker database (table stakes), minimal identity input (table stakes), save/load progress (table stakes), portable single-file bundle (differentiator).
**Avoids:** Pitfall 7 (localStorage fragility) by implementing file-based persistence from day one. Pitfall 5 (CORS) by validating mail.tm and `file://` origin behavior immediately.

### Phase 2: Email Templates and Sending
**Rationale:** The sending mechanism is the core value proposition. Templates must be legally accurate from the start -- retrofitting legal language is harder than getting it right initially. The `mailto:` approach is the zero-dependency default that works immediately.
**Delivers:** Region-aware GDPR/UK-GDPR/CCPA email template generator, `mailto:` link generation and batch send UX, clipboard copy as alternative, per-broker status tracking with state machine, dashboard with aggregate stats.
**Addresses:** One-click bulk sending (table stakes), legally accurate templates (table stakes), region-aware templates (table stakes), per-broker status tracking (table stakes), dashboard (table stakes).
**Avoids:** Pitfall 6 (weak legal language) by basing templates on datarequests.org CC0 templates and cross-referencing all article citations. Pitfall 3 (30-day vs calendar month) by implementing correct deadline arithmetic. Pitfall 12 (EU vs UK GDPR confusion) by separating template variants. Pitfall 16 (US brokers not subject to GDPR) by tagging legal framework per broker.

### Phase 3: Response Monitoring and Classification
**Rationale:** After sending, users need to track what happens. mail.tm integration for inbox monitoring, response classification, and deadline tracking closes the "send and forget" loop. This phase has the highest technical risk (mail.tm reliability, SSE/Mercure integration) and should be isolated.
**Delivers:** mail.tm temp email account creation, inbox polling with SSE upgrade path, keyword-based response classifier, deadline tracker with overdue flagging, local message caching, service health indicators.
**Addresses:** Temp email creation (differentiator), automated response detection (differentiator), 30-day deadline tracking (table stakes), overdue notifications (table stakes).
**Avoids:** Pitfall 1 (mail.tm can't send -- only used for receiving here). Pitfall 2 (mail.tm reliability) via provider abstraction and aggressive local caching. Pitfall 4 (temp email blacklisting) by using temp email only for receiving, not sending.

### Phase 4: Escalation and Legal Resources
**Rationale:** With 40%+ broker non-response rates, the escalation system is what makes ErasureKit genuinely useful beyond the initial send. This phase transforms the tool from "email sender" to "GDPR enforcement assistant." The legal reference content is static and low-risk but high-value.
**Delivers:** Escalation template generator (follow-up warnings citing original request date + elapsed time), DPA complaint letter generator with correct national DPA per jurisdiction, DPA directory with complaint form URLs, identity verification pushback guide, legal reference pages (Art. 17 full text, plain-English explanations).
**Addresses:** Pre-filled escalation templates (differentiator), DPA directory (differentiator), legal reference pages (differentiator), identity verification guide (differentiator).
**Avoids:** Pitfall 8 (40%+ non-response) by making escalation a first-class workflow. Pitfall 10 (excessive identity verification demands) by providing pushback guidance and template responses.

### Phase 5: Polish, Distribution, and Optional Features
**Rationale:** With the core loop complete (send -> monitor -> escalate), this phase adds quality-of-life improvements and prepares for public release. The version check mechanism and broker database refresh address the portable distribution's lack of auto-updates.
**Delivers:** EmailJS opt-in integration for automated bulk sending, broker categorization by type, temp email auto-cleanup, version check against GitHub, "refresh broker list" from remote URL, production build optimization, GitHub Release packaging, comprehensive README.
**Addresses:** Remaining differentiators from FEATURES.md, distribution anti-pitfalls.
**Avoids:** Pitfall 11 (no update mechanism) via lightweight GitHub version check. Pitfall 9 (stale broker database) via remote broker list refresh.

### Phase Ordering Rationale

- **Foundation first (Phase 1):** State management, persistence, and broker data loading are prerequisites for everything. The two-mode architecture (no-build dev + Vite build) must be validated before building features on top of it.
- **Sending before monitoring (Phase 2 before 3):** Users get value immediately from Phase 2 alone -- they can generate and send erasure requests even without inbox monitoring. Phase 3 adds the monitoring loop but is not required for a functional tool.
- **Monitoring before escalation (Phase 3 before 4):** Response classification feeds into the escalation workflow. You need to know who responded and who didn't before generating escalation templates.
- **Escalation is not deferred (Phase 4, not "v2"):** Research strongly indicates that broker non-response is the norm, not the exception. An erasure tool without escalation support is incomplete by design.
- **Polish and optional features last (Phase 5):** EmailJS integration, broker categorization, and auto-cleanup are valuable but not critical for a useful product.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Email template legal accuracy requires careful cross-referencing with GDPR text, ICO guidance, and datarequests.org templates. The `mailto:` URL length limit (~2000 chars in some browsers) may truncate long templates -- needs testing and possible mitigation (clipboard fallback for long templates).
- **Phase 3:** mail.tm SSE/Mercure integration is not directly verified. The Mercure hub endpoint URL and authentication flow need discovery. Polling is a safe fallback but SSE should be attempted. CORS from `file://` origin needs empirical validation.
- **Phase 4:** DPA complaint processes vary by country. The 30+ DPA directory needs manual research to compile complaint form URLs and contact details. datarequests.org has a supervisory authority database that can be used as a starting point.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Standard Preact + Vite setup, well-documented by the Preact team. browser-fs-access has clear API documentation and examples.
- **Phase 5:** EmailJS integration is well-documented. GitHub Release packaging is standard. Version checking against a raw GitHub URL is trivial.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified on npm/GitHub. Preact no-build workflow is officially documented. Vite 7 + singlefile plugin peer deps confirmed. |
| Features | HIGH | Competitive landscape well-documented. Feature set derived from analysis of 10+ existing tools (paid and open-source). Clear differentiation identified. |
| Architecture | HIGH | mail.tm CORS verified via direct curl preflight. Dual-service architecture is the only viable approach. Component boundaries follow standard patterns. |
| Pitfalls | HIGH | Critical pitfalls verified via official docs (mail.tm FAQ), empirical data (188K blacklisted domains), and legal sources (ICO, EDPB, IAPP). 40%+ non-response rate backed by UC Irvine study. |

**Overall confidence:** HIGH

The research is unusually thorough. The most critical finding (mail.tm cannot send emails) was verified against official API documentation, FAQ, and third-party library implementations. The CORS verification was done via actual curl preflight requests, not inferred from documentation. The legal pitfalls are grounded in specific GDPR articles, ICO guidance, and EDPB enforcement findings.

### Gaps to Address

- **mail.tm CORS from `file://` origin:** CORS headers verified from HTTP origin but not empirically tested from a `file://` origin (how end users will run the app). Must validate in Phase 1 before committing to the architecture. Fallback: minimal Cloudflare Workers CORS proxy (~15 lines).
- **mail.tm SSE/Mercure endpoint:** The Mercure hub URL and subscription flow are not directly documented. Need to discover this during Phase 3 implementation. Polling is a safe fallback.
- **mail.tm token expiration:** JWT token lifetime is not documented. Must be determined empirically in Phase 3. The token refresh guard pattern handles this, but the refresh interval is unknown.
- **`mailto:` URL length limits:** Some browsers truncate `mailto:` URLs beyond ~2000 characters. Long GDPR templates with full article citations may exceed this. Need to test in Phase 2 and implement clipboard-copy fallback for long templates.
- **brokers.json compilation:** No single definitive broker list exists. The 100+ broker target requires merging and deduplicating from BADBOOL, JustVanish, data-eraser YAML, Vermont/CA registries, and datarequests.org. This is manual research work best done during Phase 1-2.
- **DPA complaint form URLs:** Need manual verification for all 30+ EU/EEA Data Protection Authorities. datarequests.org has a starting point but completeness is unverified.

## Sources

### Primary (HIGH confidence)
- [mail.tm API docs](https://docs.mail.tm/) -- confirmed receive-only, no send endpoint
- [mail.tm CORS headers](https://api.mail.tm/) -- verified `access-control-allow-origin: *` via curl preflight
- [Preact npm](https://www.npmjs.com/package/preact) -- v10.29.0 verified current
- [vite-plugin-singlefile npm](https://www.npmjs.com/package/vite-plugin-singlefile) -- v2.3.2, peer dep Vite ^5|^6|^7
- [browser-fs-access GitHub](https://github.com/GoogleChromeLabs/browser-fs-access) -- Google Chrome Labs, Apache 2.0
- [block-disposable-email.com](https://www.block-disposable-email.com/cms/) -- 188,384 blocked temp email domains
- [ICO Right to Erasure Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/)
- [IAPP DSAR Deadline Calculation](https://iapp.org/news/a/dsars-do-you-know-how-to-calculate-your-legal-response-time-under-the-gdpr/)
- [EDPB 2025 Coordinated Enforcement Action](https://www.mydata-trust.com/2026/03/20/erasure-requests-edpb/) -- 764 controllers assessed
- [datarequests.org Sample Erasure Letter](https://www.datarequests.org/blog/sample-letter-gdpr-erasure-request/) -- CC0 licensed
- [GDPR Article 17 text](https://gdpr-info.eu/art-17-gdpr/)
- [UC Irvine data broker study](https://proton.me/blog/data-brokers-dont-delete-data) -- 40%+ non-response rate
- [Senate "Opt-Out Obstacles" Report (Feb 2026)](https://www.jec.senate.gov/public/_cache/files/7f821956-d826-4241-8196-be987cc1f06c/2026-02-27-jec-data-brokers-report-final.pdf)

### Secondary (MEDIUM confidence)
- [mail.tm SSE/Mercure support](https://mercure.rocks/spec) -- mail.tm uses Mercure, but SSE endpoint not directly verified
- [Tailwind v4 browser CDN](https://tailwindcss.com/docs/installation/play-cdn) -- works for dev, production needs Vite plugin
- [EmailJS pricing](https://www.emailjs.com/pricing/) -- 200 emails/month free tier, 2 templates
- [Guerrilla Mail API](https://www.guerrillamail.com/GuerrillaMailAPI.html) -- CORS open but session-cookie complications

### Tertiary (needs validation)
- `mailto:` URL length limit (~2000 chars) -- commonly cited but exact limits vary by browser and email client
- mail.tm JWT token expiration duration -- not documented, must test empirically
- `file://` origin CORS behavior -- varies by browser security policy, must test before committing

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
