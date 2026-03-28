# Architecture Patterns

**Domain:** Browser-only GDPR erasure automation tool (portable web app)
**Researched:** 2026-03-28

## Critical Discovery: The Send/Receive Split

The single most important architectural finding is that **no free temp email API supports both sending AND receiving emails from the browser**. This fundamentally shapes the entire architecture.

| Service | Send | Receive | CORS | Free | Notes |
|---------|------|---------|------|------|-------|
| **mail.tm** | NO | YES | YES (`*`) | YES | Verified: `access-control-allow-origin: *`. Receive-only. |
| **Guerrilla Mail** | NO | YES | YES (`*`) | YES | Verified: `access-control-allow-origin: *`. Receive-only. No send function in API. |
| **MailSlurp** | YES | YES | Unknown | Partial | Requires API key (exposed in client). Free tier blocks sends to Gmail/Yahoo. |
| **EmailJS** | YES | NO | YES | 200/mo | Client-side email sending service. No inbox, no receiving. |
| **Resend/Mailgun/etc.** | YES | NO | NO | Various | Block CORS by design. Require server-side proxy. |

**Confidence: HIGH** -- mail.tm and Guerrilla Mail CORS headers were verified via direct `curl` preflight requests to their APIs.

### Architectural Consequence

The app MUST use a **dual-service architecture**: one service for receiving (monitoring inbox) and a separate mechanism for sending. The reference prototype in `helpers/erasure-kit.md` uses `mailto:` links for sending, which is the simplest zero-dependency approach. The upgraded architecture uses mail.tm for inbox monitoring and provides multiple send strategies.

---

## Recommended Architecture

### High-Level Component Diagram

```
+------------------------------------------------------------------+
|                        ErasureKit (Browser)                       |
|                                                                   |
|  +------------------+  +------------------+  +-----------------+ |
|  |   Identity Form  |  |  Broker Manager  |  |    Dashboard    | |
|  |  (name, emails)  |  | (list, filter,   |  | (stats, status, | |
|  |                  |  |  select, search)  |  |  deadlines)     | |
|  +--------+---------+  +--------+---------+  +--------+--------+ |
|           |                      |                     |          |
|  +--------v----------------------v---------------------v--------+ |
|  |                      Core Engine                              | |
|  |                                                               | |
|  |  +------------------+  +-------------------+  +-------------+ | |
|  |  |  Email Composer  |  |  Inbox Monitor    |  |  Deadline   | | |
|  |  |  (template gen,  |  |  (mail.tm client, |  |  Tracker    | | |
|  |  |   send dispatch) |  |   SSE/polling)    |  |  (30-day)   | | |
|  |  +--------+---------+  +--------+----------+  +------+------+ | |
|  |           |                      |                    |        | |
|  |  +--------v----------------------v--------------------v------+ | |
|  |  |                    State Manager                          | | |
|  |  |  (campaign state, broker statuses, user identity,         | | |
|  |  |   temp email credentials, response classifications)       | | |
|  |  +---------------------------+-------------------------------+ | |
|  +--------------------------------------------------------------|+ |
|                              |                                    |
|  +---------------------------v----------------------------------+ |
|  |                  Persistence Layer                            | |
|  |  browser-fs-access (File System API + <a download> fallback) | |
|  +--------------------------------------------------------------+ |
|                                                                   |
+---------------------------+---------------------------------------+
                            |
            External APIs   |
                            |
        +-------------------v-------------------+
        |                                       |
   +----v----+    +----------+    +----------+  |
   | mail.tm |    | mailto:  |    | EmailJS  |  |
   | API     |    | protocol |    | (opt.)   |  |
   | (recv)  |    | (send)   |    | (send)   |  |
   +---------+    +----------+    +----------+  |
        |                                       |
        +---------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Isolation Level |
|-----------|---------------|-------------------|-----------------|
| **Identity Form** | Collects user name, emails, optional phone/address. Never transmitted externally. | State Manager (writes identity) | UI only |
| **Broker Manager** | Loads brokers.json, filters/searches/selects brokers, displays broker cards | State Manager, Email Composer, brokers.json | UI + data |
| **Dashboard** | Aggregate stats (sent/pending/overdue/completed), deadline warnings, progress visualization | State Manager (reads) | UI only (read-only) |
| **Email Composer** | Generates GDPR-compliant email templates, dispatches via mailto: or EmailJS | State Manager (reads identity + broker data), Broker Manager | Logic + UI |
| **Inbox Monitor** | Creates mail.tm temp account, authenticates, polls/SSE for incoming messages, classifies responses | mail.tm API, State Manager, Response Classifier | Logic (network I/O) |
| **Deadline Tracker** | Computes 30-day deadlines from send dates, flags overdue brokers, generates escalation templates | State Manager (reads timestamps) | Pure logic |
| **State Manager** | Central state: campaign lifecycle, broker statuses, credentials, classification results | All components (hub) | State only |
| **Persistence Layer** | Save/load campaign state to local JSON files via File System Access API with download/upload fallback | State Manager, browser-fs-access | I/O only |
| **Response Classifier** | Analyzes incoming email text to categorize: confirmation, rejection, needs-more-info, auto-reply/irrelevant | Inbox Monitor (input), State Manager (output) | Pure logic |

---

## Data Flow

### Flow 1: Campaign Setup

```
User enters identity info
        |
        v
Identity Form --> State Manager (stores identity locally)
        |
        v
User loads/edits brokers.json --> Broker Manager parses + displays
        |
        v
User selects target brokers --> State Manager (stores selections)
        |
        v
User clicks "Start Campaign"
        |
        v
Inbox Monitor --> mail.tm API: GET /domains
                              POST /accounts (create temp email)
                              POST /token (get JWT)
        |
        v
State Manager stores: temp email address, JWT token, account ID
        |
        v
Dashboard shows: temp email address created, ready to send
```

### Flow 2: Sending Erasure Requests

```
For each selected broker:
        |
        v
Email Composer generates template:
  - User identity (name, emails to erase)
  - Broker-specific: name, privacy email
  - Region-aware: GDPR Art.17 (EU/UK) vs CCPA (US)
        |
        v
Send Strategy (user-configurable):
        |
        +---> [Primary] mailto: link
        |     Opens user's email client with pre-filled template
        |     FROM: temp email address (user copies/pastes into From field)
        |     TO: broker privacy email
        |     User clicks send manually
        |
        +---> [Alternative] EmailJS (if configured)
        |     Sends directly from browser
        |     FROM: temp email address domain
        |     TO: broker privacy email
        |     Automated, no user interaction
        |
        v
State Manager records:
  - Broker status: pending --> sent
  - Send timestamp (for 30-day deadline calculation)
  - Send method used
```

### Flow 3: Inbox Monitoring

```
Inbox Monitor activates after first email sent
        |
        v
Two strategies (configurable):

[Strategy A: SSE/Mercure - preferred]
  EventSource connects to mail.tm Mercure hub
  Topic: /accounts/{accountId}
  Auth: JWT Bearer token
  Real-time push of new messages
        |
        v
[Strategy B: Polling - fallback]
  setInterval every 30-60 seconds
  GET /messages (with Authorization: Bearer JWT)
  Compare message IDs against known set
        |
        v
New message detected
        |
        v
GET /messages/{id} (fetch full content)
        |
        v
Response Classifier analyzes email body:
  - Keyword matching: "deleted", "erased", "completed", "removed"
    --> CONFIRMED
  - Keywords: "denied", "refused", "cannot comply", "legal obligation"
    --> REJECTED
  - Keywords: "verify", "identification", "confirm your identity"
    --> NEEDS_MORE_INFO
  - Keywords: "auto-reply", "out of office", "no-reply"
    --> AUTO_REPLY (ignore)
  - No match
    --> UNCLASSIFIED (user reviews manually)
        |
        v
State Manager updates broker status:
  sent --> responded (with classification)
        |
        v
Dashboard refreshes: shows response, updates stats
```

### Flow 4: Deadline Tracking

```
Deadline Tracker runs on state changes + periodic check
        |
        v
For each broker with status "sent" or "responded":
  sentDate + 30 days = deadlineDate
  if (now > deadlineDate && status !== 'completed'):
    flag as OVERDUE
        |
        v
OVERDUE broker triggers:
  1. Dashboard warning badge
  2. Escalation template generator:
     - Follow-up warning email template
     - DPA complaint letter template
     - Link to relevant DPA website
        |
        v
User manually escalates (generates template, user sends via DPA website)
```

### Flow 5: Campaign Completion

```
All brokers reach terminal state (completed/rejected/escalated)
        |
        v
User clicks "Complete Campaign"
        |
        v
Inbox Monitor --> mail.tm API: DELETE /accounts/{id}
  (Deletes temp email account permanently)
        |
        v
State Manager archives campaign:
  - Final stats
  - Completion timestamp
  - All broker outcomes
        |
        v
Persistence Layer saves final state to file
```

---

## CORS Strategy

### mail.tm: Direct Browser Access (Verified)

**CORS is fully open.** Verified via direct preflight request:

```
access-control-allow-origin: *
access-control-allow-methods: GET, OPTIONS, POST, PUT, PATCH, DELETE
access-control-allow-headers: content-type, authorization, preload, fields
access-control-max-age: 3600
```

**Confidence: HIGH** -- Tested directly. All HTTP methods allowed. Authorization header allowed. No proxy needed.

The mail.tm API is built on Symfony/API Platform, which uses the Mercure protocol for SSE push updates. The SSE endpoint should also respect CORS since it shares the same server infrastructure.

### Guerrilla Mail: Direct Browser Access (Verified, But Not Recommended)

```
access-control-allow-origin: *
```

CORS is open BUT Guerrilla Mail uses PHP session cookies (PHPSESSID) which creates complications with third-party cookie restrictions in modern browsers. Also no send capability. **Use mail.tm instead.**

### No Proxy Needed

Because mail.tm returns `access-control-allow-origin: *` with all necessary methods and headers, the app can make direct `fetch()` calls from any origin (including `file://` protocol for local HTML files). **No CORS proxy, no serverless function, no backend of any kind is required for inbox operations.**

### EmailJS: Transparent Proxy (For Sending)

EmailJS handles CORS internally -- their SDK makes calls to their servers which relay the email. The API key is exposed in client-side code but EmailJS mitigates this with domain whitelisting, rate limits, and reCAPTCHA support.

---

## Sending Strategy Analysis

Since no temp email API supports sending from the browser, the app needs a sending mechanism. Three viable strategies, in order of recommendation:

### Strategy 1: mailto: Protocol (PRIMARY -- Zero Dependencies)

```
window.open(`mailto:${broker.email}?subject=${subject}&body=${body}`)
```

**How it works:** Opens the user's default email client (Gmail web, Outlook, Thunderbird, etc.) with pre-filled recipient, subject, and body. User manually sends.

**Pros:**
- Zero dependencies, zero API keys, zero cost
- Works offline (queues in email client)
- User has full control over the send
- No CORS issues (no HTTP request)
- Legally strongest -- email comes from a real email client with proper headers

**Cons:**
- User must manually send each email (not truly "one click" for all brokers)
- Sends from user's real email, not the temp email (defeats temp email purpose for sending)
- URL length limits (~2000 chars in some browsers) can truncate long templates
- User experience: jarring context switches as email client opens repeatedly

**Mitigation for the real-email problem:** The email template instructs brokers to respond to the temp email address (included in the body), not to reply directly. The "From" address is the user's real email, but the template says "Please send all correspondence regarding this request to: [temp-email]@mail.tm".

### Strategy 2: Clipboard + Webmail (RECOMMENDED DEFAULT)

Instead of `mailto:`, generate the email content and copy it to clipboard. User pastes into their webmail (Gmail, Outlook, etc.) logged into the temp email account -- but wait, mail.tm accounts cannot send. So the user would need to use their own email.

**Better variant:** The app generates all email content, user uses their own email client to send. The temp email is used solely for RECEIVING responses. The email template explicitly states: "Please direct all responses to [temp-email]@mail.tm".

This is actually the cleanest separation of concerns:
- **User's real email** = sender (has SMTP, has deliverability)
- **mail.tm temp email** = receiver (monitored by the app)

### Strategy 3: EmailJS Integration (OPTIONAL -- For True Automation)

```typescript
emailjs.send('service_id', 'template_id', {
  to_email: broker.email,
  from_name: user.fullName,
  reply_to: tempEmailAddress,  // <-- responses go to temp inbox
  subject: subject,
  body: body
});
```

**Pros:**
- True one-click automation (no user interaction per broker)
- Can set Reply-To to the temp email address
- Works entirely in browser

**Cons:**
- 200 emails/month free limit (may not be enough for 100+ brokers in one campaign)
- Requires EmailJS account setup (API key, service, template)
- API key exposed in client-side code
- "From" address is the EmailJS service's domain, not the user's -- may reduce deliverability
- Adds external service dependency to a "no server, no accounts" tool

**Verdict:** Offer as optional power-user feature. Default to mailto:/clipboard approach.

---

## State Model

### Campaign State Machine

```
                    +---> SENDING (bulk send in progress)
                    |           |
SETUP --> ACTIVE ---+           v
  |                 |     MONITORING (polling/SSE active)
  |                 |           |
  |                 +---> PAUSED (user paused monitoring)
  |                             |
  |                             v
  |                       COMPLETED (all brokers resolved, temp email deleted)
  v
ABANDONED (user cancels without completing)
```

### Broker State Machine

```
SELECTED --> SENDING --> SENT --> AWAITING_RESPONSE
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
                    v                   v                   v
              CONFIRMED           REJECTED          NEEDS_MORE_INFO
                    |                   |                   |
                    v                   v                   v
              COMPLETED           ESCALATED         RESPONDED (user action)
                                        |                   |
                                        v                   v
                                  COMPLETED           CONFIRMED/REJECTED
                                                           |
                                                           v
                                                      COMPLETED
```

Additional states for deadline tracking:
- Any `SENT` or `AWAITING_RESPONSE` broker gains an `OVERDUE` flag after 30 days
- `OVERDUE` is not a state -- it is a computed property based on `sentDate + 30 days`

### State Shape (TypeScript)

```typescript
interface CampaignState {
  // Campaign metadata
  id: string;                    // UUID
  status: CampaignStatus;
  createdAt: string;             // ISO 8601
  completedAt?: string;

  // User identity (never transmitted, only used for template generation)
  identity: {
    fullName: string;
    emails: string[];            // emails the user wants erased
    phone?: string;
    address?: string;
  };

  // Temp email (mail.tm)
  tempEmail: {
    address: string;
    accountId: string;
    token: string;               // JWT Bearer token
    tokenExpiresAt: string;
    createdAt: string;
  } | null;

  // Broker tracking
  brokers: Record<string, BrokerStatus>;

  // Settings
  settings: {
    sendMethod: 'mailto' | 'clipboard' | 'emailjs';
    pollingInterval: number;     // seconds (default: 60)
    emailjsConfig?: {
      serviceId: string;
      templateId: string;
      publicKey: string;
    };
  };
}

interface BrokerStatus {
  brokerId: string;
  status: BrokerState;
  selected: boolean;
  sentAt?: string;               // ISO 8601
  sentMethod?: string;
  responseAt?: string;
  responseClassification?: ResponseType;
  responseRaw?: string;          // email body excerpt
  notes?: string;                // user notes
}

type CampaignStatus = 'setup' | 'active' | 'sending' | 'monitoring' | 'paused' | 'completed' | 'abandoned';
type BrokerState = 'selected' | 'sending' | 'sent' | 'awaiting_response' | 'confirmed' | 'rejected' | 'needs_more_info' | 'escalated' | 'completed';
type ResponseType = 'confirmed' | 'rejected' | 'needs_more_info' | 'auto_reply' | 'unclassified';
```

---

## brokers.json Loading Strategy

The broker database is a separate JSON file that lives alongside the app bundle. This enables community contributions via GitHub PRs without touching app code.

### Loading Order

```
1. App starts
2. Try: fetch('./brokers.json')   // relative path, works for file:// and http://
3. If fetch fails (file:// CORS in some browsers):
   Try: embedded fallback broker list (compiled into the bundle)
4. User can also: "Load Custom Brokers" button
   --> browser-fs-access fileOpen() with .json filter
   --> Parse, validate schema, merge/replace
```

### brokers.json Schema

```typescript
interface BrokersDatabase {
  version: string;               // semver
  lastUpdated: string;           // ISO 8601
  sources: string[];             // attribution
  brokers: Broker[];
}

interface Broker {
  id: string;                    // kebab-case unique ID
  name: string;                  // display name
  type: string;                  // "People Search", "Credit Bureau", etc.
  email: string;                 // privacy/DPO email
  portal?: string;               // opt-out portal URL
  region: string;                // "US", "UK", "EU", "Global", "UK/EU"
  category: string;              // for grouping: "people-search", "credit", "marketing", etc.
  gdprApplies: boolean;          // true for EU/UK/Global
  ccpaApplies: boolean;          // true for US/Global
  notes?: string;                // special instructions
  lastVerified?: string;         // ISO 8601 date
}
```

### Validation

On load, validate the JSON against the schema. If any broker entry is malformed, skip that entry and log a warning (do not fail the entire load). Show a count of loaded/skipped brokers to the user.

---

## Offline vs Online Behavior

### Online (Required for Core Functionality)

| Operation | Requires Internet | API |
|-----------|------------------|-----|
| Create temp email | YES | mail.tm POST /accounts |
| Authenticate | YES | mail.tm POST /token |
| Monitor inbox | YES | mail.tm GET /messages or SSE |
| Send via EmailJS | YES | EmailJS API |
| Open mailto: link | NO (queues locally) | mailto: protocol |

### Offline (Graceful Degradation)

| Operation | Works Offline |
|-----------|--------------|
| Browse broker database | YES (embedded or cached) |
| Edit identity info | YES (state in memory) |
| Generate email templates | YES (pure string generation) |
| Copy templates to clipboard | YES |
| View dashboard/stats | YES (from saved state) |
| Save/load progress files | YES (File System API) |
| View legal reference pages | YES (bundled in app) |

### Offline Detection Strategy

```typescript
// Simple approach: navigator.onLine + periodic connectivity check
const isOnline = () => navigator.onLine;

// Before any API call:
if (!isOnline()) {
  showNotification('You are offline. Inbox monitoring paused. You can still browse brokers and generate templates.');
  return;
}
```

When the app detects it is offline, inbox monitoring pauses automatically. When connectivity returns, monitoring resumes with a catch-up poll (fetch all messages since last check).

---

## Build & Distribution Architecture

### Vite + Single-File Output

Use Vite with `vite-plugin-singlefile` to produce a single `index.html` file containing all JS, CSS, and assets inlined.

```
Source:
  src/
    main.tsx          # Entry point
    App.tsx           # Root component
    components/       # UI components
    engine/           # Core logic (composer, monitor, classifier, tracker)
    state/            # State management (Zustand store)
    types/            # TypeScript interfaces
    data/             # Embedded fallback broker list
  brokers.json        # Separate, loadable broker database
  index.html          # Template

Build output:
  dist/
    index.html        # Single file, everything inlined (~200-500KB)
    brokers.json      # Copied alongside (not inlined -- must be editable)
```

### Distribution Model

```
GitHub Release:
  erasure-kit-v1.0.0.zip
    index.html        # The entire app
    brokers.json      # Editable broker database
    README.md         # Usage instructions
```

Users download the zip, extract, and double-click `index.html`. No server, no install, no build step.

### Why NOT Inline brokers.json

The broker database is deliberately kept as a separate file because:
1. Community contributors edit it via GitHub PRs
2. Users can swap in their own curated lists
3. Updates to the broker DB do not require rebuilding the app
4. The file is human-readable and inspectable

---

## Patterns to Follow

### Pattern 1: Service Adapter Pattern (for Email APIs)

Abstract the mail.tm API behind an adapter interface so the app can swap email providers if mail.tm goes down or changes its API.

```typescript
interface TempEmailService {
  getDomains(): Promise<string[]>;
  createAccount(address: string, password: string): Promise<Account>;
  getToken(address: string, password: string): Promise<string>;
  getMessages(token: string): Promise<Message[]>;
  getMessage(token: string, id: string): Promise<MessageDetail>;
  deleteAccount(token: string, id: string): Promise<void>;
  // Optional: SSE subscription
  subscribeToMessages?(token: string, onMessage: (msg: Message) => void): () => void;
}

class MailTmService implements TempEmailService {
  private baseUrl = 'https://api.mail.tm';
  // ... implementation using fetch()
}
```

**Why:** mail.tm is free and reliable today, but it could go offline, change its API, or add rate limits. The adapter pattern lets the app support Guerrilla Mail or other services as fallbacks with minimal code change.

**Confidence: HIGH** -- Standard software engineering pattern. No risk.

### Pattern 2: Optimistic State Updates with Reconciliation

Update broker status optimistically in the UI, then reconcile with actual API responses.

```typescript
// User clicks "Send" --> immediately update state
updateBrokerStatus(brokerId, 'sent');

// If the send actually fails (mailto: doesn't guarantee delivery):
// State stays as 'sent' -- user can manually revert if needed
// No way to programmatically verify mailto: delivery
```

**Why:** mailto: links provide no delivery confirmation. The app cannot know if the user actually clicked Send in their email client. Treat the status update as a user assertion ("I sent this"), not a verified fact.

### Pattern 3: Progressive Enhancement for Persistence

```typescript
import { fileSave, fileOpen } from 'browser-fs-access';

async function saveProgress(state: CampaignState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });

  try {
    // Modern browsers: File System Access API (save in place)
    await fileSave(blob, {
      fileName: `erasure-kit-${state.id}.json`,
      extensions: ['.json'],
      description: 'ErasureKit Progress File',
    });
  } catch (err) {
    // Fallback: <a download> (triggers file download)
    // browser-fs-access handles this automatically
  }
}
```

**Why:** File System Access API is Chromium-only (~30% browser coverage). `browser-fs-access` provides transparent fallback to download/upload for Firefox and Safari. Same API, different underlying mechanism.

**Confidence: HIGH** -- This is exactly how Excalidraw handles persistence, and it is a Google Chrome Labs maintained library.

### Pattern 4: Token Refresh Guard

mail.tm JWT tokens expire. Wrap all API calls in a guard that refreshes the token before making requests.

```typescript
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  let token = state.tempEmail.token;

  // Check if token is about to expire (within 5 minutes)
  if (isTokenExpiring(token, 300)) {
    token = await refreshToken(state.tempEmail.address, storedPassword);
    updateState({ tempEmail: { ...state.tempEmail, token } });
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Temp Email Password in State File

**What:** Saving the mail.tm account password to the JSON progress file.

**Why bad:** The progress file is a plain JSON file that could be shared, backed up to cloud storage, or accidentally committed to git. The password would be exposed.

**Instead:** Store the password only in memory (Zustand store). On app reload, the user re-enters or the app generates a new temp account. Alternatively, store an encrypted version using a user-provided passphrase, but this adds complexity for v1.

### Anti-Pattern 2: Unlimited Parallel API Calls

**What:** Sending all broker emails and polling the inbox simultaneously with no rate limiting.

**Why bad:** mail.tm has an 8 QPS rate limit. Blasting 100+ requests will get throttled or banned.

**Instead:** Queue API calls with a concurrency limiter. Maximum 2-3 requests in flight at once. Add exponential backoff on 429 responses.

### Anti-Pattern 3: Polling with Fixed Short Interval

**What:** Polling mail.tm every 5 seconds for new messages.

**Why bad:** Wastes API quota (8 QPS limit), drains battery on mobile, provides no better UX since broker responses take hours/days.

**Instead:** Use SSE (Mercure) if available. Fall back to polling at 60-second intervals. When a response is detected, temporarily increase polling frequency for 5 minutes (in case the broker sends multiple messages).

### Anti-Pattern 4: Relying on localStorage for Critical Data

**What:** Using `localStorage` as the primary persistence mechanism (as the reference prototype does).

**Why bad:** localStorage has a 5-10MB limit, is silently cleared by browsers under storage pressure, cannot be backed up/transferred, and is tied to origin (meaningless for `file://` protocol where each folder is a different origin).

**Instead:** Use File System Access API via `browser-fs-access`. The user explicitly saves to a file they control. localStorage can be used as a secondary cache for session continuity (auto-save every 30 seconds), but the file is the authoritative copy.

---

## Suggested Build Order (Dependencies)

The components have clear dependency chains that dictate build order:

```
Phase 1: Foundation
  [1] State Manager (Zustand store + types)          -- everything depends on this
  [2] Persistence Layer (browser-fs-access save/load) -- state needs persistence
  [3] brokers.json schema + loader                    -- data layer

Phase 2: Core Engine
  [4] Email Composer (template generation)            -- needs state + brokers
  [5] mail.tm Service Adapter                         -- needs state for credentials
  [6] Inbox Monitor (polling first, SSE later)        -- needs mail.tm service
  [7] Response Classifier                             -- needs inbox monitor output
  [8] Deadline Tracker                                -- needs state timestamps

Phase 3: UI
  [9]  Identity Form                                  -- writes to state
  [10] Broker Manager (list, filter, select)          -- reads brokers, writes state
  [11] Send Interface (mailto: + clipboard)           -- uses composer
  [12] Dashboard (stats, deadlines, responses)        -- reads state

Phase 4: Polish & Distribution
  [13] Vite single-file build                         -- bundles everything
  [14] Legal reference pages                          -- static content
  [15] Escalation template generator                  -- uses state + templates
  [16] EmailJS integration (optional)                 -- alternative send path
```

**Key dependency:** Nothing in Phase 2+ works without the State Manager (Phase 1). The mail.tm service adapter is needed before inbox monitoring. The response classifier needs the inbox monitor. The dashboard is pure read-only and can be built last.

---

## Scalability Considerations

| Concern | 1-10 brokers | 50-100 brokers | 500+ brokers |
|---------|--------------|----------------|--------------|
| Email sending | Manual mailto: OK | Tedious but works | Need EmailJS or batch mailto: |
| Inbox monitoring | 60s polling fine | 60s polling fine | Same -- responses are slow |
| State file size | <10KB | <50KB | <200KB (still fine) |
| UI rendering | Trivial | Needs virtual scrolling? | Definitely needs virtual scrolling |
| API rate limits | No concern | 8 QPS OK with queuing | 8 QPS OK -- sending is spread over time |
| Email template generation | Instant | Instant | Instant (pure string ops) |

**Verdict:** The architecture scales naturally to 500+ brokers. The bottleneck is user patience for manual sending via mailto:, not technical limitations. At 500+ brokers, EmailJS automation becomes practically necessary.

---

## Technology Choices (Architecture-Driven)

| Need | Choice | Why |
|------|--------|-----|
| **State management** | Zustand | Lightweight (1KB), works outside React, no boilerplate, perfect for single-page app |
| **Persistence** | browser-fs-access | Google Chrome Labs library, transparent File System API + fallback |
| **Temp email** | mail.tm | Verified CORS, free, no API key, SSE support via Mercure |
| **Email sending** | mailto: (primary) + EmailJS (optional) | Zero dependency default, optional automation |
| **HTTP client** | Native fetch() | No axios needed -- simple REST calls, browser-native |
| **Build** | Vite + vite-plugin-singlefile | Single HTML output for portability |
| **UI framework** | React (via Vite) | Reference prototype already React, fast iteration |
| **Styling** | Tailwind CSS | Inlines perfectly into single-file build, reference prototype already uses it |

---

## Sources

- [mail.tm API Documentation](https://docs.mail.tm/) - HIGH confidence (verified directly)
- [mail.tm API Swagger](https://api.mail.tm/) - HIGH confidence
- [mail.tm CORS headers](https://api.mail.tm/) - HIGH confidence (verified via curl preflight)
- [Guerrilla Mail API](https://www.guerrillamail.com/GuerrillaMailAPI.html) - HIGH confidence (verified via curl + WebFetch)
- [EmailJS](https://www.emailjs.com/) - MEDIUM confidence (WebSearch + official site)
- [Resend CORS Policy](https://resend.com/docs/knowledge-base/how-do-i-fix-cors-issues) - HIGH confidence (official docs confirm no browser CORS)
- [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) - HIGH confidence (Google Chrome Labs maintained)
- [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) - HIGH confidence (well-maintained, purpose-built)
- [File System Access API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) - HIGH confidence
- [File System Access - Can I Use](https://caniuse.com/native-filesystem-api) - HIGH confidence (~30% browser support)
- [Mercure Protocol](https://mercure.rocks/spec) - MEDIUM confidence (mail.tm uses it, but SSE endpoint not directly verified)
- [Datenanfragen.de GDPR Templates](https://github.com/datenanfragen/website) - HIGH confidence (CC0 licensed, well-maintained)
- [Consumer Reports Data Deletion Tool](https://innovation.consumerreports.org/new-open-source-project-automates-data-deletion-requests-by-email/) - MEDIUM confidence
