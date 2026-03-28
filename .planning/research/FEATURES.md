# Feature Landscape

**Domain:** GDPR data erasure automation (portable, serverless, open-source)
**Researched:** 2026-03-28

## Competitive Landscape Summary

The data removal market splits into three tiers:

1. **Paid SaaS services** ($100-300/year): DeleteMe, Incogni, Optery, Privacy Bee, Aura. These employ automation + human agents, cover 200-950+ brokers, handle recurring removal cycles, and bundle identity protection features. They are subscription-based and US-centric.

2. **Free consumer tools**: Mine (saymine.com, now McAfee) scans email footprint and sends deletion requests from user's inbox. JustDeleteMe provides a directory of account deletion links with difficulty ratings. California's DROP portal (January 2026) lets CA residents send one request to 500+ registered brokers. Datarequests.org generates GDPR request letters from a company database.

3. **Open-source tools**: data-eraser (kjmutsch) sends GDPR/CCPA requests to 750+ brokers via Gmail. Visible Labs' databroker_remover uses Next.js + AWS SES. JustVanish (Go, still in development) has a community broker database. GDPR Helper (Python) sends access/erasure requests.

ErasureKit sits in tier 3 but with a unique value proposition: **temp email protection** (no real email exposure), **zero server dependency** (fully portable), and **deadline tracking with escalation**. No existing open-source tool combines all three.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| 1 | **Broker database (100+ entries)** | Every competitor has a curated list. Users need targets to send to. Without a substantial list, the tool is useless. | Med | Compile from yaelwrites BADBOOL, Vermont/CA registries, JustVanish data, data-eraser YAML. Separate `brokers.json` for community contribution. |
| 2 | **One-click bulk sending** | Core value prop. data-eraser does this, Incogni does this. Manual per-broker emails defeat the purpose. | Med | Batch all selected brokers, send via temp email API. Rate limiting needed (mail.tm may throttle). |
| 3 | **Legally accurate email templates** | datarequests.org, data-eraser, JustVanish all have templates. Wrong legal language = ignored requests. | Low | Cite Article 17 GDPR, Article 12(3) for response deadline, Article 17(2) for third-party notification. Include name + email identifiers minimum. |
| 4 | **Per-broker status tracking** | Every paid service has a dashboard. Optery shows before/after screenshots. Users need to know what happened. | Med | States: not sent / sent / awaiting response / responded / completed / escalated / overdue. |
| 5 | **30-day deadline tracking** | GDPR Article 12(3) mandates response within one month. This is the legal hammer. Users must know who is late. | Low | Calculate from send date. Auto-flag overdue brokers. EDPB's 2025 enforcement priority makes this especially relevant. |
| 6 | **Overdue notifications** | Users need to know when to escalate. DeleteMe/Incogni handle this silently; for a self-serve tool, explicit alerts are critical. | Low | In-app notification panel. Optional browser notifications via Notification API. |
| 7 | **Save/load progress** | Sessions persist across days/weeks. data-eraser tracks state. Without persistence, users lose all progress on browser close. | Med | File System API (Chromium) with download/upload JSON fallback. All state in one portable file. |
| 8 | **Minimal identity input** | GDPR data minimization principle. Optery's free tier only asks name + city. Over-collecting is both a privacy and legal risk. | Low | Required: full name, email(s) to erase. Optional: phone, address. Never SSN/tax ID. |
| 9 | **Dashboard / overview stats** | Every paid service has this. Users need a clear picture: X sent, Y responded, Z overdue. | Low | Simple counters + progress bar. No charts needed for v1. |
| 10 | **Region-aware templates** | EU GDPR vs UK GDPR vs CCPA have different legal frameworks. datarequests.org and JustVanish both template per-regulation. | Med | GDPR (EU/EEA + UK), CCPA (California), CPA (Colorado), etc. At minimum: GDPR + CCPA. |

---

## Differentiators

Features that set ErasureKit apart. Not expected from an open-source tool, but create real value.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| 1 | **Temporary email creation** | **The killer feature.** No other open-source tool does this. Paid services use their own email infrastructure. data-eraser requires your Gmail. ErasureKit protects your real email entirely. | Med | mail.tm or similar free API. Create account, send from it, poll inbox, delete when done. CORS is the main risk. |
| 2 | **Automated response detection** | Mine, Incogni, and DeleteMe all categorize responses. For a self-serve tool, classifying "confirmed deletion" vs "need more info" vs "rejected" saves massive manual work. | High | Parse incoming emails for keywords/patterns. Heuristic classification: confirmation keywords, identity verification requests, rejection language, auto-replies. |
| 3 | **Pre-filled escalation templates** | No open-source tool does this well. datarequests.org has complaint generators but not integrated with tracking. ErasureKit can auto-generate follow-up warnings citing the original request date + DPA complaint letters. | Med | Template with original send date, broker name, elapsed days. Include DPA complaint letter template with correct national DPA contact. |
| 4 | **DPA directory with complaint links** | datarequests.org has a supervisory authority database. ErasureKit should include direct complaint form URLs for each EU/EEA DPA. Users escalating overdue brokers need one-click access to the right authority. | Low | Static data: ~30 EU/EEA DPAs + UK ICO. Include name, URL, complaint form URL, email. |
| 5 | **Legal reference pages** | No competitor bundles GDPR Article 17 full text + plain-English explanation + identity verification pushback guide in the same tool. This makes ErasureKit an educational resource, not just a sending tool. | Low | Static content. Article 17 text, Recitals 65-66, Article 12(3) deadline, Article 12(6) on verification proportionality. |
| 6 | **Identity verification pushback guide** | Companies frequently demand excessive ID (passport, utility bills). GDPR Article 12(6) says verification must be proportional. Most users don't know they can push back. This empowers them. | Low | Static guide: what companies can legally ask, what is disproportionate, template responses for common overreach. Cite IAPP guidance and EDPB recommendations. |
| 7 | **Portable single-file bundle** | No server, no install, no account. Share via USB, email, or direct download. Competitors all require accounts/subscriptions. This is radical accessibility. | Low | Already in project requirements. Vite build to single HTML or small file set. |
| 8 | **Community-editable brokers.json** | JustDeleteMe and JustVanish use community JSON/YAML. ErasureKit's separate file lets anyone contribute brokers via GitHub PR without touching app code. Schema should be well-documented. | Low | JSON schema with: name, email, region, category, notes, difficulty, privacy_page_url. |
| 9 | **Temp email auto-cleanup** | After all brokers respond (or user decides they're done), delete the temp email account entirely. No trace left. No other tool offers this level of cleanup. | Low | API call to mail.tm to delete account. Prompt user before deletion. |
| 10 | **Broker categorization by type** | Incogni covers 5 broker types (people search, marketing, financial, health, recruiting). Most tools treat all brokers as equal. Categorizing helps users prioritize. | Low | Categories: people-search, marketing/advertising, financial, health, background-check, recruiting, general data aggregator. |

---

## Anti-Features

Features to explicitly NOT build. These are traps that would compromise the project's values or add unjustified complexity.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User accounts / authentication** | Defeats the privacy-first, zero-tracking philosophy. Creates a server dependency. Paid services need accounts for billing; ErasureKit has no billing. | All state in local file. No server, no login, no tracking. |
| **Cloud storage / syncing** | Creates a server to maintain, a database to protect, and a target for breaches. Contradicts "portable" design. | File System API for local save/load. Download/upload JSON as universal fallback. |
| **Automated DPA complaint filing** | Filing complaints involves legal processes that vary by country. Auto-filing could create legal liability and might submit invalid complaints. | Generate complete complaint templates with correct DPA details. User reviews and files manually. |
| **Sending from user's real email** | The entire value proposition is protecting the user's real identity. data-eraser requires Gmail; ErasureKit should never expose the real address. | Always use temp email. If temp email API is down, show error rather than falling back to real email. |
| **Subscription / recurring billing** | Monetization pressure leads to feature-gating, dark patterns, and data retention for billing. Free and open-source is the point. | 100% free. Accept donations via GitHub Sponsors or similar if desired. |
| **Browser extension** | Adds distribution complexity, store review processes, and platform-specific code. JustDeleteMe has one; it adds minimal value over the web app. | Single portable web app. Bookmark it. |
| **Dark web monitoring** | Feature creep into security suite territory (Aura, Privacy Bee). Requires paid APIs, scanning infrastructure, and creates false sense of security. | Stay focused on GDPR erasure. Link to external dark web monitoring services in resources page if helpful. |
| **Identity theft insurance** | Aura bundles $1M insurance. This is a financial product requiring licensing and partnerships. Completely out of scope. | Not applicable to an open-source tool. |
| **Automated form-filling / browser automation** | Some brokers require web form submissions rather than email. Puppeteer/Playwright automation is fragile, breaks constantly, and requires a runtime. | For form-only brokers, provide direct link to the opt-out form with instructions. Track as "manual action required." |
| **VPN / antivirus bundling** | Feature creep. Aura and Privacy Bee bundle these. Irrelevant to GDPR erasure. | Stay laser-focused on erasure requests. |
| **Multi-language i18n (v1)** | Slows initial release. Community can add translations later if the architecture supports it. | English only for v1. Use i18n-ready string patterns so translations can be added without code changes. |
| **Recurring removal cycles** | Incogni re-sends every 60-90 days. This requires persistent infrastructure (server, scheduler, always-on email). Incompatible with portable design. | Single-run tool. Users can re-run manually months later. Document that data reappears and periodic re-runs are recommended. |
| **Search engine result removal** | Optery Ultimate includes Google/Bing outdated content removal. This is a different workflow (web forms, not email) and fragile. | Out of scope. Link to Google's removal tool and Bing's content removal page in the legal resources. |
| **People-search site scanning** | Optery and DeleteMe scan people-search sites to find your records before requesting removal. This requires web scraping infrastructure, CAPTCHA solving, and constant maintenance. | Assume all brokers in the database may have data. Send to all selected. No pre-scanning. |

---

## Feature Dependencies

```
Broker Database ─────────────────────────┐
                                          ├──> One-Click Bulk Sending ──> Per-Broker Status Tracking
Temp Email Creation ─────────────────────┘                                       │
                                                                                  ├──> 30-Day Deadline Tracking
Email Templates (region-aware) ──> One-Click Bulk Sending                        │
                                                                                  ├──> Overdue Notifications
Minimal Identity Input ──> Email Templates                                       │
                                                                                  ├──> Automated Response Detection
Save/Load Progress ──> Per-Broker Status Tracking                                │
                                                                                  └──> Pre-filled Escalation Templates ──> DPA Directory
Dashboard ──> Per-Broker Status Tracking

Temp Email Auto-Cleanup ──> Temp Email Creation + Per-Broker Status Tracking (all complete)

Legal Reference Pages ──> (standalone, no dependencies)
Identity Verification Guide ──> (standalone, no dependencies)
DPA Directory ──> (standalone, no dependencies)
Broker Categorization ──> Broker Database
Community brokers.json ──> Broker Database
```

### Critical Path

The minimum viable flow requires this chain:
1. **Broker Database** (data foundation)
2. **Minimal Identity Input** (user provides info)
3. **Email Templates** (generate request text)
4. **Temp Email Creation** (create sending address)
5. **One-Click Bulk Sending** (send all requests)
6. **Per-Broker Status Tracking** (record what was sent)
7. **Save/Load Progress** (persist across sessions)

Everything else builds on top of this chain.

---

## MVP Recommendation

### Must ship (Phase 1):

1. **Broker database** with 100+ entries compiled from open-source lists (table stakes)
2. **Temp email creation** via mail.tm API (the differentiator)
3. **One-click bulk sending** with legally accurate GDPR templates (table stakes + core value)
4. **Per-broker status tracking** with deadline calculation (table stakes)
5. **Save/load progress** to local JSON file (table stakes)
6. **Dashboard overview** showing sent/responded/overdue counts (table stakes)

### Should ship (Phase 2):

7. **Automated response detection** via temp inbox polling (differentiator)
8. **Overdue broker notifications** (table stakes)
9. **30-day deadline tracking with visual indicators** (table stakes)
10. **Region-aware templates** (GDPR + CCPA at minimum) (table stakes)

### Defer to Phase 3+:

11. **Escalation templates** for overdue brokers (differentiator)
12. **DPA directory with complaint links** (differentiator)
13. **Legal reference pages** (differentiator)
14. **Identity verification pushback guide** (differentiator)
15. **Broker categorization** (differentiator)
16. **Temp email auto-cleanup** (differentiator)

### Rationale for ordering:

- Phase 1 delivers the end-to-end flow: enter info, send requests, track progress. This is the minimum that makes the tool useful.
- Phase 2 adds the monitoring loop: poll for responses, detect what happened, alert on overdue. This closes the "set and forget" gap.
- Phase 3 adds the escalation and education layer: what to do when brokers ignore you, legal knowledge, and cleanup.

---

## Competitive Positioning Matrix

| Capability | ErasureKit | data-eraser | JustDeleteMe | datarequests.org | Incogni | DeleteMe |
|-----------|-----------|-------------|--------------|------------------|---------|----------|
| **Price** | Free | Free | Free | Free | $96/yr | $129/yr |
| **Real email protected** | Yes (temp) | No (Gmail) | N/A | No (user sends) | Yes (proxy) | Yes (proxy) |
| **Broker coverage** | 100+ (v1) | 750+ | 500+ links | Company DB | 420+ | 750+ |
| **Auto-send emails** | Yes | Yes | No (links only) | No (generates letter) | Yes | Yes |
| **Response tracking** | Yes | Partial | No | No | Yes | Yes |
| **Deadline tracking** | Yes | No | No | No | Internal | Internal |
| **Escalation templates** | Yes | No | No | Yes (complaint gen) | Internal | Internal |
| **Portable / no server** | Yes | No (needs Gmail) | Yes (static site) | Yes (static site) | No (SaaS) | No (SaaS) |
| **Open source** | Yes | Yes | Yes | Yes | No | No |
| **Recurring removals** | Manual re-run | Manual re-run | N/A | N/A | Auto (60-90 days) | Auto (quarterly) |

ErasureKit's unique position: **the only tool that auto-sends erasure requests while protecting the user's real email, tracking deadlines, and running entirely client-side with no server or account required.**

---

## Sources

- [DeleteMe Review - Security.org](https://www.security.org/data-removal/deleteme/)
- [Incogni Review - Security.org](https://www.security.org/data-removal/incogni/)
- [Optery Review - Security.org](https://www.security.org/data-removal/optery/)
- [Aura Data Removal Service](https://www.aura.com/data-removal-service)
- [Privacy Bee Review - allaboutcookies.org](https://allaboutcookies.org/privacy-bee-review)
- [Mine (saymine.com)](https://www.saymine.com/)
- [JustDeleteMe](https://justdeleteme.xyz/)
- [JustDeleteMe GitHub](https://github.com/justdeleteme/justdelete.me)
- [Redact.dev Features](https://redact.dev/features)
- [datarequests.org](https://www.datarequests.org/)
- [datarequests.org Open Source](https://www.datarequests.org/open-source/)
- [data-eraser (kjmutsch) GitHub](https://github.com/kjmutsch/data-eraser)
- [JustVanish GitHub](https://github.com/AnalogJ/justvanish)
- [Visible Labs databroker_remover GitHub](https://github.com/visible-cx/databroker_remover)
- [Big Ass Data Broker Opt-Out List (BADBOOL)](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List)
- [California DROP Portal](https://privacy.ca.gov/drop/about-drop-and-the-delete-act/)
- [GDPR Article 17 full text](https://gdpr-info.eu/art-17-gdpr/)
- [EDPB 2025 Erasure Enforcement Focus](https://www.compliancepoint.com/privacy/gdpr-right-to-erasure-an-enforcement-priority-in-2025/)
- [GDPR Identity Verification - IAPP](https://iapp.org/news/a/how-to-verify-identity-of-data-subjects-for-dsars-under-the-gdpr)
- [datarequests.org Sample Erasure Letter](https://www.datarequests.org/blog/sample-letter-gdpr-erasure-request/)
- [Best Data Removal Services 2026 - Security.org](https://www.security.org/data-removal/best/)
- [Incogni vs Optery - Surfshark](https://surfshark.com/blog/incogni-vs-optery)
- [Aura Review - CyberInsider](https://cyberinsider.com/data-removal/aura-data-removal-review/)
