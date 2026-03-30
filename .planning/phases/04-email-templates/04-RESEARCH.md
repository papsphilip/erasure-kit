# Phase 4: Email Templates - Research

**Researched:** 2026-03-30
**Domain:** GDPR/UK-GDPR/CCPA erasure email template generation, campaign data persistence, clipboard API, slide-in sidebar UI
**Confidence:** HIGH

## Summary

Phase 4 generates legally accurate, region-aware erasure request emails from identity data + broker data, previews them in a sidebar panel on the Brokers page, allows per-broker edits, and provides clipboard copy. The core work is: (1) a pure template-generation function mapping `(identity, broker) -> email text` with three distinct legal variants, (2) campaign schema extension to persist per-broker custom edits, (3) UI additions to the Brokers page (expandable drawer at top + right slide-in sidebar), and (4) clipboard utility with fallback.

This phase has no external dependencies -- template generation is a pure function, clipboard is a browser API, and all persistence uses the existing campaign signal + localStorage auto-save. The legal citations are well-documented in official GDPR/UK-GDPR/CCPA texts and have been verified against authoritative sources.

**Primary recommendation:** Build a `src/lib/template-engine.js` module exporting pure functions that accept identity and broker objects and return `{ subject, body }` strings. Use three distinct template functions (GDPR, UK-GDPR, CCPA) selected by `broker.legalFramework`. Persist per-broker edits in `campaign.value.brokers.templates` keyed by broker ID. Sidebar and drawer are UI components in `src/pages/Brokers.js` (or extracted sub-components).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** General/base template shown at the top of the Brokers page inside an expandable drawer
- **D-02:** Per-broker preview opens in a right side panel (slides in from the right). Broker table stays visible on the left
- **D-03:** Sidebar shows: To (broker email), Subject line, and the generated email body customized for that broker's region/legal framework
- **D-04:** No dedicated preview page or new wizard step -- templates live within the existing Brokers page
- **D-05:** Full legal citations: Art. 17(1), Art. 19, Art. 12(3), Art. 12(4). One paragraph per legal basis
- **D-06:** Three distinct template variants: EU/EEA (GDPR), UK (UK-GDPR), US (CCPA)
- **D-07:** Professional, assertive tone -- not aggressive but makes clear the user knows their legal rights
- **D-08:** Editable textarea in the per-broker sidebar
- **D-09:** Per-broker edits saved in campaign JSON, survive page refresh, file save/load, and session resume
- **D-10:** Editing one broker's template does not affect others -- independent copy once edited
- **D-11:** "Reset to default" action in sidebar to regenerate from base template
- **D-12:** "Copy to clipboard" button in sidebar next to editable textarea
- **D-13:** Inline "Copied!" confirmation that fades after ~2 seconds
- **D-14:** No bulk copy -- per-broker copy only
- **D-15:** All template state persists in campaign JSON via existing auto-save + file save/load
- **D-16:** Template generation is a pure function: no external dependencies, no API calls

### Claude's Discretion
- Template text structure and exact legal wording (must be legally accurate per TMPL-01/TMPL-03)
- Campaign JSON schema extension for template storage
- Sidebar width, animation, and responsive behavior on mobile
- Expandable drawer implementation at top of Brokers page
- Subject line format per region
- How the "general template" drawer relates to the per-broker sidebar

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMPL-01 | Legally accurate GDPR Art. 17 erasure emails citing Art. 17(1), Art. 19, Art. 12(3), Art. 12(4) | Exact article text verified from gdpr-info.eu; datarequests.org CC0 template as reference; three variant templates researched |
| TMPL-02 | Templates are region-aware: strict GDPR for EU/EEA, UK GDPR for UK, CCPA for US | Broker data confirms 4 legalFramework values (GDPR, UK-GDPR, CCPA, Other); UK-GDPR differences documented; CCPA 1798.105 text verified |
| TMPL-03 | Correct legal terminology: "one calendar month" (not "30 days") for response deadline | Art. 12(3) text verified: "within one month of receipt of the request"; CCPA uses 45 days |
| TMPL-04 | Templates include user's identity information (name + emails) | campaign.value.identity structure documented: fullName, emails[], phone, address |
| TMPL-05 | User can preview generated email text before sending | Sidebar panel design (D-02, D-03) with To/Subject/Body preview |
| TMPL-06 | User can copy email text to clipboard | navigator.clipboard.writeText with execCommand fallback; "Copied!" inline confirmation (D-13) |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Preact | ^10.29.0 | UI framework | Already installed, project standard |
| HTM | ^3.1.1 | Tagged template JSX | Already installed, no-build dev mode |
| @preact/signals | ^2.9.0 | Reactive state | Already installed, sidebar/drawer state management |
| Tailwind v4 | ^4.2.2 | Utility CSS | Already installed, styling all new UI |

### No New Dependencies

This phase requires **zero new npm packages**. Template generation is pure string concatenation. Clipboard uses browser-native `navigator.clipboard.writeText()` with `document.execCommand('copy')` fallback. Sidebar animation uses CSS transitions. All persistence uses the existing campaign signal + localStorage auto-save.

**Installation:** None needed. `pnpm install` not required.

## Architecture Patterns

### Recommended File Structure

```
src/
  lib/
    template-engine.js       # NEW: Pure template generation functions
    template-engine.test.js   # NEW: Unit tests for legal accuracy
    clipboard.js              # NEW: Clipboard utility with fallback
    campaign.js               # MODIFIED: Schema extension for templates
  pages/
    Brokers.js                # MODIFIED: Add drawer + sidebar UI
  components/
    TemplateDrawer.js         # NEW: Expandable general template preview
    TemplateSidebar.js        # NEW: Right slide-in per-broker panel
```

### Pattern 1: Pure Template Generation

**What:** Template engine is a pure function module with zero side effects. Each legal framework gets its own generator function.

**When to use:** Always -- D-16 mandates no external dependencies.

**Example:**

```javascript
// src/lib/template-engine.js

/**
 * Generate erasure request email for a broker.
 * @param {object} identity - { fullName, emails, phone, address }
 * @param {object} broker - { name, email, region, legalFramework, ... }
 * @returns {{ subject: string, body: string }}
 */
export function generateTemplate(identity, broker) {
  switch (broker.legalFramework) {
    case 'GDPR':     return generateGDPR(identity, broker);
    case 'UK-GDPR':  return generateUKGDPR(identity, broker);
    case 'CCPA':     return generateCCPA(identity, broker);
    default:         return generateGDPR(identity, broker); // "Other" falls back to GDPR
  }
}

function generateGDPR(identity, broker) {
  const subject = `Data Erasure Request - GDPR Article 17 - ${identity.fullName}`;
  const body = `To the Data Protection Officer at ${broker.name},

I am writing to request the erasure of all personal data ...
...Art. 17(1)...Art. 19...Art. 12(3)...Art. 12(4)...

${identity.fullName}
${identity.emails.filter(e => e.trim()).join(', ')}`;
  return { subject, body };
}
```

### Pattern 2: Campaign Schema Extension for Per-Broker Templates

**What:** Add a `templates` object to `campaign.value.brokers` keyed by broker ID. Only stores custom edits -- unedited brokers have no entry and always regenerate from the template engine.

**When to use:** Any broker the user has manually edited.

**Example:**

```javascript
// In campaign.js -- extend createEmptyCampaign()
brokers: {
  selected: [],
  templates: {},  // NEW: { [brokerId]: { body: string, editedAt: string } }
}

// In template-engine.js or a helper
export function getTemplateForBroker(identity, broker, customTemplates) {
  const custom = customTemplates?.[broker.id];
  if (custom && custom.body) {
    // User has edited this broker's template
    const generated = generateTemplate(identity, broker);
    return { subject: generated.subject, body: custom.body, isCustom: true };
  }
  return { ...generateTemplate(identity, broker), isCustom: false };
}
```

### Pattern 3: Signal-Based Sidebar State

**What:** Sidebar open/close state and active broker ID are module-level signals in the Brokers page, consistent with established patterns.

**Example:**

```javascript
// In Brokers.js or TemplateSidebar.js
const sidebarOpen = signal(false);
const activeBrokerId = signal(null);

function openSidebar(brokerId) {
  activeBrokerId.value = brokerId;
  sidebarOpen.value = true;
}

function closeSidebar() {
  sidebarOpen.value = false;
  activeBrokerId.value = null;
}
```

### Pattern 4: Clipboard Utility with Fallback

**What:** Async clipboard function that tries `navigator.clipboard.writeText()` first (secure context), falls back to `document.execCommand('copy')` via temporary textarea.

**Why:** ErasureKit can be opened from `file://` protocol (no-build dev mode) where `navigator.clipboard` is unavailable. The fallback ensures clipboard works everywhere.

**Example:**

```javascript
// src/lib/clipboard.js
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fall through to legacy method
    }
  }
  // Legacy fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch (err) {
    return false;
  } finally {
    textarea.remove();
  }
}
```

### Anti-Patterns to Avoid
- **Storing full generated templates in campaign JSON:** Only store user-edited overrides. Regenerate default templates on the fly. This keeps the JSON small and means legal text updates propagate automatically.
- **Mutating shared template state:** Editing broker A's template must never affect broker B. Each edit creates an independent copy stored by broker ID.
- **Using innerHTML for template preview:** Use `textContent` or a `<textarea>` / `<pre>` element. Email bodies are plain text, not HTML.
- **Building template strings with user input interpolation without escaping:** For the template body this is fine (plain text), but subject lines used in `mailto:` URIs in Phase 5 will need `encodeURIComponent`. Phase 4 generates text only; encoding is Phase 5's concern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard copy | Custom clipboard manager | `navigator.clipboard.writeText` + `execCommand` fallback | Browser APIs are sufficient; no library needed for text-only copy |
| Slide animation | Custom JS animation system | CSS `transform: translateX()` + `transition` | CSS transitions are performant, simple, and match the existing animation pattern |
| Legal text validation | Regex-based article citation checker | Unit tests with exact string assertions | Tests verify legal accuracy at build time; runtime validation is unnecessary |

**Key insight:** This phase is fundamentally about string generation and UI composition. All building blocks exist in the browser platform and the existing codebase. No new dependencies are needed.

## Legal Research: Exact Article Text

### GDPR Articles (for EU/EEA template)

**Article 17(1) -- Right to erasure:** "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay and the controller shall have the obligation to erase personal data without undue delay where one of the following grounds applies: (a) the personal data are no longer necessary in relation to the purposes for which they were collected or otherwise processed; (b) the data subject withdraws consent [...] (c) the data subject objects to the processing pursuant to Article 21(1) [...] (d) the personal data have been unlawfully processed; (e) the personal data have to be erased for compliance with a legal obligation in Union or Member State law to which the controller is subject; (f) the personal data have been collected in relation to the offer of information society services referred to in Article 8(1)."

**Article 19 -- Notification obligation:** "The controller shall communicate any rectification or erasure of personal data or restriction of processing carried out in accordance with Article 16, Article 17(1) and Article 18 to each recipient to whom the personal data have been disclosed, unless this proves impossible or involves disproportionate effort. The controller shall inform the data subject about those recipients if the data subject requests it."

**Article 12(3) -- Response deadline:** "The controller shall provide information on action taken on a request under Articles 15 to 22 to the data subject without undue delay and in any event within one month of receipt of the request." May extend by two further months for complex requests, with notification within one month.

**Article 12(4) -- Refusal obligation:** "If the controller does not take action on the request of the data subject, the controller shall inform the data subject without delay and at the latest within one month of receipt of the request of the reasons for not taking action and on the possibility of lodging a complaint with a supervisory authority and seeking a judicial remedy."

### UK GDPR Differences (for UK template)

The UK GDPR Article 17 is **substantively identical** to the EU GDPR Article 17 with these textual changes:
- "Union or Member State law" becomes "domestic law"
- EU institutional references (EDPB, EU DPAs) replaced with UK equivalents (ICO)
- Fines denominated in GBP (up to 17.5 million pounds) rather than EUR (20 million euros)
- Cross-references to other articles renumbered (Art. 89(1) becomes Art. 84B for archiving)
- Supplemented by the Data Protection Act 2018

The template should cite "UK GDPR" and "Data Protection Act 2018" and reference the ICO as the supervisory authority.

### CCPA Differences (for US template)

**California Civil Code Section 1798.105:** "A consumer shall have the right to request that a business delete any personal information about the consumer which the business has collected from the consumer."

Key differences from GDPR:
- Uses "personal information" not "personal data"
- Response deadline is **45 days** (not one calendar month)
- References "verifiable consumer request"
- No explicit "third-party notification" equivalent to Art. 19, but businesses must "direct any service providers to delete"
- Cites "Cal. Civ. Code Section 1798.105" not GDPR articles
- Also references the **California Delete Act** (effective 2026) for data brokers specifically
- Different tone: rights-assertion under California statute rather than EU regulation

### Template Structure Recommendation

Each template should contain these sections (one paragraph per legal basis, per D-05):

1. **Opening:** Formal request statement citing the applicable law
2. **Identification:** User's name and email addresses to be erased
3. **Art. 17(1) / Sec. 1798.105 paragraph:** The right to erasure/deletion and grounds
4. **Art. 19 / service provider paragraph:** Obligation to notify third parties
5. **Art. 12(3) / 45-day paragraph:** Response deadline with correct terminology
6. **Art. 12(4) / refusal paragraph:** Obligation to explain any refusal and provide remedy information
7. **Closing:** Request for written confirmation, signature

### Subject Line Format (by region)

- **GDPR (EU/EEA):** `Data Erasure Request - GDPR Article 17 - [Full Name]`
- **UK-GDPR:** `Data Erasure Request - UK GDPR Article 17 - [Full Name]`
- **CCPA (US):** `Personal Information Deletion Request - CCPA - [Full Name]`

## Broker Data Analysis

The brokers.json contains 169 entries with the following distribution:

| Legal Framework | Count | Template Used |
|-----------------|-------|---------------|
| GDPR | 58 | EU/EEA template |
| UK-GDPR | 15 | UK template |
| CCPA | 92 | US template |
| Other | 4 | Falls back to GDPR template |

| Region | Count |
|--------|-------|
| EU/EEA | 58 |
| UK | 15 |
| US | 92 |
| Other | 4 |

The `legalFramework` field (not `region`) should drive template selection, as it directly maps to the applicable legal regime.

### Broker Object Shape (from brokers.json)

```javascript
{
  id: "acxiom",           // Used as key for custom template storage
  name: "Acxiom",         // Used in template body and sidebar "To" field
  email: "consumer@acxiom.com",  // Used in sidebar "To" field
  region: "US",           // Displayed in sidebar header
  category: "Data Broker", // Informational
  privacyPortalUrl: "https://...",  // Not used in template
  legalFramework: "CCPA", // DRIVES template selection
  tempEmailAccepted: null, // Not used in template
  notes: "..."            // Not used in template
}
```

## Campaign Schema Extension

### Current Schema (from campaign.js)

```javascript
{
  version: 1,
  createdAt: "...",
  updatedAt: "...",
  identity: { fullName: "", emails: [""], phone: "", address: "" },
  brokers: { selected: [] },
  tempEmail: null,
  messages: [],
  statuses: {},
  settings: {}
}
```

### Proposed Extension

```javascript
{
  version: 2,  // Bump version for migration
  // ... existing fields ...
  brokers: {
    selected: [],
    templates: {
      // Only populated when user edits a broker's template
      // Key: broker ID slug, Value: custom edit data
      "acxiom": {
        body: "Custom edited text...",
        editedAt: "2026-03-30T12:00:00.000Z"
      }
    }
  }
}
```

**Migration path:** `migrateCampaign()` already merges with empty template via spread. Adding `templates: {}` to `createEmptyCampaign().brokers` will auto-fill on migration. Version bump to 2 ensures old files get the new `templates` key.

**Important:** The `subject` line is NOT stored per-broker because it follows a deterministic format based on region + name. Only the `body` text is customizable per D-08.

## Common Pitfalls

### Pitfall 1: Stale Identity Data in Templates

**What goes wrong:** User changes their name or email on the Identity page after already previewing templates. Generated templates show old identity data.
**Why it happens:** If templates are pre-generated and cached, they won't reflect identity changes.
**How to avoid:** Generate templates on-the-fly when the sidebar opens (or when identity signals change). Only store user edits, not generated defaults. Custom edits intentionally freeze the text at edit time -- the "Reset to default" button regenerates with current identity.
**Warning signs:** Template shows different name than Identity page.

### Pitfall 2: Signal Mutation Instead of Replacement

**What goes wrong:** Pushing to `campaign.value.brokers.templates[id] = {...}` mutates the existing object. Preact Signals requires full object replacement to trigger reactivity.
**Why it happens:** Established pattern in this codebase uses immutable updates (`campaign.value = { ...campaign.value, ... }`), but templates nested inside brokers require careful deep spreading.
**How to avoid:** Follow the existing immutable update pattern. Every template save should replace the full `brokers` object: `campaign.value = { ...campaign.value, brokers: { ...campaign.value.brokers, templates: { ...campaign.value.brokers.templates, [brokerId]: { body, editedAt } } } }`.
**Warning signs:** Auto-save effect doesn't fire; UI doesn't re-render after saving an edit.

### Pitfall 3: Clipboard Fails on file:// Protocol

**What goes wrong:** `navigator.clipboard.writeText()` requires a secure context (HTTPS or localhost). When opened via `file://` in no-build dev mode, clipboard API is unavailable.
**Why it happens:** Browser security policy restricts clipboard API to secure contexts.
**How to avoid:** Always implement the `document.execCommand('copy')` fallback. Check `window.isSecureContext` before attempting modern API.
**Warning signs:** "Copy to clipboard" silently fails with no feedback.

### Pitfall 4: Legal Inaccuracy -- "30 days" Instead of "One Calendar Month"

**What goes wrong:** Template says "30 days" instead of the legally correct "one calendar month" (TMPL-03).
**Why it happens:** Common misconception; even the reference material in `helpers/erasure-kit.md` incorrectly says "30 days".
**How to avoid:** Unit tests that assert the exact string "one calendar month" appears in GDPR/UK-GDPR templates. CCPA templates should assert "45 days" (or "forty-five days").
**Warning signs:** Any test that checks for "30 days" should fail.

### Pitfall 5: Sidebar Blocking Table Interaction

**What goes wrong:** Sidebar overlay covers the broker table, preventing selection/deselection while preview is open.
**Why it happens:** Using a full-screen overlay or making sidebar too wide.
**How to avoid:** Per D-02, the sidebar slides in from the right but the broker table stays visible on the left. Use a fixed-width sidebar (e.g., 400-480px) with the table shrinking or staying at its current width with horizontal scroll if needed. On mobile, sidebar takes full width as a bottom sheet or full overlay.
**Warning signs:** User can't click checkboxes while sidebar is open.

### Pitfall 6: Version Migration Not Bumped

**What goes wrong:** New `templates` field added to schema but `CURRENT_VERSION` not bumped. Loaded campaigns from Phase 3 don't get the `templates: {}` default.
**Why it happens:** Forgetting the migration step.
**How to avoid:** Bump `CURRENT_VERSION` to 2. The existing `migrateCampaign()` spread merge will auto-fill missing keys from the new empty template.
**Warning signs:** `campaign.value.brokers.templates` is `undefined` after loading an old campaign file.

## Code Examples

### Template Generation (GDPR variant -- verified against official article text)

```javascript
// Source: GDPR Art. 17(1), Art. 19, Art. 12(3), Art. 12(4) from gdpr-info.eu
function generateGDPR(identity, broker) {
  const emailList = identity.emails.filter(e => e.trim()).join('\n- ');
  const subject = `Data Erasure Request - GDPR Article 17 - ${identity.fullName}`;
  const body = `To the Data Protection Officer at ${broker.name},

I am writing to exercise my right to erasure of personal data under Article 17 of the General Data Protection Regulation (GDPR).

I hereby request that you erase all personal data concerning me that your organisation holds or processes. Under Article 17(1) GDPR, you are obligated to erase personal data without undue delay where the data is no longer necessary for the purposes for which it was collected, or where I withdraw my consent and there is no other legal ground for the processing.

My identifying information:
- Name: ${identity.fullName}
- Email address(es):
- ${emailList}${identity.phone ? `\n- Phone: ${identity.phone}` : ''}${identity.address ? `\n- Address: ${identity.address}` : ''}

In accordance with Article 19 GDPR, if you have disclosed my personal data to any third parties, I require you to communicate this erasure request to each recipient, unless this proves impossible or involves disproportionate effort. I also request that you inform me of those recipients.

Under Article 12(3) GDPR, you are required to respond to this request without undue delay and in any event within one calendar month of receipt. If you are unable to comply, Article 12(4) GDPR requires you to inform me of the reasons for not taking action and of my right to lodge a complaint with a supervisory authority and to seek a judicial remedy.

Please confirm in writing once the erasure has been completed.

Yours faithfully,
${identity.fullName}`;

  return { subject, body };
}
```

### Clipboard with Feedback Signal

```javascript
// Inline "Copied!" pattern consistent with Phase 2 auto-save indicator
const copiedBrokerId = signal(null);
let _copiedTimeout = null;

async function handleCopy(text, brokerId) {
  const success = await copyToClipboard(text);
  if (success) {
    copiedBrokerId.value = brokerId;
    if (_copiedTimeout) clearTimeout(_copiedTimeout);
    _copiedTimeout = setTimeout(() => {
      copiedBrokerId.value = null;
    }, 2000);
  }
}
```

### Campaign Template Update Helper

```javascript
// Follows existing immutable update pattern (Pitfall 2)
export function saveCustomTemplate(brokerId, body) {
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: {
      ...campaign.value.brokers,
      templates: {
        ...(campaign.value.brokers.templates || {}),
        [brokerId]: {
          body,
          editedAt: new Date().toISOString(),
        },
      },
    },
  };
}

export function resetBrokerTemplate(brokerId) {
  const templates = { ...(campaign.value.brokers.templates || {}) };
  delete templates[brokerId];
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: {
      ...campaign.value.brokers,
      templates,
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Baseline March 2025 | Modern API preferred, but fallback still needed for file:// context |
| datarequests.org single GDPR template | Region-specific templates (GDPR/UK-GDPR/CCPA) | This project | Different legal frameworks require substantially different citations and deadlines |
| GDPR "30 days" colloquial | GDPR "one calendar month" (Art. 12(3)) | Always was correct | Calendar month is the legal standard; 30 days is a common misconception |
| CCPA 30-day deadline | CCPA 45-day deadline (Cal. Civ. Code 1798.105) | CCPA text | 45 business days for CCPA deletion requests |

**Deprecated/outdated:**
- `document.execCommand('copy')` is officially deprecated but still functional in all browsers. Must be used as fallback for non-secure contexts.
- The reference prototype in `helpers/erasure-kit.md` uses a single template for all regions -- this phase implements three distinct templates per D-06.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.js` (exists, jsdom environment, Preact preset) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMPL-01 | GDPR template cites Art. 17(1), Art. 19, Art. 12(3), Art. 12(4) | unit | `npx vitest run src/lib/template-engine.test.js -t "GDPR" -x` | Wave 0 |
| TMPL-02 | Three distinct templates based on legalFramework | unit | `npx vitest run src/lib/template-engine.test.js -t "region" -x` | Wave 0 |
| TMPL-03 | "one calendar month" appears in GDPR/UK-GDPR; "45 days" in CCPA | unit | `npx vitest run src/lib/template-engine.test.js -t "terminology" -x` | Wave 0 |
| TMPL-04 | Templates include identity.fullName and identity.emails | unit | `npx vitest run src/lib/template-engine.test.js -t "identity" -x` | Wave 0 |
| TMPL-05 | Sidebar renders To/Subject/Body for active broker | unit | `npx vitest run src/lib/template-engine.test.js -t "preview" -x` | Wave 0 |
| TMPL-06 | copyToClipboard returns true and copies text | unit | `npx vitest run src/lib/clipboard.test.js -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/template-engine.test.js` -- covers TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05
- [ ] `src/lib/clipboard.test.js` -- covers TMPL-06

Existing test infrastructure (`vitest.config.js`, `campaign.test.js`, jsdom environment) is fully sufficient. No new framework setup needed.

## Open Questions

1. **"Other" Legal Framework Handling**
   - What we know: 4 brokers have `legalFramework: "Other"` and `region: "Other"`
   - What's unclear: Whether these should get a generic template or fall back to GDPR
   - Recommendation: Fall back to GDPR template as the most comprehensive. The user can always edit the generated text in the sidebar.

2. **Sidebar Width vs. Table Visibility on Small Screens**
   - What we know: D-02 says table stays visible on the left while sidebar is open
   - What's unclear: Exact breakpoint where sidebar behavior changes from side-panel to full-overlay
   - Recommendation: Desktop (>= 1024px): sidebar takes ~400px, table compresses. Tablet (768-1023px): sidebar overlays at ~400px with dimmed backdrop. Mobile (<768px): sidebar takes full width as a sheet.

3. **General Template Drawer Content**
   - What we know: D-01 says general/base template shown at top of Brokers page in expandable drawer
   - What's unclear: Whether this is the GDPR template specifically, or a generic structure overview
   - Recommendation: Show a read-only annotated GDPR template as the "base" since GDPR is the most comprehensive framework. Add a note that UK and US brokers receive adapted versions. This gives users confidence in the legal quality without overwhelming them with three variants.

## Project Constraints (from CLAUDE.md)

- **No server:** Template generation must be a pure function -- no API calls (D-16 confirms this)
- **Portable:** Templates are string literals in JS source; no external template files to load
- **Privacy-first:** Identity data used in templates never leaves the browser
- **Legal accuracy:** Email templates must cite correct GDPR articles and use legally appropriate language
- **Two-mode architecture:** Template engine works identically in no-build dev mode and Vite build mode (it's just JS)
- **Preact + HTM:** All components use `html` tagged templates from `htm/preact`
- **Signals for state:** Sidebar state, active broker, copied feedback all use Preact Signals
- **Inline SVG icons:** No external icon library (established pattern)
- **CSS-only animations:** 150-200ms transitions, no animation libraries
- **CSS custom properties:** Use `var(--ek-*)` tokens for all colors

## Sources

### Primary (HIGH confidence)
- [gdpr-info.eu Art. 17](https://gdpr-info.eu/art-17-gdpr/) -- Full Article 17 text verified
- [gdpr-info.eu Art. 12](https://gdpr-info.eu/art-12-gdpr/) -- Article 12(3) and 12(4) text verified
- [gdpr-info.eu Art. 19](https://gdpr-info.eu/art-19-gdpr/) -- Article 19 text verified
- [ICO Right to Erasure](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/) -- UK GDPR guidance
- [California Legislature CIV 1798.105](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.105.&lawCode=CIV) -- CCPA deletion right text
- [datarequests.org sample erasure letter](https://www.datarequests.org/blog/sample-letter-gdpr-erasure-request/) -- CC0 licensed template reference
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) -- writeText API docs
- Existing codebase: `src/lib/campaign.js`, `src/pages/Brokers.js`, `src/pages/Identity.js` -- established patterns

### Secondary (MEDIUM confidence)
- [web.dev clipboard patterns](https://web.dev/patterns/clipboard/copy-text) -- Clipboard copy best practices
- [Data Protection Commission Ireland](https://www.dataprotection.ie/en/individuals/know-your-rights/right-erasure-articles-17-19-gdpr) -- Art. 17 and 19 explanatory guidance
- [UK GDPR vs EU GDPR differences](https://www.gdpreu.org/differences-between-the-uk-and-eu-gdpr-regulations/) -- Textual differences catalogued

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries
- Architecture: HIGH -- patterns established in Phase 2/3, straightforward extension
- Legal content: HIGH -- verified against official regulation text from gdpr-info.eu and California Legislature
- Pitfalls: HIGH -- identified from existing codebase patterns and browser API constraints

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (legal text is stable; GDPR articles have not changed since 2018; CCPA amendments are tracked)
