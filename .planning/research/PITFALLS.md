# Domain Pitfalls

**Domain:** GDPR erasure automation / browser-based privacy tool
**Researched:** 2026-03-28

---

## Critical Pitfalls

Mistakes that cause architectural rewrites, legal liability, or complete feature failure.

### Pitfall 1: mail.tm Cannot Send Emails -- Receive-Only API

**What goes wrong:** The PROJECT.md assumes mail.tm will be used to "send legally-compliant erasure requests to all known data brokers in one click." mail.tm is a **receive-only** service. Its API supports creating accounts, receiving messages, and deleting accounts -- but has zero outgoing email capability. The FAQ explicitly states: "Unfortunately, we do not provide this feature." No SMTP, no send endpoint, nothing.

**Why it happens:** mail.tm markets itself as a "temporary email" service, which implies full email functionality. The distinction between "disposable inbox" and "full email" is not obvious until you read the API docs carefully.

**Consequences:** The entire core value proposition -- "sends legally-compliant erasure requests to all known data brokers in one click" -- is architecturally impossible with mail.tm alone. If discovered late, this requires a complete rethink of the sending mechanism.

**Prevention:**
- Accept that the app needs a **two-service architecture**: one service for sending (e.g., EmailJS, SMTP.js, or mailto: links as fallback) and mail.tm for receiving responses.
- Alternative: Use `mailto:` links to open the user's default email client with pre-filled templates (the current prototype already does this). This is the most portable, zero-dependency approach but loses the "one-click automation" value.
- Alternative: Use EmailJS (free tier: 200 emails/month, 2 templates, 50KB limit) for programmatic sending from the browser. But this introduces a dependency on a third-party service with strict limits -- 200 emails/month is only enough for ~6 brokers per user if you count follow-ups and escalations.
- Best approach: Design the architecture to support multiple sending strategies (mailto, EmailJS, user's own SMTP) with a pluggable interface. Default to the simplest option and let users upgrade.

**Detection:** Try calling any "send" endpoint in the mail.tm API. It does not exist. The API docs list only: domains, accounts, messages (read), and sources.

**Phase impact:** Phase 1 (architecture). This must be resolved before any code is written. The sending mechanism is the most critical architectural decision.

**Confidence:** HIGH -- verified via mail.tm official docs and FAQ.

---

### Pitfall 2: mail.tm Has Severe Reliability Problems

**What goes wrong:** mail.tm experiences frequent outages. SaaSHub tracks ongoing reports from users worldwide: "Nothing is loading" (Mongolia, Egypt, Belarus, South Korea), "unable to receive emails" (India, UK, Japan, Netherlands, Chile, Tunisia). Multiple reports surface daily.

**Why it happens:** mail.tm is a free service with no SLA, no paid tier, and no public status page. Free temp email services are frequently targeted by abuse, blocked by ISPs, or simply under-resourced. Messages are stored for only 7 days.

**Consequences:** If mail.tm is down when a user needs to check broker responses, they lose visibility into their erasure campaign. If it is down for more than 7 days, messages are permanently lost. Users may miss the window to detect non-compliance.

**Prevention:**
- Never make mail.tm the single point of failure. Design a provider abstraction layer that can swap between mail.tm, mail.gw (identical API), and potentially self-hosted alternatives.
- Implement aggressive local caching: every time the app polls for messages, store the full message content locally (not just metadata). If the service goes down, the user still has their data.
- Display clear service health indicators in the UI. If the API is unreachable, show a warning immediately.
- The 7-day message retention means the app MUST poll frequently (at minimum daily) and persist messages locally. Relying on the server as long-term storage is not viable.

**Detection:** Monitor API response times and error rates. Track mail.tm status at saashub.com/mail-tm-status. If >50% of API calls fail over a 24-hour period, the service is in an outage state.

**Phase impact:** Phase 1-2 (architecture + email monitoring). The provider abstraction and local caching must be designed early.

**Confidence:** HIGH -- verified via SaaSHub status reports and community issue trackers.

---

### Pitfall 3: The Deadline is "One Calendar Month," Not "30 Days"

**What goes wrong:** The existing prototype and reference material both say companies have "exactly 30 days to respond." This is legally incorrect. GDPR Article 12(3) specifies "one calendar month," which varies between 28 and 31 days depending on the month. Additionally, if the end date falls on a weekend or public holiday, it extends to the next working day.

**Why it happens:** "30 days" is the common shorthand used in blog posts and informal guides. The actual regulation uses calendar months, which is subtly but legally distinct.

**Consequences:**
- Users may flag brokers as non-compliant when they still have time remaining (false positive).
- Users may fail to escalate when the actual deadline has passed (false negative).
- If ErasureKit generates escalation letters citing "30 days" instead of "one calendar month per Article 12(3)," the letters are legally inaccurate, undermining the user's credibility.

**Prevention:**
- Implement proper calendar-month arithmetic: a request sent January 15 is due February 15; a request sent January 31 is due February 28 (or 29 in leap years).
- Account for weekends and public holidays in the user's jurisdiction (at minimum, do not flag a broker as overdue if the deadline falls on a Saturday/Sunday -- extend to Monday).
- Use "one calendar month" in all legal text, never "30 days."
- For system purposes, ICO recommends using 28 days as a safe internal deadline to ensure compliance within any calendar month.

**Detection:** Review all user-facing text, email templates, and deadline calculation code for references to "30 days" instead of "one calendar month."

**Phase impact:** Phase 2 (deadline tracking). The date calculation logic must be correct from the start.

**Confidence:** HIGH -- verified via ICO guidance, IAPP analysis, and GDPR Article 12(3) text.

---

### Pitfall 4: Temp Email Domains Are Actively Blacklisted by 188,000+ Services

**What goes wrong:** An entire industry exists to block disposable email addresses. Block-Disposable-Email.com tracks 188,384 known temp email domains as of March 2026. Many data brokers, corporate privacy portals, and web forms reject emails from known disposable domains. If a broker's opt-out portal or privacy email system uses one of these blacklists, erasure requests sent from mail.tm addresses will be silently dropped or rejected.

**Why it happens:** Companies use disposable email blockers to prevent spam, fake registrations, and abuse. Data brokers in particular have an adversarial relationship with deletion requests -- blocking temp emails is a convenient way to reduce the volume of requests they must process.

**Consequences:** Users send erasure requests and believe they are "pending" when the requests never arrived. The 30-day clock never starts ticking because the request was never received. Users waste time waiting for responses that will never come.

**Prevention:**
- Test each broker's email address and privacy portal with actual mail.tm domains before adding them to the broker database. Flag brokers known to reject temp emails.
- For brokers that reject temp emails, provide alternative opt-out methods: direct portal links, web form URLs, postal address templates.
- Consider recommending users create a dedicated (non-disposable) email address for GDPR requests instead of relying solely on temp email. A free Gmail/Outlook address used only for privacy requests is more reliable than any temp email service.
- Document in the broker database whether each broker accepts temp email, requires portal submission, or requires postal mail.

**Detection:** Send a test email from a mail.tm address to each broker. If no automated acknowledgment arrives within 48 hours, the broker likely blocks temp email or has a broken email system.

**Phase impact:** Phase 2-3 (broker database + sending). The broker database schema needs a field for "preferred contact method" and "temp email accepted."

**Confidence:** HIGH -- verified via block-disposable-email.com statistics and multiple commercial blocking services.

---

### Pitfall 5: CORS Will Block Browser-to-API Calls Without Careful Architecture

**What goes wrong:** The app is designed as a "no server" portable web app, meaning all API calls (to mail.tm, and potentially to email-sending services) must originate from the browser. While mail.tm does advertise CORS support, many email-sending APIs explicitly block browser-origin requests. SendGrid, for example, does not allow browser-based calls to their mail/send endpoint. Any API that requires an API key is fundamentally unsafe to call from the browser because the key would be visible in source code.

**Why it happens:** CORS is a browser security feature. API providers often intentionally disable CORS for sensitive endpoints (sending email, authentication) because exposing credentials in browser JavaScript is a security antipattern.

**Consequences:** The app appears to work in development (where CORS restrictions are often relaxed) but fails in production. Or: users discover that their API key is visible in the page source, leading to abuse.

**Prevention:**
- Accept that truly server-free email sending is fundamentally limited. The architecture options are:
  1. **`mailto:` links** -- zero server dependency, but requires user's email client, loses automation.
  2. **EmailJS** -- designed for browser-to-email, handles CORS and credentials on their servers. But limited free tier (200/month) and creates a third-party dependency.
  3. **CORS proxy** -- route API calls through a CORS proxy (e.g., cors-anywhere). But this introduces a server dependency, defeats "no server," and creates a single point of failure.
  4. **Service Worker as proxy** -- technically still client-side but does not bypass CORS.
- For mail.tm specifically: verify CORS headers on all endpoints used (account creation, message retrieval, account deletion). Test from an actual `file://` origin and `http://localhost` origin, not just development servers.
- Never embed API keys, SMTP credentials, or authentication tokens in client-side JavaScript. If a service requires a secret key, it cannot be used from the browser safely.

**Detection:** Open browser DevTools Network tab. Any request that returns a CORS error or requires an `Authorization` header with a static secret is a failure point.

**Phase impact:** Phase 1 (architecture). The entire app architecture depends on which APIs can actually be called from a browser.

**Confidence:** HIGH -- verified via MDN CORS documentation, SendGrid CORS policy, and security best practices.

---

### Pitfall 6: Email Templates Cite Wrong Articles or Use Legally Weak Language

**What goes wrong:** The existing prototype's email template has several legal weaknesses:
1. It says "GDPR Article 17" generically but does not specify which sub-paragraph of Art. 17(1) applies (consent withdrawal? data no longer necessary? unlawful processing?).
2. It does not cite Article 19 (obligation to notify third-party recipients).
3. It does not cite Article 12(3) (one-month response deadline).
4. It says "30 days" instead of "one calendar month."
5. It does not remind the controller of penalties under Article 83 for non-compliance.
6. It does not request confirmation under Article 12(4) that erasure has been completed or, if refused, the specific legal basis for refusal.

**Why it happens:** Template authors copy from blog posts rather than reading the actual GDPR text. Most online templates are simplified for accessibility, which sacrifices legal precision.

**Consequences:** Weak templates are easier for data brokers to ignore or dismiss. A legally precise request that cites the correct articles, specifies the legal basis, and reminds the controller of their obligations is harder to deflect. Poor templates may also confuse GDPR (EU Regulation 2016/679) with UK GDPR (retained EU law), which are legally distinct instruments.

**Prevention:**
- Base templates on datarequests.org's sample letter (CC0 licensed, legally reviewed, cites all relevant articles).
- Include specific Article references: Art. 17(1)(a)-(f) for the erasure grounds, Art. 17(2) for third-party notification obligation, Art. 19 for recipient notification, Art. 12(3) for the response deadline, Art. 12(4) for the obligation to inform of refusal reasons.
- Separate EU GDPR templates from UK GDPR templates. UK GDPR references "UK GDPR" (as retained EU law) and the ICO as the supervisory authority. EU GDPR references "Regulation (EU) 2016/679" and the relevant DPA.
- Have templates reviewed by someone with legal knowledge. At minimum, cross-reference with the ICO's official guidance and the EDPB's 2025 enforcement findings.

**Detection:** Compare every template against the actual GDPR articles cited. Verify that article numbers, paragraph references, and legal terminology are accurate.

**Phase impact:** Phase 2 (template creation). Templates should be among the most carefully crafted artifacts in the project.

**Confidence:** HIGH -- verified via GDPR text, datarequests.org templates, ICO guidance, and EDPB 2025 CEF findings.

---

## Moderate Pitfalls

### Pitfall 7: localStorage Is Fragile for Long-Running Campaigns

**What goes wrong:** The existing prototype stores all tracking data in localStorage. GDPR erasure campaigns run for weeks to months (30-day deadline per broker, extensions possible to 3 months, escalations add more time). localStorage is vulnerable to:
- Accidental clearing when users "Clear browsing data"
- Browser settings that auto-clear on close (Edge has this option)
- Private/incognito browsing (data destroyed when window closes)
- 5-10 MB size limit across all origins
- No backup/export mechanism (data trapped in one browser)

**Why it happens:** localStorage is the easiest persistence mechanism for a "no server" app. The prototype uses it as a quick-and-dirty solution.

**Consequences:** Users lose weeks of tracking progress. They cannot remember which brokers they contacted, when they contacted them, or which are overdue. They may re-send requests (annoying but not harmful) or miss overdue brokers entirely (harmful -- they lose their escalation window).

**Prevention:**
- Implement File System Access API (Chromium-only, ~30% browser compatibility) as the primary save mechanism, with a download-JSON/upload-JSON fallback for Firefox and Safari.
- Auto-export progress to a JSON file periodically (every session, or on every state change). Prompt the user to save.
- Use IndexedDB instead of localStorage for larger storage capacity and better durability (still cleared when user clears browsing data, but supports larger datasets and structured queries).
- Never rely on localStorage as the sole persistence mechanism for data that represents weeks of work.
- Display a clear warning if the app detects it is running in private/incognito mode.

**Detection:** Check `window.localStorage` availability and remaining quota on startup. Detect private browsing via storage behavior (write, close, re-check).

**Phase impact:** Phase 2-3 (persistence layer). Must be designed before the tracking dashboard is built.

**Confidence:** HIGH -- verified via MDN Storage API documentation, browser compatibility data.

---

### Pitfall 8: Data Brokers Actively Evade Deletion Requests

**What goes wrong:** A June 2025 UC Irvine study found that over 40% of data brokers fail to respond to deletion requests. A Senate investigation found brokers hiding opt-out pages from search engines using `noindex` directives. Some brokers use the excuse "the information you submitted doesn't match our records" to dodge requests. Some have disconnected phone numbers, bouncing email addresses, or inaccessible websites.

**Why it happens:** Data is the product. Deleting data directly reduces a broker's revenue. Without strong enforcement (which varies dramatically by jurisdiction), there is little incentive to comply promptly.

**Consequences:** Users of ErasureKit will have a significant percentage of brokers that simply never respond. If the app does not prepare users for this reality, they will feel the tool "doesn't work" when in fact the problem is broker non-compliance. The app must make the escalation path (DPA complaints) a first-class feature, not an afterthought.

**Prevention:**
- Set user expectations clearly: "Many brokers will not respond. This is not a failure of the tool -- it is a failure of the broker. Here is how to escalate."
- Build the escalation workflow as a core feature, not a nice-to-have. Include: follow-up email templates (after 30 days), formal DPA complaint letter generators (with the correct DPA for the user's country), and direct links to DPA complaint portals.
- Track broker response rates across the community (if possible). Flag brokers known to be non-responsive so users can prioritize escalation.
- Include the broker's registered jurisdiction in the database so users know which DPA has authority.

**Detection:** If a broker has not responded within one calendar month and no automated acknowledgment was received within 7 days, it is likely non-responsive.

**Phase impact:** Phase 3-4 (escalation features). The escalation system is arguably more important than the initial sending system, because it is the only tool users have against non-compliant brokers.

**Confidence:** HIGH -- verified via UC Irvine study, Senate investigation report, EDPB 2025 CEF findings.

---

### Pitfall 9: Broker Database Goes Stale Rapidly

**What goes wrong:** Data broker opt-out URLs, email addresses, and even company names change frequently. The Big Ass Data Broker Opt-Out List (the most maintained open-source list) is updated periodically but still has broken links. Some brokers merge, rebrand, or shut down. Others appear under new names. The existing prototype has hardcoded email addresses and portal URLs -- many will be broken within months.

**Why it happens:** The data broker industry is highly dynamic. Companies are acquired, rebranded, or shut down by enforcement actions. Privacy portals are redesigned. Some brokers intentionally change URLs to break automated tools.

**Consequences:** Users click "Send Email" and the email bounces. Users click "Opt-out Portal" and get a 404. The app feels unmaintained and untrustworthy. Worse: if the email address is wrong, the erasure request goes to a dead address and the 30-day clock never starts.

**Prevention:**
- Make `brokers.json` a separate, community-editable file (already in the plan -- good).
- Include a `lastVerified` date field for each broker entry. Display it in the UI so users know how fresh the data is.
- Include a `reportBroken` mechanism -- users can flag broken links, which updates the broker entry or generates a GitHub issue.
- Cross-reference multiple sources: yaelwrites/BADBOOL, The Markup dataset, Vermont/California registries, datarequests.org company database. Different sources catch different staleness.
- Consider automated link checking (a CI job that pings each broker URL monthly and flags 404s/redirects).

**Detection:** HTTP HEAD request to each broker portal URL. Any response other than 200 is a red flag. Email deliverability can be tested with a verification service.

**Phase impact:** Phase 2 (broker database). The schema and maintenance workflow must be designed for ongoing updates.

**Confidence:** HIGH -- verified via examination of open-source broker lists, Senate investigation findings on hidden opt-out pages.

---

### Pitfall 10: Identity Verification Demands from Brokers

**What goes wrong:** Some brokers will respond to erasure requests by demanding excessive identity verification -- passport copies, selfies with ID, notarized letters. The GDPR's proportionality principle (Article 12(6)) limits this, but brokers exploit it as a delay tactic. The Groupon enforcement case (Irish DPC) established that demanding ID without "reasonable doubts" is an Article 12(2) violation, but many brokers still do it.

**Why it happens:** Brokers use identity verification as friction to reduce the number of successful deletion requests. Some have legitimate security concerns (avoiding unauthorized deletions), but many use it as pure obstruction.

**Consequences:** Users receive verification demands and do not know how to respond. They either abandon the request (broker wins) or over-share personal information (privacy loss -- the opposite of the tool's purpose). Without guidance, users may send unredacted passport copies to data brokers, creating new privacy risks.

**Prevention:**
- Build an "Identity Verification Guide" as a core feature, not a footnote. Include:
  - What proportionate verification looks like (matching existing data, email confirmation)
  - What excessive verification looks like (ID copies for routine requests)
  - Template pushback response: "Please verify my identity using the data you already hold, as required by the proportionality principle under Article 12(6) GDPR."
  - How to redact documents if verification is genuinely needed (cover photo, ID number, add watermark)
  - When to escalate to the DPA (citing the Groupon/DPC precedent)
- Categorize broker response types in the tracking system: "confirmed," "rejected," "requested verification," "no response." Each type triggers different guidance.

**Detection:** If a broker responds with a verification request, the app should detect keywords (e.g., "identify," "verify," "passport," "ID") and surface the verification guide.

**Phase impact:** Phase 3 (response categorization + legal reference). The verification guide is essential for user empowerment.

**Confidence:** HIGH -- verified via Irish DPC Groupon decision, ICO guidance on identity verification, Article 12(6) text.

---

### Pitfall 11: Portable App Distribution Has No Update Mechanism

**What goes wrong:** The app is distributed as a static HTML/JS bundle with no server. Once a user downloads it, they have no way to know when a new version is available. The broker database goes stale, template bugs go unfixed, and security issues remain unpatched. Users run version 1.0 forever while version 2.3 has critical fixes.

**Why it happens:** "No server" means no push updates, no service worker with update checks (requires hosting), no auto-update mechanism. This is an inherent limitation of the portable distribution model.

**Consequences:** Users operate with stale broker data, buggy templates, or security vulnerabilities. The tool's effectiveness degrades over time without user action. Community contributions to `brokers.json` never reach existing users.

**Prevention:**
- Include a visible version number and "last updated" date in the app UI.
- On startup, if the app has internet access, make a lightweight check against a known URL (e.g., a GitHub raw file containing the latest version number). Display a non-intrusive notification: "A newer version is available at [URL]."
- Make the broker database loadable from an external URL as well as from a local file. Users can "refresh broker list" from GitHub without re-downloading the entire app.
- Consider GitHub Releases as the distribution mechanism. Users can subscribe to release notifications.
- Document a clear upgrade path in the README.

**Detection:** Compare `app.version` against `https://raw.githubusercontent.com/.../version.json`. If mismatch, display update banner.

**Phase impact:** Phase 4 (distribution + maintenance). Not critical for MVP but important for long-term viability.

**Confidence:** MEDIUM -- based on general portable app distribution patterns, no specific failures found.

---

## Minor Pitfalls

### Pitfall 12: Confusing EU GDPR with UK GDPR

**What goes wrong:** Post-Brexit, the UK operates under the "UK GDPR" (retained EU law under the Data Protection Act 2018), not the EU GDPR (Regulation 2016/679). The rights are currently identical, but the supervisory authority (ICO vs. DPAs), complaint processes, and legal citations differ. Mixing them in templates creates confusion and may undermine requests.

**Prevention:** Detect the user's region (or ask) and generate region-appropriate templates. UK templates should reference "UK GDPR" and the ICO. EU templates should reference "Regulation (EU) 2016/679" and the relevant national DPA. The UK's Data (Use and Access) Act (effective June 2025) may introduce further divergence -- monitor for changes.

**Phase impact:** Phase 2 (templates). Regional template variants should be built from the start.

**Confidence:** HIGH -- verified via ICO guidance and UK legal framework.

---

### Pitfall 13: Clock Start Date Ambiguity

**What goes wrong:** There is a genuine legal ambiguity about when the one-month clock starts. The ICO says "the day they receive the request." The EU Regulation 1182/71 interpretation says "the next day." The difference matters for deadline calculation. Additionally, if the broker requests identity verification, the clock may stop until verification is provided (per UK ICO guidance) or may not stop (per some EU DPA interpretations).

**Prevention:** Use the most conservative interpretation (clock starts on receipt day, not next day) to avoid flagging brokers as overdue prematurely. Display both the "conservative deadline" and "generous deadline" in the UI so users can make informed decisions. Note in the legal reference that clock-stopping for verification is jurisdiction-dependent.

**Phase impact:** Phase 2 (deadline calculation). Use conservative defaults with optional strict mode.

**Confidence:** MEDIUM -- genuine legal ambiguity exists between ICO and EU interpretations.

---

### Pitfall 14: File System Access API Has ~30% Browser Support

**What goes wrong:** The File System Access API (for save/load progress to local files) has a browser compatibility score of 30/100. It works in Chromium browsers (Chrome, Edge, Brave, Opera) but not in Firefox (partial support at best) or Safari. The API is still a Draft Community Group Report, not a W3C Recommendation.

**Prevention:** Already planned in PROJECT.md constraints: "only works in Chromium browsers (Chrome, Edge, Brave). Fallback: download/upload JSON." The fallback must be a first-class feature, not an afterthought. Consider using Google Chrome Labs' `browser-fs-access` library, which provides File System Access API with legacy fallback automatically. Test the fallback path in Firefox and Safari as thoroughly as the primary path.

**Phase impact:** Phase 2 (persistence). Use `browser-fs-access` library from the start to avoid writing two code paths manually.

**Confidence:** HIGH -- verified via caniuse.com and MDN documentation.

---

### Pitfall 15: Users May Accidentally Expose More PII Than Necessary

**What goes wrong:** The app asks for "name + email(s) to erase. Optional: phone, address." If users enter all optional fields and the erasure request template sends all of them to every broker, the user is providing personal information to brokers who may not already have it. This is the opposite of the tool's privacy purpose -- it could expand the user's data footprint rather than reduce it.

**Prevention:**
- Clearly explain to users that they should only provide information the broker already has. Different brokers have different data -- a people-search site has address and phone; a marketing company has email and browsing data.
- Allow per-broker field selection: "This broker already has my [name, email]. Do not send [phone, address]."
- Default to minimal information (name + email only) and let users add fields per broker if needed.
- Display a warning: "Sharing additional information may give this broker data they did not previously have."

**Phase impact:** Phase 2-3 (template personalization). The UI should make per-broker field selection easy without adding friction.

**Confidence:** MEDIUM -- logical inference from GDPR data minimization principles, not a documented failure case.

---

### Pitfall 16: US Brokers Are Not Subject to GDPR

**What goes wrong:** The broker database mixes EU/UK/Global brokers (subject to GDPR) with US-only brokers (subject to CCPA, state laws, or nothing at all). The existing prototype attempts to handle this by using "broader legal terminology" for US brokers, but GDPR Article 17 has no legal force over a US company with no EU presence. Sending a "GDPR erasure request" to a US-only broker is legally meaningless.

**Prevention:**
- Clearly tag each broker with the applicable legal framework: GDPR (EU), UK GDPR, CCPA (California), state privacy laws, or "no legal obligation."
- For US brokers, generate CCPA deletion requests (citing Cal. Civ. Code 1798.105) or state-specific templates where applicable, not GDPR templates.
- For brokers with no legal obligation, frame the request as a courtesy/voluntary opt-out, not a legal demand.
- Display the legal jurisdiction in the UI so users understand which requests carry legal weight and which are voluntary.

**Phase impact:** Phase 2 (templates + broker database). Legal framework per broker must be part of the schema.

**Confidence:** HIGH -- fundamental jurisdictional legal principle.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Architecture (Phase 1) | mail.tm cannot send email; CORS blocks sending APIs | Design two-service architecture: mail.tm for receiving, mailto/EmailJS for sending. Test CORS on all endpoints from `file://` origin. |
| Email Templates (Phase 2) | Wrong article citations; "30 days" instead of "one calendar month"; missing Art. 19/12(3)/12(4) references | Base on datarequests.org CC0 templates. Cross-reference every citation with actual GDPR text. Separate EU vs UK templates. |
| Deadline Tracking (Phase 2) | Calendar month vs 30 days; clock start ambiguity; weekend/holiday handling | Implement proper calendar-month arithmetic. Use conservative defaults (28-day internal target). |
| Broker Database (Phase 2) | Stale URLs; broken email addresses; temp email blacklisting; wrong jurisdictions | Add `lastVerified`, `preferredContactMethod`, `legalFramework` fields. Plan for community maintenance. |
| Persistence (Phase 2-3) | localStorage data loss; File System API incompatibility; private browsing | Use `browser-fs-access` library. Auto-export JSON. Detect incognito mode. |
| Response Monitoring (Phase 3) | mail.tm outages; 7-day message retention; no notification mechanism | Local message caching. Provider abstraction layer. Frequent polling with offline-first design. |
| Escalation (Phase 3-4) | 40%+ brokers never respond; users do not know how to escalate | Build escalation as first-class feature. Include DPA complaint generators with correct DPA per jurisdiction. |
| Identity Verification (Phase 3) | Brokers demand excessive ID; users over-share | Verification pushback guide. Per-broker response categorization. Redaction instructions. |
| Distribution (Phase 4) | No update mechanism; stale broker data in deployed copies | Version check against GitHub. Loadable external broker list. GitHub Releases for distribution. |
| PII Handling (All Phases) | Users expose more data to brokers than necessary | Per-broker field selection. Data minimization warnings. Default to minimal fields. |

---

## Sources

- [mail.tm API Documentation](https://docs.mail.tm/)
- [mail.tm FAQ](https://mail.tm/en/faq/) -- confirms no send capability
- [mail.tm Status Tracker (SaaSHub)](https://www.saashub.com/mail-tm-status) -- ongoing outage reports
- [Block-Disposable-Email.com](https://www.block-disposable-email.com/cms/) -- 188,384 blocked temp email domains
- [ICO Right to Erasure Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/)
- [ICO Time Limits for DSARs](https://ico.org.uk/for-the-public/time-limits-for-responding-to-data-protection-rights-requests/)
- [IAPP DSAR Deadline Calculation](https://iapp.org/news/a/dsars-do-you-know-how-to-calculate-your-legal-response-time-under-the-gdpr/) -- calendar month arithmetic
- [EDPB 2025 Coordinated Enforcement Action Results](https://www.mydata-trust.com/2026/03/20/erasure-requests-edpb/) -- 764 controllers assessed
- [Senate "Opt-Out Obstacles" Report (Feb 2026)](https://www.jec.senate.gov/public/_cache/files/7f821956-d826-4241-8196-be987cc1f06c/2026-02-27-jec-data-brokers-report-final.pdf) -- hidden opt-out pages, $20.9B identity theft losses
- [Proton: Data Brokers Don't Want to Delete Data](https://proton.me/blog/data-brokers-dont-delete-data) -- 40%+ non-response rate (UC Irvine study)
- [datarequests.org Sample Erasure Letter](https://www.datarequests.org/blog/sample-letter-gdpr-erasure-request/) -- CC0 licensed template with correct article citations
- [William Fry: Verifying Identity of Data Subjects](https://www.williamfry.com/knowledge/verifying-the-identity-of-a-data-subject-a-look-at-whats-reasonable-in-the-circumstances/) -- Groupon/DPC precedent
- [EmailJS Free Tier](https://www.emailjs.com/docs/faq/can-i-use-emailjs-for-free/) -- 200 emails/month, 2 templates
- [File System Access API (Can I Use)](https://caniuse.com/native-filesystem-api) -- 30% browser support
- [browser-fs-access (Google Chrome Labs)](https://github.com/GoogleChromeLabs/browser-fs-access) -- File System Access API with fallback
- [MDN Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [yaelwrites/Big-Ass-Data-Broker-Opt-Out-List](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List) -- community-maintained broker list
- [GDPRhub Article 17 Analysis](https://gdprhub.eu/Article_17_GDPR)
- [GDPR Article 12(3) Text](https://gdpr-library.com/article/12) -- response timeline and facilitation requirements
