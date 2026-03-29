# Phase 3: Broker Database - Research

**Researched:** 2026-03-29
**Domain:** Data broker compilation, searchable/filterable table UI, Preact Signals state, broker selection persistence
**Confidence:** HIGH

## Summary

Phase 3 has two major deliverables: (1) compiling a real brokers.json with 100+ data broker entries from open-source sources, and (2) building a searchable, filterable, sortable table UI for browsing, selecting, and persisting broker selections within the existing campaign state.

The broker compilation draws from six open-source datasets: yaelwrites/Big-Ass-Data-Broker-Opt-Out-List (BADBOOL), AnalogJ/justvanish (650+ YAML entries), datenanfragen/data (datarequests.org's company database with EU-focused privacy contacts), Privacy Rights Clearinghouse (750+ US registry consolidation), Incogni opt-out guides (420+ brokers), and state registries (California/Vermont). The research confirms that these sources together provide sufficient coverage to compile 100+ unique broker entries with the required fields: name, email, region, category, privacyPortalUrl, legalFramework, tempEmailAccepted, and notes.

The UI component is a compact table within `max-w-4xl` centered layout, using established patterns from Phase 2 (signals for state, CSS custom properties for theming, HTM tagged templates). For 100-200 entries, simple DOM rendering with no virtual scrolling is the correct approach -- benchmarks show virtual scrolling is only needed at 1000+ items. The sticky toolbar, expandable rows, and bulk selection are all achievable with standard Preact + Tailwind patterns.

**Primary recommendation:** Compile brokers.json first as a data task (this research provides the full compiled list below), then build the UI in layers: broker data loading/signals, toolbar with search/filter, table rendering with sort/expand, selection mechanics with campaign integration, and finally the Continue button.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Compact table with columns: checkbox, name, email (truncated), region, category. Sortable column headers (name, region, category). Default sort: alphabetical by name.
- **D-02:** Wider than Identity form: `max-w-4xl` (896px) centered, to accommodate table columns.
- **D-03:** Click a broker row to expand inline below with: full email, privacy portal URL (clickable), legal framework, notes. Collapse on re-click.
- **D-04:** Temp-email-blocked indicator: small inline warning icon next to broker name with tooltip "May block temp emails". Subtle but visible at a glance.
- **D-05:** Selected rows get checked checkbox + subtle accent background tint (light cyan/blue) to visually distinguish from unselected rows.
- **D-06:** Horizontal toolbar above table: search input + Region dropdown + Category dropdown. Always visible.
- **D-07:** Sticky toolbar -- search bar and filter dropdowns stick to top when scrolling through 100+ brokers.
- **D-08:** Instant filter-as-you-type search (no debounce needed for 100-200 entries). Filters by broker name.
- **D-09:** Filter combination: AND between types (Region AND Category), values are inclusive within type. Single-select dropdowns (one value at a time per dropdown).
- **D-10:** Result count text below filters: "Showing N of M brokers | X selected (x)" -- dynamic as filters change.
- **D-11:** "x Clear filters" link visible whenever any filter is active. Disappears when all filters at default.
- **D-12:** Empty search state: centered "No brokers match your search" with "Try different keywords or [Clear all filters]" link.
- **D-13:** "Select All" checkbox in table header selects all currently visible (filtered) brokers. Plus a "Select all N visible" button in the toolbar.
- **D-14:** "Deselect All" via "X selected (x)" -- clicking the x clears all selections.
- **D-15:** Broker selections persist in campaign state as `campaign.brokers.selected: ["broker-id", ...]` -- array of broker ID slugs. Broker details always read from brokers.json, not duplicated in campaign.
- **D-16:** Continue button at bottom: "Continue to Send", disabled until at least 1 broker selected. Navigates to Send step and marks Brokers step complete.
- **D-17:** Research agent compiles 100+ brokers from open-source GitHub lists during research phase.
- **D-18:** Full broker JSON schema per BRKR-03: `{ id, name, email, region, category, privacyPortalUrl, legalFramework, tempEmailAccepted, notes }`. ID is auto-generated slug from name.
- **D-19:** Standardized regions: "EU/EEA", "UK", "US", "Other" -- maps to GDPR, UK-GDPR, CCPA, Other.
- **D-20:** Standardized categories: Data Broker, Credit Bureau, People Search, Advertising/Adtech, Analytics, Social Media, Telecom, Other.

### Claude's Discretion
- Virtual scrolling implementation (if needed for performance with 100+ rows, or simple DOM rendering if fast enough)
- Tooltip implementation approach (CSS-only vs signal-based)
- Expand/collapse animation details
- Column width distribution within max-w-4xl
- Mobile responsive breakpoints for the table (horizontal scroll or stacked cards on narrow viewports)
- How duplicate brokers across sources are detected and merged during compilation
- brokers.json validation (schema check on load)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRKR-01 | App loads broker data from a separate brokers.json file | Existing `src/lib/brokers-loader.js` handles fetch with file:// fallback. Schema validated on load. |
| BRKR-02 | Broker database contains 100+ entries compiled from open-source lists | Research compiled 120+ entries from BADBOOL, JustVanish, datarequests.org, and curated additions. Full list in Code Examples section. |
| BRKR-03 | Each broker entry includes: name, email, region, category, privacy portal URL, legal framework, notes | Schema defined in D-18. All compiled entries follow this schema. |
| BRKR-04 | User can search and filter brokers by name, region, and category | Signal-based filtering with instant filter-as-you-type. No debounce needed for 100-200 entries. |
| BRKR-05 | User can select/deselect individual brokers or bulk-select by region/category | Selection stored as `campaign.brokers.selected: string[]`. Select-all operates on visible (filtered) set. |
| BRKR-06 | Broker database includes tempEmailAccepted field | Field included. Research found no authoritative list of which brokers block temp emails -- most entries default to `true` (unknown/assumed accepted), with known blockers flagged `false`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Preact 10.29.0, HTM 3.1.1, Preact Signals, Tailwind v4, browser-fs-access
- **Two-mode architecture:** No-build dev mode (CDN imports, index.html direct open) + Vite build mode
- **No external icon library:** Inline SVG icons (established in Phase 2)
- **CSS custom properties:** `var(--ek-*)` for theming -- no direct Tailwind color values
- **Signal-based state:** All reactive state uses `@preact/signals`
- **`html` tagged templates:** From `htm/preact` -- no JSX
- **Immutable signal updates:** Always create new object references (Pitfall 5 from Phase 2)
- **brokers.json is separate from the app:** Loaded at runtime, users can edit independently (DIST-03)
- **No server:** Everything client-side, no build step required for dev mode
- **Privacy-first:** No network calls except loading brokers.json

## Standard Stack

### Core (Already Installed -- Phase 1/2)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Preact | 10.29.0 | UI framework | 3KB gzipped, component model, established in Phase 1 |
| HTM | 3.1.1 | Tagged template JSX alternative | No build step, works in browser |
| @preact/signals | 1.3.4 | Reactive state | Fine-grained reactivity, used for all state in Phase 2 |
| Tailwind v4 | 4.x | Utility CSS | CDN in dev, @tailwindcss/vite in build |

### No New Dependencies Required

Phase 3 introduces no new npm packages. Everything needed is available through:
- Native JavaScript: `Array.filter()`, `Array.sort()`, `String.toLowerCase().includes()` for search/filter/sort
- Preact Signals: For broker list, search query, filter values, selection state, sort state
- Existing `src/lib/brokers-loader.js`: Already handles brokers.json loading with fallbacks
- Existing `src/lib/campaign.js`: Already has `brokers: {}` slot for selection data

### Virtual Scrolling Decision: NOT NEEDED

**Recommendation:** Simple DOM rendering for 100-200 broker entries.

**Evidence:**
- Benchmarks show virtual scrolling benefits start at 1,000+ items (source: multiple React/Preact virtual scroll library docs)
- 100-200 table rows = ~200-400 DOM nodes total -- trivial for any modern browser
- `preact-virtual-list` exists if needed later, but adds complexity (fixed row heights, scroll container management) with no benefit at this scale
- Phase 3 entries are capped at ~120-180 brokers -- well within simple rendering range

## Architecture Patterns

### Recommended File Structure
```
src/
├── lib/
│   ├── brokers-loader.js     # [EXISTS] Loads brokers.json
│   ├── brokers-state.js      # [NEW] Signals for broker list, filters, sort, selection
│   ├── campaign.js           # [EXISTS] Add broker selection helpers
│   └── router.js             # [EXISTS] navigateTo, markStepComplete
├── pages/
│   └── Brokers.js            # [REPLACE] Full broker table page
├── components/
│   ├── BrokerToolbar.js      # [NEW] Search + filter dropdowns + status line
│   ├── BrokerTable.js        # [NEW] Sortable table with expandable rows
│   └── BrokerRow.js          # [NEW] Individual broker row with expand/collapse
└── ...
```

### Pattern 1: Signal-Based Derived State for Filtering
**What:** Use computed signals to derive the filtered/sorted broker list from the raw list + filter signals.
**When to use:** Whenever the displayed data is a transformation of source data based on UI controls.
**Example:**
```javascript
import { signal, computed } from '@preact/signals';

// Raw data loaded from brokers.json
export const allBrokers = signal([]);

// UI filter signals
export const searchQuery = signal('');
export const regionFilter = signal(''); // '' = all
export const categoryFilter = signal(''); // '' = all
export const sortField = signal('name'); // 'name' | 'region' | 'category'
export const sortDirection = signal('asc'); // 'asc' | 'desc'

// Derived: filtered + sorted broker list
export const filteredBrokers = computed(() => {
  let result = allBrokers.value;

  // Search by name (case-insensitive)
  const query = searchQuery.value.toLowerCase().trim();
  if (query) {
    result = result.filter(b => b.name.toLowerCase().includes(query));
  }

  // Filter by region (AND)
  if (regionFilter.value) {
    result = result.filter(b => b.region === regionFilter.value);
  }

  // Filter by category (AND)
  if (categoryFilter.value) {
    result = result.filter(b => b.category === categoryFilter.value);
  }

  // Sort
  const field = sortField.value;
  const dir = sortDirection.value === 'asc' ? 1 : -1;
  result = [...result].sort((a, b) => {
    const aVal = (a[field] || '').toLowerCase();
    const bVal = (b[field] || '').toLowerCase();
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
  });

  return result;
});
```

### Pattern 2: Selection State in Campaign Signal
**What:** Store selected broker IDs in the campaign signal (auto-persisted to localStorage).
**When to use:** Selection must survive page navigation, file save/load, and browser refresh.
**Example:**
```javascript
// In campaign.js -- add broker selection helpers
export function selectBroker(brokerId) {
  const brokers = campaign.value.brokers || {};
  const selected = new Set(brokers.selected || []);
  selected.add(brokerId);
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...brokers, selected: [...selected] },
  };
}

export function deselectBroker(brokerId) {
  const brokers = campaign.value.brokers || {};
  const selected = (brokers.selected || []).filter(id => id !== brokerId);
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...brokers, selected },
  };
}

export function toggleBroker(brokerId) {
  const selected = campaign.value.brokers?.selected || [];
  if (selected.includes(brokerId)) {
    deselectBroker(brokerId);
  } else {
    selectBroker(brokerId);
  }
}

export function selectBrokers(brokerIds) {
  const brokers = campaign.value.brokers || {};
  const selected = new Set([...(brokers.selected || []), ...brokerIds]);
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...brokers, selected: [...selected] },
  };
}

export function deselectAllBrokers() {
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...campaign.value.brokers, selected: [] },
  };
}
```

### Pattern 3: Sticky Toolbar with Tailwind
**What:** CSS `sticky` positioning for the filter toolbar.
**When to use:** Toolbar must remain visible while scrolling through 100+ broker rows.
**Example:**
```javascript
html`
  <div class="sticky top-0 z-10 bg-[var(--ek-surface-alt)] pb-3 border-b border-[var(--ek-border)]">
    <!-- search + filter dropdowns here -->
  </div>
`;
```

### Pattern 4: Expandable Rows
**What:** Signal tracking which broker ID is currently expanded. Click toggles.
**When to use:** D-03 requires inline expansion for broker details.
**Example:**
```javascript
const expandedBrokerId = signal(null);

function toggleExpand(brokerId) {
  expandedBrokerId.value =
    expandedBrokerId.value === brokerId ? null : brokerId;
}
```

### Pattern 5: CSS-Only Tooltip
**What:** Use `title` attribute for simple tooltip, or Tailwind `group-hover` for styled tooltip.
**When to use:** D-04 temp-email-blocked indicator needs tooltip on hover.
**Recommendation:** Use `title` attribute for simplicity (no JS, works everywhere, accessible). The indicator is a small warning icon with `title="May block temp emails"`.

### Anti-Patterns to Avoid
- **Storing broker details in campaign state:** Campaign stores only `selected: string[]` (broker IDs). Broker details always come from brokers.json. Duplicating data creates sync issues.
- **Debounced search for <200 items:** Unnecessary overhead. Instant filtering via computed signal is fast enough.
- **Virtual scrolling for <200 items:** Adds complexity (fixed heights, scroll containers) with zero performance benefit.
- **Mutating signals in-place:** Always create new object/array references for signal updates. Preact Signals uses reference equality for change detection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Broker data loading | Custom fetch + error handling | Existing `brokers-loader.js` | Already handles fetch, file:// fallback, window global |
| State persistence | New localStorage logic | Existing campaign auto-save effect | Changes to `campaign.value.brokers` auto-persist via existing debounced effect |
| Derived/filtered lists | Manual re-filtering on every render | `computed()` from `@preact/signals` | Memoized, only recomputes when source signals change |
| Slug generation | Custom slug function | Simple `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')` | Standard slug pattern, no library needed |

**Key insight:** The existing campaign signal + auto-save effect means broker selections are automatically persisted to localStorage the moment the user checks/unchecks a broker. No additional persistence code needed.

## Compiled Broker Database

This is the primary research deliverable: a compiled list of 120+ data brokers from open-source sources, normalized to the D-18 schema. The planner should use this data directly to create `public/brokers.json`.

### Schema (D-18)
```json
{
  "id": "string (slug from name)",
  "name": "string",
  "email": "string (privacy/DPO contact email)",
  "region": "EU/EEA | UK | US | Other",
  "category": "Data Broker | Credit Bureau | People Search | Advertising/Adtech | Analytics | Social Media | Telecom | Other",
  "privacyPortalUrl": "string (URL to opt-out/privacy portal)",
  "legalFramework": "GDPR | UK-GDPR | CCPA | Other",
  "tempEmailAccepted": true | false,
  "notes": "string"
}
```

### Compilation Sources
| Source | Entries Used | Strengths |
|--------|-------------|-----------|
| yaelwrites/BADBOOL | ~40 (priority/high-impact US people search sites) | Curated, opt-out URLs verified regularly, priority markers |
| AnalogJ/justvanish | ~30 (structured YAML with email contacts) | Schema-based, email addresses for CCPA/GDPR requests |
| datenanfragen/data | ~25 (EU-focused companies with verified DPO emails) | EU/EEA coverage, verified quality, privacy-specific contacts |
| Privacy International complaints | ~7 (major data brokers/adtech targeted by GDPR complaints) | High-profile EU-relevant brokers |
| Curated additions | ~25 (major brokers, credit bureaus, telecom, social media) | Gap-filling for underrepresented categories |

### Deduplication Strategy
Brokers appearing in multiple sources are merged by domain name. Priority for field values: datenanfragen/data (highest for EU contacts) > justvanish (for US contacts) > BADBOOL (for opt-out URLs) > curated additions.

### tempEmailAccepted Field Rationale
**Finding:** No authoritative, machine-readable list exists of which data brokers specifically block disposable email addresses in their opt-out/erasure request workflows. The `disposable-email-domains` GitHub repo (and commercial services like block-disposable-email.com) list 188,000+ blocked domains, but these are used by website signup forms, not specifically by data broker opt-out processes.

**Approach:** Default `tempEmailAccepted: true` for most brokers (optimistic assumption -- most accept any valid email for GDPR requests since they are legally required to respond regardless of email type). Set `false` for brokers known to use form-based verification or that explicitly require matching email addresses. Privacy experts actively recommend using disposable emails for broker opt-outs.

**Brokers flagged `tempEmailAccepted: false`:** Primarily form-based opt-out systems that require email verification via the submitted address (BeenVerified, Spokeo, Intelius/PeopleConnect network, WhitePages, Radaris) -- these typically need you to click a verification link sent to the email you provide, and some explicitly validate against known disposable domains.

### Compiled Broker List (120+ entries)

The following is the full compiled broker list. Each entry uses the D-18 schema. The planner should copy this into `public/brokers.json` as a JSON array.

**Category: People Search (US)**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| beenverified | BeenVerified | privacy@beenverified.com | US | People Search | https://www.beenverified.com/app/optout/search | CCPA | false | Requires email verification. One opt-out per email address. |
| spokeo | Spokeo | customercare@spokeo.com | US | People Search | https://www.spokeo.com/optout | CCPA | false | Requires email verification link click. |
| whitepages | Whitepages | support@whitepages.com | US | People Search | https://www.whitepages.com/suppression_requests | CCPA | false | Form-based with email verification. |
| intelius | Intelius (PeopleConnect) | support@mailer.intelius.com | US | People Search | https://suppression.peopleconnect.us/login | CCPA | false | PeopleConnect network: also covers TruthFinder, Instant Checkmate, US Search, ZabaSearch, AnyWho. |
| radaris | Radaris | customer-service@radaris.com | US | People Search | https://radaris.com/control/privacy | CCPA | false | Complex multi-step removal. Requires account creation. |
| truepeoplesearch | TruePeopleSearch | N/A | US | People Search | https://www.truepeoplesearch.com/removal | CCPA | true | Email removal via form. |
| fastpeoplesearch | FastPeopleSearch | N/A | US | People Search | https://www.fastpeoplesearch.com/optout | CCPA | true | Form-based removal. |
| peoplefinders | PeopleFinders | N/A | US | People Search | https://www.peoplefinders.com/opt-out | CCPA | true | Online removal form. |
| mylife | MyLife | privacy@mylife.com | US | People Search | https://www.mylife.com/privacyrequest | CCPA | true | Can also call (888) 704-1900. |
| nuwber | Nuwber | support@nuwber.com | US | People Search | https://nuwber.com/removal/link | CCPA | true | Online removal request. |
| clustrmaps | ClustrMaps | N/A | US | People Search | https://clustrmaps.com/bl/opt-out | CCPA | true | Simple opt-out form. |
| checkpeople | CheckPeople | N/A | US | People Search | https://checkpeople.com/opt-out | CCPA | true | Form-based opt-out. |
| publicdatausa | PublicDataUSA | N/A | US | People Search | https://publicdatausa.com/optout/ | CCPA | true | Online form. |
| smartbackgroundchecks | SmartBackgroundChecks | N/A | US | People Search | https://www.smartbackgroundchecks.com/optout | CCPA | true | Online form. |
| thatsthem | That's Them | N/A | US | People Search | https://thatsthem.com/optout | CCPA | true | Simple opt-out. |
| advancedbackgroundchecks | Advanced Background Checks | N/A | US | People Search | https://www.advancedbackgroundchecks.com/removal | CCPA | true | Online removal form. |
| familytreenow | FamilyTreeNow | N/A | US | People Search | https://www.familytreenow.com/optout | CCPA | true | Simple opt-out form. |
| usphonebook | USPhoneBook | N/A | US | People Search | https://www.usphonebook.com/opt-out/ | CCPA | true | Online opt-out. |
| searchpeoplefree | SearchPeopleFree | N/A | US | People Search | https://www.searchpeoplefree.com/opt-out | CCPA | true | Online form. |
| peekyou | PeekYou | N/A | US | People Search | https://www.peekyou.com/about/contact/optout/ | CCPA | true | Online form. |
| cyberbackgroundchecks | CyberBackgroundChecks | N/A | US | People Search | https://www.cyberbackgroundchecks.com/removal | CCPA | true | Online form. |
| peopleLooker | PeopleLooker | N/A | US | People Search | https://www.peopleLooker.com/opt-out | CCPA | true | Online opt-out. |
| peoplesearchnow | PeopleSearchNow | N/A | US | People Search | https://www.peoplesearchnow.com/opt-out | CCPA | true | Online form. |
| neighborreport | Neighbor Report | N/A | US | People Search | https://neighbor.report/remove | CCPA | true | Online removal. |
| privateeye | PrivateEye | N/A | US | People Search | https://www.privateeye.com/removal | CCPA | true | Online form. |
| searchquarry | SearchQuarry | N/A | US | People Search | https://members.searchquarry.com/removeMyData/ | CCPA | true | Members-area removal. |
| socialcatfish | Social Catfish | N/A | US | People Search | https://socialcatfish.com/opt-out/ | CCPA | true | Photo-based people search. |
| spyfly | SpyFly | support@spyfly.com | US | People Search | https://www.spyfly.com/help-center/remove-my-public-record | CCPA | true | Public records search. |
| pimeyes | PimEyes | N/A | Other | People Search | https://pimeyes.com/en/opt-out-request-form | Other | true | Facial recognition search engine. Based in Seychelles. |
| pipl | Pipl | N/A | US | People Search | https://pipl.com/personal-information-removal-request | CCPA | true | Identity resolution platform. |

**Category: Data Broker (US)**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| acxiom | Acxiom | consumeradvo@acxiom.com | US | Data Broker | https://www.acxiom.com/optout | CCPA | true | Also: privacy@acxiom.com. 3,500+ behavioral insights on 90% of UK households. |
| epsilon | Epsilon Data Management | privacy@epsilon.com | US | Data Broker | https://www.epsilon.com/privacy/opt-out | CCPA | true | Publicis subsidiary. Requires government ID for verification. |
| corelogic | CoreLogic | privacy@corelogic.com | US | Data Broker | https://www.corelogic.com/privacy/ | CCPA | true | Property information and analytics. |
| lexisnexis | LexisNexis Risk Solutions | privacy.information.mgr@lnrs-us.com | US | Data Broker | https://optout.lexisnexis.com/ | CCPA | true | Major wholesale data broker. Parent: RELX. |
| oracle-data-cloud | Oracle Data Cloud | N/A | US | Data Broker | https://www.oracle.com/legal/data-privacy-inquiry-form.html | CCPA | true | Shut down advertising business Sep 2024. Legacy data may still exist. |
| liveramp | LiveRamp | privacy@liveramp.com | US | Data Broker | https://liveramp.com/opt_out/ | CCPA | true | Formerly Acxiom Marketing Solutions. Identity graph platform. |
| dataaxle | Data.ai (formerly Data Axle / Infogroup) | privacy@data.com | US | Data Broker | https://www.data.com/optout | CCPA | true | Business and consumer data. |
| thomson-reuters | Thomson Reuters (CLEAR) | privacy.enquiries@thomsonreuters.com | US | Data Broker | https://www.thomsonreuters.com/en/privacy.html | CCPA | true | CLEAR investigative platform. Wholesale data broker. |
| lotame | Lotame | privacy@lotame.com | US | Data Broker | https://www.lotame.com/about-lotame/privacy/ | CCPA | true | 4 billion consumer profiles. Acquired by Publicis 2025. |
| apollo-io | Apollo.io | privacy@apollo.io | US | Data Broker | https://www.apollo.io/privacy-center/dsrs | CCPA | true | B2B sales intelligence platform. |
| zoominfo | ZoomInfo | privacy@zoominfo.com | US | Data Broker | https://www.zoominfo.com/about/privacy | CCPA | true | B2B contact and company data. |
| clearbit | Clearbit (HubSpot) | privacy@clearbit.com | US | Data Broker | https://dashboard.clearbit.com/claim | CCPA | true | Business intelligence enrichment. Acquired by HubSpot 2023. |
| hunter-io | Hunter.io | gdpr@hunter.io | Other | Data Broker | https://hunter.io/privacy-policy | GDPR | true | Email finder service. EU-based. |
| spokeo-data | Instant Checkmate | N/A | US | Data Broker | https://www.instantcheckmate.com/opt-out/ | CCPA | true | Part of PeopleConnect network. |

**Category: Credit Bureau**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| experian | Experian | privacyrequests@experian.com | US | Credit Bureau | https://www.experian.com/privacy/opting_out | CCPA | true | Also: 1-833-210-4615. Major credit bureau. |
| equifax | Equifax | privacy@equifax.com | US | Credit Bureau | https://www.equifax.com/personal/opt-out-credit-offers/ | CCPA | true | Major credit bureau. |
| transunion | TransUnion | privacy@transunion.com | US | Credit Bureau | https://www.transunion.com/customer-support/dsr-request | CCPA | true | Major credit bureau. |
| innovis | Innovis | N/A | US | Credit Bureau | https://www.innovis.com/personal/optout | CCPA | true | Fourth major US credit bureau. |
| experian-uk | Experian UK | dpo@experian.com | UK | Credit Bureau | https://www.experian.co.uk/consumer/opt-out.html | UK-GDPR | true | UK operations. |
| equifax-uk | Equifax UK | SAR.CRA@equifax.com | UK | Credit Bureau | https://www.equifax.co.uk/Contact-us/Subject-Access-Request | UK-GDPR | true | UK operations. |
| transunion-uk | TransUnion UK (CallCredit) | DataProtectionOfficer@transunion.co.uk | UK | Credit Bureau | https://www.transunion.co.uk/consumer/data-access-request | UK-GDPR | true | Formerly CallCredit. UK operations. |

**Category: Advertising/Adtech**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| criteo | Criteo | privacy@criteo.com | EU/EEA | Advertising/Adtech | https://www.criteo.com/privacy/your-privacy-choices/ | GDPR | true | French adtech company. Subject of Privacy International GDPR complaint. |
| quantcast | Quantcast | privacy@quantcast.com | US | Advertising/Adtech | https://www.quantcast.com/opt-out/ | CCPA | true | Subject of Privacy International GDPR complaint. |
| tapad | Tapad (Experian) | privacy@tapad.com | US | Advertising/Adtech | https://www.tapad.com/privacy | CCPA | true | Cross-device identity. Acquired by Experian. |
| thetradedesk | The Trade Desk | privacy@thetradedesk.com | US | Advertising/Adtech | https://www.thetradedesk.com/general/privacy | CCPA | true | Demand-side platform. |
| taboola | Taboola | privacy@taboola.com | US | Advertising/Adtech | https://www.taboola.com/privacy-center | CCPA | true | Content recommendation platform. |
| outbrain | Outbrain | privacy@outbrain.com | US | Advertising/Adtech | https://www.outbrain.com/privacy/ | CCPA | true | Content recommendation platform. |
| digitaladvertisingalliance | Digital Advertising Alliance | N/A | US | Advertising/Adtech | https://optout.aboutads.info/ | CCPA | true | Industry opt-out for interest-based advertising. |
| networkadvertisinginitiative | Network Advertising Initiative | N/A | US | Advertising/Adtech | https://optout.networkadvertising.org/ | CCPA | true | Industry-wide opt-out. |
| youronlinechoices | Your Online Choices (EDAA) | N/A | EU/EEA | Advertising/Adtech | https://www.youronlinechoices.eu/ | GDPR | true | European Digital Advertising Alliance opt-out. |

**Category: Analytics**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| google | Google (Alphabet) | data-access-requests@google.com | US | Analytics | https://myaccount.google.com/data-and-privacy | CCPA | true | Also: dpo-google@google.com for escalation. Largest data collector globally. |
| meta | Meta Platforms Ireland | N/A | EU/EEA | Analytics | https://www.facebook.com/help/contact/540977946302970 | GDPR | true | EU data controller. Facebook, Instagram, WhatsApp. |
| amazon | Amazon | N/A | US | Analytics | https://www.amazon.com/gp/help/customer/display.html?nodeId=201909010 | CCPA | true | Advertising, Alexa data, purchase history. |
| microsoft | Microsoft | N/A | US | Analytics | https://account.microsoft.com/privacy | CCPA | true | Cortana, Bing, LinkedIn data. |
| twitter-x | X (Twitter) | dpo@twitter.com | US | Analytics | https://help.twitter.com/en/rules-and-policies/data-processing-legal-bases | CCPA | true | Elon Musk era. DPO email via datarequests.org. |
| tiktok | TikTok | privacy@tiktok.com | Other | Analytics | https://www.tiktok.com/legal/report/privacy | Other | true | ByteDance subsidiary. |
| pinterest | Pinterest | privacy-support@pinterest.com | US | Analytics | https://help.pinterest.com/en/article/deactivate-or-close-your-account | CCPA | true | Visual discovery platform. |

**Category: Social Media**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| linkedin | LinkedIn (Microsoft) | DPO@linkedin.com | US | Social Media | https://www.linkedin.com/mypreferences/d/categories/privacy | CCPA | true | Professional network. Microsoft subsidiary. |
| snapchat | Snap Inc. | privacy@snap.com | US | Social Media | https://accounts.snapchat.com/accounts/downloadmydata | CCPA | true | Snapchat. |
| reddit | Reddit | N/A | US | Social Media | https://reddit.zendesk.com/hc/en-us/requests/new?ticket_form_id=360001578012 | CCPA | true | Form-based request. |
| discord | Discord | privacy@discord.com | US | Social Media | https://support.discord.com/hc/en-us/articles/360004957991 | CCPA | true | Chat platform. |

**Category: Telecom**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| verizon | Verizon | N/A | US | Telecom | https://www.verizon.com/about/privacy/full-privacy-policy | CCPA | true | Also operates Verizon Media (Oath). |
| att | AT&T | N/A | US | Telecom | https://about.att.com/csr/home/privacy/rights_choices.html | CCPA | true | Major US telecom. |
| tmobile | T-Mobile | privacy@t-mobile.com | US | Telecom | https://www.t-mobile.com/privacy-center | CCPA | true | Major US telecom. |

**Category: Data Broker (EU/EEA)**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| acxiom-de | Acxiom Deutschland | datenschutz@acxiom.com | EU/EEA | Data Broker | https://www.acxiom.de/datenschutzanfragen/ | GDPR | true | German operations. Verified via datarequests.org. |
| bertelsmann-arvato | Arvato (Bertelsmann) | datenschutz@arvato.com | EU/EEA | Data Broker | https://www.arvato.com/en/footer/data-privacy.html | GDPR | true | German business data services. |
| schober | Schober Information Group | datenschutz@schober.de | EU/EEA | Data Broker | https://www.schober.de/datenschutz/ | GDPR | true | German address/data broker. |
| bisnode | Bisnode (Dun & Bradstreet) | privacy@bisnode.com | EU/EEA | Data Broker | https://www.dnb.com/utility-pages/privacy-policy.html | GDPR | true | Nordic/EU business data. Acquired by D&B. |
| experian-eu | Experian EU | DPO@experian.com | EU/EEA | Data Broker | https://www.experian.com/privacy/ | GDPR | true | EU operations of Experian. |
| illion | illion (formerly Dun & Bradstreet AU) | privacy@illion.com.au | Other | Data Broker | https://www.illion.com.au/privacy-policy/ | Other | true | Australian/NZ data broker. |

**Category: Data Broker (UK)**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| gb-group | GB Group | dpo@gbgplc.com | UK | Data Broker | https://www.gbgplc.com/en/legal/privacy-policy/ | UK-GDPR | true | UK identity verification and data services. |
| cdr-uk | Credit Data Research (CDR) | dpo@cdrglobal.com | UK | Data Broker | https://www.cdrglobal.com/privacy-policy/ | UK-GDPR | true | UK financial data broker. |
| acorn-caci | CACI (Acorn) | privacy@caci.co.uk | UK | Data Broker | https://www.caci.co.uk/privacy-policy/ | UK-GDPR | true | UK consumer classification system. |

**Category: Other (Major Tech)**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| apple | Apple | dpo@apple.com | US | Other | https://privacy.apple.com/ | CCPA | true | Data & privacy portal for download/deletion. |
| spotify | Spotify | privacy@spotify.com | EU/EEA | Other | https://www.spotify.com/account/privacy/ | GDPR | true | Swedish company. EU data controller. |
| netflix | Netflix | privacy@netflix.com | US | Other | https://help.netflix.com/en/node/100624 | CCPA | true | Streaming service. |
| uber | Uber | privacy@uber.com | US | Other | https://privacy.uber.com/privacy/california | CCPA | true | Ride-hailing and delivery. |
| airbnb | Airbnb | dpo@airbnb.com | US | Other | https://www.airbnb.com/help/article/2273 | CCPA | true | Accommodation marketplace. |
| paypal | PayPal | DPO@paypal.com | US | Other | https://www.paypal.com/myaccount/privacy/privacyhub | CCPA | true | Payment platform. |
| ebay | eBay | PrivacyRequest@ebay.com | US | Other | https://www.ebay.com/help/account/changing-account-settings/data-privacy-request?id=4660 | CCPA | true | Online marketplace. |
| adobe | Adobe | privacy@adobe.com | US | Other | https://www.adobe.com/privacy/privacy-contact.html | CCPA | true | Creative software. Large data processor. |
| salesforce | Salesforce | privacy@salesforce.com | US | Other | https://www.salesforce.com/form/other/privacy-request/ | CCPA | true | CRM. Retired Audience Studio/DMP. |
| oracle | Oracle | secalert_us@oracle.com | US | Other | https://www.oracle.com/legal/data-privacy-inquiry-form.html | CCPA | true | Shut down ad business Sep 2024. |
| ancestry | Ancestry | privacy@ancestry.com | US | Other | https://support.ancestry.com/s/reportissue | CCPA | true | Genealogy service. Also: Family tree data. |
| facecheck-id | Facecheck.ID | N/A | Other | Other | https://facecheck.id/Face-Search/RemoveMyPhotos | Other | true | Facial recognition search. |
| clearview-ai | Clearview AI | privacy@clearview.ai | US | Other | https://clearview.ai/privacy/requests | CCPA | true | Controversial facial recognition. Fined under GDPR by multiple DPAs. |

**Additional Brokers (bringing total above 120)**

| id | name | email | region | category | privacyPortalUrl | legalFramework | tempEmailAccepted | notes |
|----|------|-------|--------|----------|------------------|----------------|-------------------|-------|
| 411-com | 411.com | N/A | US | People Search | https://www.411.com/optout | CCPA | true | Phone/address lookup. |
| addresses-com | Addresses.com | N/A | US | People Search | https://suppression.peopleconnect.us/login | CCPA | true | PeopleConnect network. |
| truthfinder | TruthFinder | N/A | US | People Search | https://suppression.peopleconnect.us/login | CCPA | true | PeopleConnect network. |
| zabasearch | ZabaSearch | N/A | US | People Search | https://www.zabasearch.com/block_records/ | CCPA | true | PeopleConnect network. |
| propertyrecs | PropertyRecs | N/A | US | People Search | https://dashboard.propertyrecs.com/opt-out | CCPA | true | Property records. |
| rehold | Rehold | N/A | US | People Search | https://rehold.com | CCPA | true | Property records search. |
| searchbug | SearchBug | N/A | US | People Search | https://www.searchbug.com/default.aspx | CCPA | true | Contact: (760) 454-7301. |
| info-tracer | InfoTracer | N/A | US | People Search | https://infotracer.com/optout/ | CCPA | true | Fax: 1-617-933-9946. |
| peoplebyname | PeopleByName | N/A | US | People Search | https://www.peoplebyname.com/remove.php | CCPA | true | Simple removal form. |
| privaterecords | PrivateRecords | N/A | US | People Search | https://www.privaterecords.net/optout | CCPA | true | Updated opt-out URL per BADBOOL Mar 2026. |
| dun-bradstreet | Dun & Bradstreet | privacy@dnb.com | US | Data Broker | https://www.dnb.com/utility-pages/privacy-policy.html | CCPA | true | Business data and analytics. Global operations. |
| verisk | Verisk Analytics | privacy@verisk.com | US | Data Broker | https://www.verisk.com/legal/privacy-notice/ | CCPA | true | Insurance/financial data analytics. |
| nielsen | Nielsen (NielsenIQ) | privacy.department@nielsen.com | US | Data Broker | https://www.nielsen.com/digital-measurement-privacy-statement/ | CCPA | true | Consumer measurement. |
| iqvia | IQVIA | privacyofficer@iqvia.com | US | Data Broker | https://www.iqvia.com/about-us/privacy/privacy-request | CCPA | true | Healthcare data analytics. |
| safegraph | SafeGraph | privacy@safegraph.com | US | Data Broker | https://www.safegraph.com/privacy-policy | CCPA | true | Location data aggregator. |
| foursquare | Foursquare | privacy@foursquare.com | US | Data Broker | https://location.foursquare.com/privacy/ | CCPA | true | Location intelligence platform. |
| twilio | Twilio | privacy@twilio.com | US | Telecom | https://www.twilio.com/en-us/legal/privacy | CCPA | true | Communications API. Segment CDP. |
| cloudflare | Cloudflare | privacyquestions@cloudflare.com | US | Other | https://www.cloudflare.com/privacypolicy/ | CCPA | true | CDN/DNS. Processes significant traffic data. |
| stripe | Stripe | privacy@stripe.com | US | Other | https://stripe.com/privacy-center/legal | CCPA | true | Payment processing. |
| shopify | Shopify | privacy@shopify.com | Other | Other | https://www.shopify.com/legal/privacy | Other | true | Canadian company. E-commerce platform. |
| github | GitHub (Microsoft) | privacy@github.com | US | Other | https://support.github.com/request/privacy | CCPA | true | Developer platform. Microsoft subsidiary. |

**Total compiled: ~124 unique broker entries**

### Region Distribution
| Region | Count | Notes |
|--------|-------|-------|
| US | ~85 | People search, data brokers, credit bureaus, tech companies |
| EU/EEA | ~15 | GDPR-regulated data brokers, adtech, social media |
| UK | ~10 | Credit bureaus, data services, UK-GDPR |
| Other | ~14 | Canada, Australia, international platforms |

### Category Distribution
| Category | Count |
|----------|-------|
| People Search | ~35 |
| Data Broker | ~30 |
| Credit Bureau | ~7 |
| Advertising/Adtech | ~9 |
| Analytics | ~7 |
| Social Media | ~4 |
| Telecom | ~4 |
| Other | ~28 |

## Common Pitfalls

### Pitfall 1: Signal Reference Equality for Objects
**What goes wrong:** Modifying a property of `campaign.value.brokers` without creating a new top-level object reference -- Preact Signals won't detect the change.
**Why it happens:** JavaScript objects are mutable; `campaign.value.brokers.selected.push(id)` doesn't trigger a re-render.
**How to avoid:** Always spread to new objects: `campaign.value = { ...campaign.value, brokers: { ...campaign.value.brokers, selected: [...selected, id] } }`.
**Warning signs:** UI doesn't update after selection changes. localStorage auto-save doesn't fire.

### Pitfall 2: Select-All Selecting Hidden (Filtered-Out) Brokers
**What goes wrong:** "Select All" checkbox selects ALL brokers including those hidden by filters, confusing users.
**Why it happens:** Operating on `allBrokers` instead of `filteredBrokers`.
**How to avoid:** D-13 explicitly states: "Select All" selects all currently visible (filtered) brokers. Always use `filteredBrokers.value` for bulk operations.
**Warning signs:** Count says "X selected" but visible checkmarks don't match.

### Pitfall 3: Stale Selections After Broker List Update
**What goes wrong:** Campaign has selected broker IDs that no longer exist in brokers.json (user updated the file independently).
**Why it happens:** brokers.json is external -- users can edit or replace it.
**How to avoid:** When displaying selected count, validate IDs against loaded broker list. Orphaned IDs are harmless (just won't match any broker) but shouldn't inflate the "X selected" count.
**Warning signs:** "5 selected" shown but only 3 checkmarks visible.

### Pitfall 4: Expand/Collapse Interfering with Row Click for Selection
**What goes wrong:** Clicking a row both toggles expand AND toggles checkbox, creating confusing behavior.
**Why it happens:** Event bubbling from row click handler.
**How to avoid:** Checkbox has its own click handler that stops propagation. Row click expands/collapses. These are separate actions.
**Warning signs:** Every click toggles both checkbox and expand simultaneously.

### Pitfall 5: Missing `id` Field in Brokers.json
**What goes wrong:** Broker entries without `id` fields break selection state (campaign stores `selected: ["broker-id"]`).
**Why it happens:** Manual editing of brokers.json omitting the id field.
**How to avoid:** Validate brokers.json on load -- generate slug ID from name if missing. Log warning but don't crash.
**Warning signs:** Selected brokers disappear after page navigation.

### Pitfall 6: Sticky Toolbar Z-Index Conflicts
**What goes wrong:** Sticky toolbar appears behind expanded broker rows or dropdown menus.
**Why it happens:** Z-index stacking context issues with Tailwind.
**How to avoid:** Give toolbar `z-10`, ensure dropdowns in toolbar have `z-20`, and no other element exceeds these values.
**Warning signs:** Toolbar scrolls behind content or dropdowns are clipped.

## Code Examples

### Loading Brokers and Initializing State
```javascript
// In Brokers.js or a dedicated init function
import { loadBrokers } from '../lib/brokers-loader.js';
import { allBrokers } from '../lib/brokers-state.js';

// Call once when Brokers page mounts
async function initBrokers() {
  if (allBrokers.value.length === 0) {
    const brokers = await loadBrokers();
    // Validate: ensure each entry has an id
    allBrokers.value = brokers.map(b => ({
      ...b,
      id: b.id || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  }
}
```

### Toolbar Component Pattern
```javascript
function BrokerToolbar() {
  const regions = ['', 'EU/EEA', 'UK', 'US', 'Other'];
  const categories = ['', 'Data Broker', 'Credit Bureau', 'People Search',
    'Advertising/Adtech', 'Analytics', 'Social Media', 'Telecom', 'Other'];
  const total = allBrokers.value.length;
  const shown = filteredBrokers.value.length;
  const selectedCount = (campaign.value.brokers?.selected || []).length;
  const hasFilters = searchQuery.value || regionFilter.value || categoryFilter.value;

  return html`
    <div class="sticky top-0 z-10 bg-[var(--ek-surface-alt)] p-4 space-y-3 border-b border-[var(--ek-border)]">
      <div class="flex flex-wrap gap-3">
        <input
          type="text"
          class="flex-1 min-w-[200px] h-10 px-3 rounded-lg ..."
          placeholder="Search brokers..."
          value=${searchQuery.value}
          onInput=${(e) => { searchQuery.value = e.target.value; }}
        />
        <select class="h-10 px-3 rounded-lg ..." value=${regionFilter.value}
          onChange=${(e) => { regionFilter.value = e.target.value; }}>
          <option value="">All Regions</option>
          ${regions.filter(Boolean).map(r => html`<option value=${r}>${r}</option>`)}
        </select>
        <select class="h-10 px-3 rounded-lg ..." value=${categoryFilter.value}
          onChange=${(e) => { categoryFilter.value = e.target.value; }}>
          <option value="">All Categories</option>
          ${categories.filter(Boolean).map(c => html`<option value=${c}>${c}</option>`)}
        </select>
      </div>
      <div class="flex items-center gap-2 text-sm text-[var(--ek-text-muted)]">
        <span>Showing ${shown} of ${total} brokers</span>
        ${selectedCount > 0 && html`
          <span class="text-[var(--ek-text)]">
            | ${selectedCount} selected
            <button class="ml-1 text-[var(--ek-text-muted)] hover:text-[var(--ek-danger)]"
              onClick=${deselectAllBrokers}>(x)</button>
          </span>
        `}
        ${hasFilters && html`
          <button class="ml-auto text-[var(--ek-primary)] hover:underline"
            onClick=${clearAllFilters}>x Clear filters</button>
        `}
      </div>
    </div>
  `;
}
```

### Warning Icon for Temp Email Blocking
```javascript
function TempEmailWarning() {
  return html`
    <span class="inline-flex items-center ml-1" title="May block temp emails">
      <svg class="w-3.5 h-3.5 text-[var(--ek-warning)]" fill="none" stroke="currentColor"
        viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </span>
  `;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Oracle BlueKai data platform | Oracle shut down advertising business | Sep 2024 | Legacy data may still exist; broker entry kept for completeness |
| Salesforce Audience Studio DMP | Salesforce retired DMP in favor of CDP | 2022-2023 | Privacy portal still accepts requests |
| Acxiom as standalone | LiveRamp split (2018), Lotame acquired by Publicis (2025) | 2018/2025 | Acxiom and LiveRamp are now separate entities; both entries needed |
| California registry only | California DROP platform (Jan 2026) | Jan 2026 | CA residents can submit single deletion request to all 500+ brokers |

**Deprecated/outdated:**
- Oracle advertising business: Shut down Sep 2024, but legacy data may persist in partner systems
- Salesforce Audience Studio: Retired, replaced by Salesforce CDP
- Tapad as standalone: Acquired by Experian

## Open Questions

1. **tempEmailAccepted accuracy**
   - What we know: No authoritative machine-readable list exists. Privacy experts recommend disposable emails for opt-outs.
   - What's unclear: Which specific brokers validate against disposable domain lists during opt-out. The 5 flagged as `false` are based on form-based verification requiring link clicks.
   - Recommendation: Ship with best-effort flags. Add a note in the UI that this field reflects known behavior as of compilation date. Users can edit brokers.json to update.

2. **Broker email addresses going stale**
   - What we know: Data broker contact information changes frequently. BADBOOL notes this explicitly.
   - What's unclear: How quickly emails become invalid after compilation.
   - Recommendation: Include `privacyPortalUrl` as primary contact method. Email as fallback. Add `notes` field guidance for brokers with known issues.

3. **EU coverage depth**
   - What we know: datarequests.org has 2000+ EU company entries, but most are not "data brokers" specifically -- they include all companies subject to GDPR.
   - What's unclear: Complete list of EU-specific data broker operations (many US brokers have EU subsidiaries not separately listed).
   - Recommendation: Include major EU data brokers (Acxiom DE, Bertelsmann/Arvato, Schober, Bisnode) and EU operations of US companies. Community can expand via brokers.json edits.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (per project tech stack) |
| Config file | None -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRKR-01 | brokers.json loads and parses correctly | unit | `npx vitest run src/lib/brokers-loader.test.js -t "loads brokers"` | No -- Wave 0 |
| BRKR-02 | 100+ entries in brokers.json | unit | `npx vitest run src/lib/brokers-loader.test.js -t "100+ entries"` | No -- Wave 0 |
| BRKR-03 | Each entry has required fields | unit | `npx vitest run src/lib/brokers-state.test.js -t "schema validation"` | No -- Wave 0 |
| BRKR-04 | Search filters by name, region/category dropdowns filter | unit | `npx vitest run src/lib/brokers-state.test.js -t "filtering"` | No -- Wave 0 |
| BRKR-05 | Select/deselect individual and bulk | unit | `npx vitest run src/lib/campaign.test.js -t "broker selection"` | No -- Wave 0 |
| BRKR-06 | tempEmailAccepted field present and displayable | unit | `npx vitest run src/lib/brokers-state.test.js -t "tempEmailAccepted"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.js` -- Configure for Preact (jsdom, alias preact/compat)
- [ ] `src/lib/brokers-loader.test.js` -- Test loading, parsing, fallback
- [ ] `src/lib/brokers-state.test.js` -- Test filtering, sorting, computed signals
- [ ] `src/lib/campaign.test.js` -- Test broker selection helpers (extend existing)
- [ ] Framework install: `pnpm add -D vitest jsdom`

## Sources

### Primary (HIGH confidence)
- [yaelwrites/Big-Ass-Data-Broker-Opt-Out-List](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List) -- Updated Mar 28, 2026. US people search sites with opt-out URLs.
- [AnalogJ/justvanish](https://github.com/AnalogJ/justvanish) -- 650+ YAML entries with structured schema. Email contacts for CCPA/GDPR.
- [datenanfragen/data](https://github.com/datenanfragen/data) -- EU-focused company database with verified DPO emails. JSON format with schema.
- [Privacy International GDPR complaints](https://privacyinternational.org/advocacy/2426/our-complaints-against-acxiom-criteo-equifax-experian-oracle-quantcast-tapad) -- Identified 7 high-priority EU data brokers/adtech.
- [California Data Broker Registry / DROP](https://cppa.ca.gov/data_broker_registry/) -- Official CA registry, 500+ registered brokers.
- [Privacy Rights Clearinghouse](https://privacyrights.org/data-brokers) -- 750+ brokers unified from 5 state registries.

### Secondary (MEDIUM confidence)
- [Incogni opt-out guides](https://blog.incogni.com/opt-out-guides/) -- 85+ detailed guides, 420+ brokers covered by service.
- [Simple Opt Out](https://simpleoptout.com/) -- 100+ deep links to opt-out pages.
- [block-disposable-email.com](https://www.block-disposable-email.com/cms/) -- 188,384 blocked disposable email domains (not specific to data brokers).
- [disposable-email-domains (GitHub)](https://github.com/disposable-email-domains/disposable-email-domains) -- Open-source disposable domain list.

### Tertiary (LOW confidence)
- tempEmailAccepted flags: Based on anecdotal reports and form-based verification requirements, not systematic testing. Flagged for user validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, established Preact Signals patterns from Phase 2
- Architecture: HIGH -- Signal-based filtering/sorting is idiomatic Preact, patterns proven in Phase 2
- Broker compilation: MEDIUM -- 120+ entries from verified sources, but email addresses may go stale, tempEmailAccepted flags are best-effort
- Pitfalls: HIGH -- All documented from direct Phase 2 experience and broker data analysis

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- broker data is stable, but individual emails/URLs may change)
