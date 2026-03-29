# Phase 2: Identity Input and Persistence - Research

**Researched:** 2026-03-29
**Domain:** Preact Signals state management, browser-fs-access file persistence, localStorage auto-save, form validation
**Confidence:** HIGH

## Summary

Phase 2 introduces two interconnected systems: (1) an identity input form with real-time validation, and (2) a campaign persistence layer that spans localStorage auto-save, File System API file save/load via browser-fs-access, and a returning-user resume flow on the welcome screen. The existing codebase from Phase 1 establishes strong patterns -- signal-based state in `src/lib/`, HTM tagged templates for components, CSS custom properties for theming -- that Phase 2 extends naturally.

The campaign state architecture is the most architecturally significant piece. It introduces a central `src/lib/campaign.js` module that holds the entire campaign as a signal, with effects for localStorage persistence and exported functions for file save/load. The identity form is comparatively straightforward UI work. The browser-fs-access library (v0.38.0, latest) provides transparent fallback between File System API (Chromium) and download/upload (Firefox, Safari) with a single `fileSave()`/`fileOpen()` API.

**Primary recommendation:** Build the campaign state module first (`src/lib/campaign.js`) as the foundation, then the identity form on top of it, then wire save/load into the header and resume flow into the welcome screen. browser-fs-access must be added both as an npm dependency and to the import map for dual-mode support.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single rounded-xl card with all fields stacked vertically -- name, emails, optional phone/address, Continue button
- **D-02:** Multi-email input uses list pattern -- each email is a row with text input + [x] remove button, "+" Add email" link below to add more
- **D-03:** Optional fields (phone + address) behind a collapsible disclosure -- "Optional: Phone & Address" collapsed by default, expands in-place
- **D-04:** Brief inline helper text under each field explaining WHY it's needed
- **D-05:** Soft limit of 10 email addresses -- informational note after 10 but allow adding more
- **D-06:** Inline real-time validation on blur -- red border + helper text for invalid emails, empty required fields
- **D-07:** Continue button disabled until name + at least 1 valid email entered
- **D-08:** Continue button navigates to Step 2 (Brokers) and marks Identity step as complete in the stepper
- **D-09:** Flat JSON structure with top-level version key: `{ version, createdAt, updatedAt, identity, brokers, tempEmail, messages, statuses, settings }`
- **D-10:** Phase 2 pre-populates the full schema with empty slots for future phases
- **D-11:** Default file name: "erasure-kit-campaign.json"
- **D-12:** Auto-migrate forward on file load -- if version < current, auto-add missing keys with defaults. If version > current, refuse with warning
- **D-13:** Single localStorage key: "ek-campaign" stores the entire campaign JSON
- **D-14:** Save and Load as icon buttons in the header bar, always visible
- **D-15:** localStorage as draft cache -- auto-save on every change. File save is explicit. File load overwrites localStorage. localStorage draft offered as recovery on next visit
- **D-16:** Auto-save indicator: subtle "Auto-saved" text with checkmark in footer, fades after 2 seconds
- **D-17:** Always show file picker on Save (even if file handle exists)
- **D-18:** Load error handling: friendly message, never crash, never overwrite localStorage with bad data
- **D-19:** Returning user sees dual buttons: "Resume Campaign" (primary) + "Start New" (secondary)
- **D-20:** Summary text: "You have an unsaved campaign with N emails to erase"
- **D-21:** "Load from file" as text link below the buttons
- **D-22:** Auto-detect File System API -- Chromium gets native picker, Firefox/Safari get download/upload fallback
- **D-23:** Lock icon + "Your data never leaves this device" in card header area
- **D-24:** No network activity indicator in Phase 2

### Claude's Discretion
- State management implementation (Preact Signals structure for campaign data)
- browser-fs-access integration details and API usage
- localStorage auto-save debounce timing
- Form field ordering within the card
- Address field format (single textarea vs structured fields)
- Phone input format (free text vs structured)
- Exact validation regex for email addresses
- CSS transitions for disclosure expand/collapse and auto-save indicator fade

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IDEN-01 | User enters full name (required for GDPR requests) | Form validation patterns, signal-based form state, real-time validation on blur (D-06) |
| IDEN-02 | User enters one or more email addresses to erase | Multi-email list pattern with add/remove, email validation regex, soft limit at 10 (D-05) |
| IDEN-03 | Optional phone number and postal address | Collapsible disclosure pattern (D-03), free-text inputs behind disclosure toggle |
| IDEN-04 | Identity data stored only locally -- never transmitted | Zero network calls in Phase 2, localStorage + file-only persistence, verified by architecture (no fetch/XHR in campaign module) |
| PERS-01 | Save full campaign state to local JSON file via File System API | browser-fs-access `fileSave()` with Blob, always show picker (D-17), campaign schema (D-09) |
| PERS-02 | Load previously saved campaign file to resume | browser-fs-access `fileOpen()`, schema validation, version migration (D-12), overwrite localStorage on load (D-15) |
| PERS-03 | Fallback to download/upload JSON for Firefox/Safari | browser-fs-access auto-detects and falls back transparently -- `supported` export for detection but same API |
| PERS-04 | Auto-save to localStorage as secondary cache | Debounced effect on campaign signal, single key "ek-campaign" (D-13), auto-save indicator in footer (D-16) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Preact 10.29.0 + HTM 3.1.1 + Preact Signals -- NOT React
- **Two-mode architecture:** Must work in both no-build dev mode (CDN imports via import map) and Vite production build
- **No server:** All data stays in browser. Zero outbound network calls for user data.
- **Styling:** Tailwind v4 with `@tailwindcss/browser` CDN in dev, `@tailwindcss/vite` in build
- **Component pattern:** Named exports, `html` tagged templates from `htm/preact`, inline SVG icons
- **State pattern:** Preact Signals (`signal`, `effect`, `computed`) for all shared state
- **Privacy-first:** Identity data is PII -- never transmit, never log to console in production
- **Portable:** Single HTML file output via vite-plugin-singlefile
- **Icons:** Inline SVG only (no Lucide React -- this is Preact, not the Virgo ecosystem)
- **Testing:** Vitest (configured in package.json but no vitest.config or test files exist yet)

## Standard Stack

### Core (already installed from Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| preact | 10.29.0 | UI framework | Already installed, 3KB gzipped |
| htm | 3.1.1 | JSX alternative (tagged templates) | Already installed, no build step needed |
| @preact/signals | 2.9.0 (npm) / 1.3.4 (CDN) | Reactive state | Already installed, signal/effect/computed API identical across v1.x and v2.x |

### New Dependencies for Phase 2
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| browser-fs-access | 0.38.0 | File save/load with automatic fallback | Google ChromeLabs ponyfill, 1.5KB, zero deps, handles File System API + legacy fallback transparently |

### CDN Import Map Addition
```json
"browser-fs-access": "https://esm.sh/browser-fs-access@0.38.0"
```

### Installation
```bash
cd tools/erasure-kit
pnpm add browser-fs-access
```

### Version Notes
- browser-fs-access 0.38.0 is the current latest (research spec said 0.35.0 -- updated since)
- `@preact/signals` v2.9.0 in package.json vs v1.3.4 in import map: NOT a problem. Both export the same core API (`signal`, `computed`, `effect`, `batch`). v2.x adds utility components (`Show`, `For`) not used in this phase. The `@preact/signals-core` dependency is v1.x in both.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| browser-fs-access | Raw File System Access API | Only 30% browser support, no fallback for Firefox/Safari |
| browser-fs-access | Manual `<a download>` + `<input type="file">` | More code, must maintain two code paths, no file handle persistence |
| localStorage | IndexedDB | Overkill for ~10-50KB JSON, more complex API, localStorage is sufficient for campaign data |
| Debounced effect | setInterval polling | Effects are reactive (fire on change), polling wastes cycles when nothing changes |

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
src/
├── lib/
│   ├── campaign.js       # NEW: Campaign state signal + persistence logic
│   ├── router.js          # Existing: page routing signals
│   └── theme.js           # Existing: dark/light mode signal
├── components/
│   ├── Header.js          # MODIFIED: Add Save/Load icon buttons
│   ├── Footer.js          # MODIFIED: Add auto-save indicator
│   ├── WelcomeScreen.js   # MODIFIED: Resume/Start New/Load from file
│   ├── Stepper.js         # Existing (no changes)
│   ├── HamburgerMenu.js   # Existing (no changes)
│   └── ThemeToggle.js     # Existing (no changes)
├── pages/
│   ├── Identity.js        # REPLACED: Full identity form
│   └── ...                # Other placeholder pages unchanged
├── app.js                 # Existing (may need campaign.js import)
├── styles.css             # Existing (no changes expected)
└── index.html             # MODIFIED: Add browser-fs-access to import map
```

### Pattern 1: Campaign State as a Single Signal
**What:** One signal holds the entire campaign JSON object. Mutations create new objects (immutable updates) and assign to `.value`. Effects watch the signal and auto-save to localStorage.
**When to use:** Always -- this is the canonical state pattern for this app.
**Example:**
```javascript
// src/lib/campaign.js
import { signal, effect, batch } from '@preact/signals';

const STORAGE_KEY = 'ek-campaign';
const CURRENT_VERSION = 1;

function createEmptyCampaign() {
  return {
    version: CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    identity: {
      fullName: '',
      emails: [''],
      phone: '',
      address: '',
    },
    brokers: {},
    tempEmail: null,
    messages: [],
    statuses: {},
    settings: {},
  };
}

// Load from localStorage on init, or create empty
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateCampaign(parsed);
    }
  } catch (e) {
    // Corrupted data -- start fresh
  }
  return null;
}

export const campaign = signal(loadFromStorage() || createEmptyCampaign());
export const hasExistingCampaign = signal(loadFromStorage() !== null);

// Auto-save to localStorage with debounce
let saveTimeout = null;
export const lastAutoSaved = signal(null); // timestamp for indicator

effect(() => {
  const data = campaign.value; // subscribe to changes
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastAutoSaved.value = Date.now();
    } catch (e) {
      // QuotaExceededError -- silently fail, user has explicit file save
    }
  }, 500); // 500ms debounce
});
```

### Pattern 2: Version Migration on Load
**What:** When loading a campaign file, check `version` field. If lower than current, add missing keys with defaults. If higher, refuse with error.
**When to use:** Every file load and localStorage recovery.
**Example:**
```javascript
// Source: D-12 decision
function migrateCampaign(data) {
  if (!data || typeof data !== 'object') return null;
  if (!data.version) return null; // not a valid campaign
  if (data.version > CURRENT_VERSION) return null; // future version

  const empty = createEmptyCampaign();
  // Merge: keep existing data, fill missing keys from empty template
  return {
    ...empty,
    ...data,
    identity: { ...empty.identity, ...(data.identity || {}) },
    updatedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
}
```

### Pattern 3: File Save/Load via browser-fs-access
**What:** `fileSave()` creates a Blob from campaign JSON and shows a native picker (Chromium) or triggers a download (Firefox/Safari). `fileOpen()` shows a file picker and returns a File blob.
**When to use:** Save button in header (always show picker per D-17), Load button in header, "Load from file" link on welcome screen.
**Example:**
```javascript
// Source: browser-fs-access API docs
import { fileSave, fileOpen, supported } from 'browser-fs-access';

export async function saveCampaignToFile() {
  const data = { ...campaign.value, updatedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  try {
    // Always show picker (pass null handle per D-17)
    await fileSave(blob, {
      fileName: 'erasure-kit-campaign.json',
      extensions: ['.json'],
      description: 'ErasureKit Campaign',
    });
  } catch (e) {
    if (e.name === 'AbortError') return; // user cancelled
    throw e;
  }
}

export async function loadCampaignFromFile() {
  try {
    const file = await fileOpen({
      mimeTypes: ['application/json'],
      extensions: ['.json'],
      description: 'ErasureKit Campaign',
    });
    const text = await file.text();
    const data = JSON.parse(text);
    const migrated = migrateCampaign(data);
    if (!migrated) {
      return { error: 'invalid' }; // not a valid campaign file
    }
    campaign.value = migrated;
    return { success: true };
  } catch (e) {
    if (e.name === 'AbortError') return { cancelled: true };
    return { error: 'parse' };
  }
}
```

### Pattern 4: Debounced Auto-Save with Indicator
**What:** A 500ms debounced effect persists to localStorage. A `lastAutoSaved` signal drives a subtle footer indicator that fades after 2 seconds.
**When to use:** Global -- runs automatically on any campaign state change.
**Debounce timing recommendation:** 500ms. This is responsive enough that accidental tab-close within 500ms of a change is unlikely, but infrequent enough to avoid excessive `JSON.stringify()` calls during rapid typing.

### Pattern 5: Form Validation on Blur
**What:** Each input validates on blur event. Validation state is tracked as local component state (not in the campaign signal). The campaign signal only stores the actual field values, not validation state.
**When to use:** All required fields in the identity form.
**Example:**
```javascript
// Validation state -- local to Identity component, not persisted
const errors = signal({});

function validateEmail(email) {
  // RFC 5322 simplified -- covers 99.9% of real addresses
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function handleEmailBlur(index, value) {
  if (value.trim() && !validateEmail(value)) {
    errors.value = { ...errors.value, [`email-${index}`]: 'Please enter a valid email address' };
  } else {
    const next = { ...errors.value };
    delete next[`email-${index}`];
    errors.value = next;
  }
}
```

### Pattern 6: Collapsible Disclosure for Optional Fields
**What:** A disclosure toggle that shows/hides the phone and address fields with a smooth expand/collapse CSS transition.
**When to use:** Optional fields section per D-03.
**Example:**
```javascript
const showOptional = signal(false);

// In the template:
html`
  <button
    onClick=${() => { showOptional.value = !showOptional.value; }}
    class="flex items-center gap-2 text-sm text-[var(--ek-text-muted)] hover:text-[var(--ek-primary)] transition-colors"
  >
    <svg class="w-4 h-4 transition-transform duration-200 ${showOptional.value ? 'rotate-90' : ''}" ...>
      <!-- chevron-right icon -->
    </svg>
    Optional: Phone & Address
  </button>
  ${showOptional.value && html`
    <div class="mt-3 flex flex-col gap-4">
      <!-- phone and address inputs -->
    </div>
  `}
`
```

### Anti-Patterns to Avoid
- **Storing validation state in the campaign signal:** Validation errors are transient UI state, not campaign data. Keep them as local signals within the Identity component. Persisting them to localStorage pollutes the save file.
- **Reading `.value` inside JSX for signals that could be passed directly:** In Preact with Signals, passing the signal object directly (not `.value`) enables fine-grained updates without re-rendering the entire component. However, with HTM tagged templates, `.value` access is typically needed -- this is fine because HTM templates are lightweight.
- **Synchronous localStorage writes on every keystroke:** Always debounce. `JSON.stringify()` on a growing campaign object on every keypress is wasteful and can cause input lag.
- **Overwriting localStorage before validating loaded file data:** Per D-18, validate the file first. Only update `campaign.value` (which triggers the auto-save effect) after successful validation and migration.
- **Using `fileOpen()` handle for subsequent saves:** Per D-17, the user explicitly chose "always show file picker on Save." Never cache the file handle.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File System API fallback | Manual `<a download>` + `<input type="file">` dual code paths | browser-fs-access `fileSave()` + `fileOpen()` | Library handles detection, fallback, and edge cases (Safari quirks, blob URL cleanup) |
| Email validation | Custom regex from scratch | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (well-known simplified RFC 5322) | The full RFC 5322 regex is 6,000+ characters. The simplified version catches 99.9% of real invalid emails. Browser `type="email"` adds a second layer. |
| JSON schema validation | Manual key-by-key checking | Spread-merge with empty campaign template | `{ ...empty, ...loaded }` is simpler, more maintainable, and handles missing keys automatically |
| Debounce | Custom debounce implementation | `setTimeout` + `clearTimeout` pattern (3 lines) | No lodash or utility library needed for a single debounce. The pattern is trivial: clear previous timeout, set new one. |

**Key insight:** This phase is mostly "plumbing" -- connecting existing patterns (signals, effects, localStorage) to new data (campaign state) and a new library (browser-fs-access). The complexity is in getting the UX flows right (resume, save, load, validation feedback), not in novel technical challenges.

## Common Pitfalls

### Pitfall 1: localStorage QuotaExceededError
**What goes wrong:** Auto-save silently fails when localStorage is full (5MB limit per origin). User thinks data is saved but it's not.
**Why it happens:** Campaign data grows as brokers, messages, and statuses accumulate in later phases. 5MB is usually plenty for JSON text, but if a user has other data from the same origin, the quota may be lower.
**How to avoid:** Wrap `localStorage.setItem()` in a try/catch. On `QuotaExceededError`, show a warning suggesting explicit file save. Do NOT crash or lose the in-memory state.
**Warning signs:** `DOMException: QuotaExceededError` in console.

### Pitfall 2: Import Map vs npm Version Mismatch for browser-fs-access
**What goes wrong:** The CDN import map loads a different version of browser-fs-access than npm installs, causing subtle API differences between dev mode and build mode.
**Why it happens:** The import map is hand-maintained in `index.html`. If someone updates the npm dependency without updating the import map (or vice versa), the two modes diverge.
**How to avoid:** Pin the exact version in both places. Use `browser-fs-access@0.38.0` in the import map AND `"browser-fs-access": "^0.38.0"` in package.json. Document this dual-version requirement in a code comment.
**Warning signs:** Feature works in `pnpm dev` (Vite) but not when opening `index.html` directly (CDN), or vice versa.

### Pitfall 3: Signal Effect Fires Before Component Mount
**What goes wrong:** The auto-save effect in `campaign.js` fires immediately on import (before the app renders), potentially writing an empty campaign to localStorage and overwriting a valid existing draft.
**Why it happens:** Preact Signals `effect()` runs synchronously on creation to establish subscriptions.
**How to avoid:** The `loadFromStorage()` call in the signal initializer handles this -- it loads existing data first, so the first effect run writes back the same data (idempotent). But be careful about the order of operations: load from storage BEFORE creating the effect.
**Warning signs:** Returning user sees empty campaign instead of their saved progress.

### Pitfall 4: File Picker Cancelled Throws Error
**What goes wrong:** Both `fileOpen()` and `fileSave()` throw an `AbortError` when the user cancels the file picker. If not caught, this shows as an unhandled error.
**Why it happens:** The File System Access API uses `DOMException` with `name: 'AbortError'` for user cancellation.
**How to avoid:** Always check `e.name === 'AbortError'` in the catch block and silently return (cancellation is not an error).
**Warning signs:** Console error when user clicks Save/Load and then cancels the picker.

### Pitfall 5: Campaign Signal Mutation Instead of Replacement
**What goes wrong:** Mutating nested properties directly (`campaign.value.identity.fullName = 'new'`) does NOT trigger signal subscribers because the signal reference didn't change.
**Why it happens:** Preact Signals use reference equality for change detection. Mutating a nested property keeps the same top-level object reference.
**How to avoid:** Always create a new object: `campaign.value = { ...campaign.value, identity: { ...campaign.value.identity, fullName: 'new' } }`. Provide helper functions like `updateIdentity()` that handle the spread pattern.
**Warning signs:** Form changes don't trigger auto-save, loaded data doesn't update the UI.

### Pitfall 6: Circular Signal Dependency
**What goes wrong:** An effect that reads and writes the same signal creates an infinite loop.
**Why it happens:** The auto-save effect reads `campaign.value` to serialize it. If something inside that effect also writes to `campaign.value` (e.g., updating `updatedAt`), it triggers itself again.
**How to avoid:** Update `updatedAt` BEFORE the save effect (in the mutation function), not inside the effect. The effect should be read-only with respect to the campaign signal -- it only reads to serialize and write to localStorage.
**Warning signs:** Browser tab freezes, stack overflow error.

## Code Examples

### Campaign Data Model (D-09)
```javascript
// Source: D-09 decision + D-10 pre-population
// The canonical campaign JSON structure -- all phases share this
const campaignSchema = {
  version: 1,                    // Schema version for migration (D-12)
  createdAt: '2026-03-29T...',   // ISO 8601, set once on creation
  updatedAt: '2026-03-29T...',   // ISO 8601, updated on every change
  identity: {
    fullName: '',                // IDEN-01: required
    emails: [''],                // IDEN-02: array, at least 1 required
    phone: '',                   // IDEN-03: optional
    address: '',                 // IDEN-03: optional (single textarea)
  },
  brokers: {},                   // Phase 3: broker selection state
  tempEmail: null,               // Phase 6: { address, password, token }
  messages: [],                  // Phase 6: cached inbox messages
  statuses: {},                  // Phase 5: per-broker status tracking
  settings: {},                  // Future: user preferences
};
```

### Helper Functions for Immutable Campaign Updates
```javascript
// Source: Pattern to avoid Pitfall 5 (mutation vs replacement)
export function updateIdentity(field, value) {
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: {
      ...campaign.value.identity,
      [field]: value,
    },
  };
}

export function updateIdentityEmail(index, value) {
  const emails = [...campaign.value.identity.emails];
  emails[index] = value;
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: { ...campaign.value.identity, emails },
  };
}

export function addEmail() {
  const emails = [...campaign.value.identity.emails, ''];
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: { ...campaign.value.identity, emails },
  };
}

export function removeEmail(index) {
  const emails = campaign.value.identity.emails.filter((_, i) => i !== index);
  if (emails.length === 0) emails.push(''); // always keep at least 1
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: { ...campaign.value.identity, emails },
  };
}

export function startNewCampaign() {
  localStorage.removeItem(STORAGE_KEY);
  campaign.value = createEmptyCampaign();
  hasExistingCampaign.value = false;
}
```

### Auto-Save Indicator in Footer (D-16)
```javascript
// Source: D-16 decision
// In Footer.js -- show "Auto-saved" with checkmark, fade after 2s
import { lastAutoSaved } from '../lib/campaign.js';
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

// Visible state for fade animation
const showIndicator = signal(false);

// Watch lastAutoSaved and show indicator briefly
effect(() => {
  if (lastAutoSaved.value) {
    showIndicator.value = true;
    setTimeout(() => { showIndicator.value = false; }, 2000);
  }
});
```

### Save/Load Buttons in Header (D-14)
```javascript
// Source: D-14, D-17 decisions
// Save icon button -- always shows file picker
html`
  <button
    onClick=${saveCampaignToFile}
    class="w-10 h-10 rounded-lg flex items-center justify-center ..."
    aria-label="Save campaign to file"
    title="Save to file"
  >
    <!-- Download/save icon SVG -->
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  </button>
`
```

### Email Validation Regex
```javascript
// Simplified RFC 5322 -- handles 99.9% of real email addresses
// Source: community standard, used by Angular, HTML5 spec reference
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Combined with HTML5 type="email" for double validation:
// 1. Browser's built-in validation via input type="email"
// 2. Custom regex on blur for visual feedback
```

### Phone and Address Input Format (Claude's Discretion)
```
Phone: Free-text input (type="tel"). No format enforcement.
  - Users have numbers from different countries (EU, UK, US)
  - Let them paste whatever format they have
  - Placeholder: "+30 690 000 0000" (example, not enforced)

Address: Single textarea.
  - Postal addresses vary wildly by country
  - Structured fields (street, city, zip, country) would be wrong for many EU formats
  - Textarea lets user paste their address as-is
  - Rows: 3, placeholder: "Street address, city, postal code, country"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `showSaveFilePicker()` directly | browser-fs-access ponyfill | Stable since 2020 | Use ponyfill, never raw API -- 70% of browsers lack native support |
| `JSON.parse/stringify` for deep clone | Spread operator for shallow immutable updates | ES2018+ | Sufficient for flat campaign schema -- no deep nesting |
| `@preact/signals` v1.3.x | v2.9.0 | 2024 | Core API unchanged; v2 adds `Show`, `For` utilities (optional) |
| browser-fs-access 0.35.0 | 0.38.0 | Recent | Research spec said 0.35.0; current latest is 0.38.0 |

**Deprecated/outdated:**
- `window.showSaveFilePicker()` without ponyfill: Only works in Chromium. Must use browser-fs-access for cross-browser support.

## Open Questions

1. **CDN import map for browser-fs-access on esm.sh**
   - What we know: esm.sh supports browser-fs-access and the URL pattern `https://esm.sh/browser-fs-access@0.38.0` should work
   - What's unclear: Whether browser-fs-access works correctly from esm.sh in the no-build dev mode (file:// origin). The library internally feature-detects the File System Access API.
   - Recommendation: Test the import map addition in dev mode during implementation. If esm.sh causes issues, fall back to unpkg: `https://unpkg.com/browser-fs-access@0.38.0/dist/index.modern.js`

2. **localStorage data size over time**
   - What we know: 5MB limit per origin. Campaign JSON starts small (~1KB) but grows with messages in Phase 6.
   - What's unclear: Exact growth rate -- depends on number of broker responses cached.
   - Recommendation: Implement the QuotaExceededError catch now. Consider a "trim old messages" strategy in Phase 6 if needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev server, npm install | Assumed (Phase 1 completed) | -- | No-build dev mode works without Node |
| pnpm | Package installation | Assumed (Phase 1 completed) | -- | npm works too |
| browser-fs-access (npm) | File save/load in build mode | Not yet installed | -- | Must `pnpm add browser-fs-access` |
| browser-fs-access (CDN) | File save/load in dev mode | Available via esm.sh | 0.38.0 | unpkg fallback |
| File System Access API | Native file picker | Chromium browsers only | -- | browser-fs-access auto-falls back to download/upload |
| localStorage | Auto-save cache | All modern browsers | 5MB | No fallback needed (file save is the primary) |

**Missing dependencies with no fallback:**
- None -- browser-fs-access handles all fallback scenarios

**Missing dependencies with fallback:**
- `browser-fs-access` npm package needs to be installed (Wave 0 task)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | None -- see Wave 0 |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IDEN-01 | Full name stored in campaign.identity.fullName | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |
| IDEN-02 | Multiple emails stored as array, add/remove works | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |
| IDEN-03 | Phone and address stored when provided | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |
| IDEN-04 | No network calls -- architecture test | manual-only | Verify no `fetch`/`XMLHttpRequest` in campaign.js | N/A |
| PERS-01 | fileSave creates valid JSON blob with correct schema | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |
| PERS-02 | fileOpen parses and migrates valid campaign JSON | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |
| PERS-03 | browser-fs-access `supported` export detects capability | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |
| PERS-04 | Auto-save writes to localStorage within debounce window | unit | `pnpm test -- --run src/lib/campaign.test.js` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.js` -- Vitest config with Preact preset (jsdom environment, HTM support)
- [ ] `src/lib/campaign.test.js` -- covers IDEN-01, IDEN-02, IDEN-03, PERS-01, PERS-02, PERS-04
- [ ] Mock for `browser-fs-access` in test environment (fileSave/fileOpen)
- [ ] Mock for `localStorage` in test environment (vitest jsdom should provide this)

*(Note: IDEN-04 is manual-only -- verified by code review that campaign.js contains no fetch/XHR calls. PERS-03 is verified by browser-fs-access library's own tests -- we only test that we call its API correctly.)*

## Sources

### Primary (HIGH confidence)
- [browser-fs-access GitHub (GoogleChromeLabs)](https://github.com/GoogleChromeLabs/browser-fs-access) -- API docs, type definitions, fallback behavior
- [browser-fs-access index.d.ts](https://github.com/GoogleChromeLabs/browser-fs-access/blob/main/index.d.ts) -- TypeScript type definitions for fileOpen, fileSave, supported
- [Preact Signals Guide](https://preactjs.com/guide/v10/signals/) -- signal, computed, effect, batch API, form handling patterns
- [npm: browser-fs-access](https://www.npmjs.com/package/browser-fs-access) -- version 0.38.0 confirmed current
- [npm: @preact/signals](https://www.npmjs.com/package/@preact/signals) -- version 2.9.0, peer dep preact >= 10.25.0
- Existing codebase (src/lib/theme.js, src/lib/router.js) -- established signal + effect + localStorage pattern

### Secondary (MEDIUM confidence)
- [Chrome Developer Docs: browser-fs-access](https://developer.chrome.com/docs/capabilities/browser-fs-access) -- detailed usage examples
- [MDN: Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) -- 5MB localStorage limit per origin

### Tertiary (LOW confidence)
- esm.sh CDN compatibility with browser-fs-access -- inferred from esm.sh general compatibility, not directly tested

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified via npm, versions confirmed, existing codebase patterns established
- Architecture: HIGH -- campaign signal pattern directly extends the theme.js pattern already proven in Phase 1
- Pitfalls: HIGH -- common issues documented from browser-fs-access GitHub issues and Preact Signals documentation
- Form validation: HIGH -- standard email regex, standard blur validation pattern
- CDN import map: MEDIUM -- esm.sh should work but not empirically tested for browser-fs-access specifically

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- stable libraries, low churn)
