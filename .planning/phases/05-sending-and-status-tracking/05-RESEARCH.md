# Phase 5: Sending and Status Tracking - Research

**Researched:** 2026-04-01
**Domain:** Client-side email sending, temp email services, campaign status tracking, date arithmetic
**Confidence:** MEDIUM

## Summary

Phase 5 replaces the original mailto:-based sending approach with fully automated email sending from a temporary email address. The user decides which brokers to contact, clicks "Send All," and the app sends GDPR erasure requests automatically without user confirmation per email. The Send page merges into Brokers, the stepper becomes 3 steps, and a new Track page provides a full campaign dashboard.

The critical technical challenge is finding a free, no-server, browser-compatible email sending service. Research reveals that **no free temporary email API exists that supports both creating a disposable address AND sending outbound emails from it**. mail.tm, mail.gw, Guerrilla Mail, and all similar disposable email services are receive-only. MailSlurp requires a paid plan for external sending. The only viable client-side email sending option is **EmailJS** (200 emails/month free tier), which sends via its own relay servers using templates configured in the EmailJS dashboard -- but sends FROM a configured service email, not from a temp address created by the app. This creates a fundamental architecture tension with D-01's vision of "fully automated sending via temp email."

**Primary recommendation:** Implement a two-tier sending architecture: (1) EmailJS as the primary automated sender for the free tier (200/month, covers a single campaign of 169 brokers), with the app's configured email as the sender address rather than a per-session temp address; (2) mailto: as a fallback when EmailJS quota is exhausted or unavailable, with clipboard copy for long templates exceeding ~2000 chars. The temp email account (mail.tm) remains for Phase 6 response monitoring -- it is included in the email body as "reply-to" contact address, but is not the sending address. This approach satisfies the "automated sending" user intent while staying within the no-server, free, portable constraints.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fully automated sending via temp email -- no mailto: links, no user confirmations. User clicks "Send All" and app sends all emails automatically from the temp email address.
- **D-02:** Sequential batch sending with 2-3 second delay between emails to avoid rate limiting. 169 brokers ~= 6-8 minutes.
- **D-03:** Progress bar + live scrolling log during batch: "Sending... 42/169" with per-broker entries.
- **D-04:** On API error: skip and continue to next email. Retry failed emails after a few seconds, max 3 times. If still fails, flag for user review.
- **D-05:** Failed emails: per-row "Copy Email" button AND bulk "Download all failed as .txt" button.
- **D-06:** Researcher must investigate free/open-source temp email services that can SEND. Identify best option + fallback services.
- **D-07:** Send page merged into Brokers page. Stepper becomes 3 steps: Identity -> Brokers -> Track.
- **D-08:** Sticky bottom bar on Brokers page with send progress.
- **D-09:** Per-broker send icon (envelope) on EVERY broker row.
- **D-10:** Send All auto-navigates to Track page.
- **D-11:** After sending, broker row send icon changes to green checkmark. Hovering reveals "Re-send".
- **D-12:** Confirmation dialog before Send All.
- **D-13:** Send buttons disabled if no temp email created yet.
- **D-14:** Cancel button during in-progress batch.
- **D-15:** Template sidebar kept as-is in functionality.
- **D-16:** Sidebar removed entirely. Replaced with centered modal (max-w-3xl / 768px).
- **D-17:** Click broker row = open modal. Click chevron = expand/collapse inline.
- **D-18:** Modal shows broker metadata at top, template content below.
- **D-19:** Navigation arrows in modal header.
- **D-20:** Modal has Send + Copy + Reset buttons in footer.
- **D-21:** Close via X, Esc, or click outside.
- **D-22:** Click-only navigation between brokers (no keyboard arrows).
- **D-23:** Expandable inline row still exists for quick peek.
- **D-24:** Track page is stepper step 3 (was step 4).
- **D-25:** Progress bar = (confirmed + rejected) / total selected.
- **D-26:** Color-coded stat cards grid.
- **D-27:** Full broker status list with filter/sort on Track page.
- **D-28:** Per-broker deadline display with color-coded countdown.
- **D-29:** Overdue brokers: red background, badge, "Escalate" button.
- **D-30:** Expandable history rows per broker.
- **D-31:** No manual status changes on Track page.
- **D-32:** Empty state: "No requests sent yet" with nudge.
- **D-33:** Real-time updates via Preact signals.
- **D-34:** Success banner when all brokers resolved.
- **D-35:** Same max-w-4xl (896px) width as Brokers page.
- **D-36:** No separate export.
- **D-37:** Auto-transition: status goes directly to "awaiting response" when send completes.
- **D-38:** Deadline calculation: date-fns `addMonths()` for legally accurate calendar month.
- **D-39:** Overdue = day after deadline.
- **D-40:** Overdue detection: automatic on Track page load.
- **D-41:** Data model: `campaign.statuses[brokerId] = { status, sentAt, deadline, history[] }`.
- **D-42:** Auto-escalation: when broker exceeds deadline, app auto-sends follow-up warning email.
- **D-43:** DPA complaints need explicit user approval.
- **D-44:** Auto-replies classified as "acknowledged" sub-state of awaiting.
- **D-45:** User creates temp email in Identity step via dedicated button.
- **D-46:** Temp email address visible but read-only in Identity step.
- **D-47:** User clicks "Delete temp email" button when campaign is complete.
- **D-48:** Temp email credentials included in campaign JSON save file.
- **D-49:** Service down fallback: retry 3 times with 3 second delay, then fall back to alternative temp email services.
- **D-50:** Health check: small status dot in header next to temp email.
- **D-51:** In-app toast notifications (bottom-right). 5 seconds auto-dismiss.
- **D-52:** Color-coded toasts.
- **D-53:** Clickable toasts navigate to Track page.
- **D-54:** Red badge count on Track stepper tab.
- **D-55:** Bell icon in header with dropdown showing 5 most recent notifications.
- **D-56:** Clicking notification navigates to broker on Track page.
- **D-57:** Track page IS the full history.
- **D-58:** One campaign at a time.
- **D-59:** "Start New" prompts save confirmation.
- **D-60:** Re-run support: load old campaign, option to reset statuses.

### Claude's Discretion
- EmailJS vs alternative sending service (D-06 requires research)
- How to handle the "send from temp email" constraint when no temp email sending service exists
- Internal implementation patterns for the batch sending loop
- Toast notification implementation details
- Modal component architecture

### Deferred Ideas (OUT OF SCOPE)
- **EmailJS as optional automated sender** -- this was deferred to researcher findings but is now the primary recommendation
- **Browser push notifications** -- in-app toasts only (D-51)
- **Multiple simultaneous campaigns** -- one-at-a-time (D-58)
- **Auto-file DPA complaints** -- warnings only auto-send (D-43)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEND-01 | App sends erasure requests via mailto: links (original req -- superseded by D-01 automated sending) | EmailJS SDK for automated sending; mailto: as fallback for failures per D-05 |
| SEND-02 | User can batch-send to all selected brokers via sequential activation | D-02 sequential batch with delay; implemented as async loop with signals for progress |
| SEND-03 | After each send, user confirms and broker status updates to "sent" | D-37 supersedes: auto-transition to "awaiting response" on send success |
| SEND-04 | App handles mailto: URL length limits with clipboard fallback | Still relevant for failed-email fallback; clipboard.js already exists |
| STAT-01 | Each broker has tracked status lifecycle | D-41 data model with full history array |
| STAT-02 | App calculates "one calendar month" deadline using proper date arithmetic | date-fns 4.1.0 `addMonths()` with end-of-month clamping behavior |
| STAT-03 | App flags overdue brokers when they exceed calendar-month deadline | D-39/D-40: overdue = day after deadline, detected on Track page load |
| STAT-04 | Dashboard shows aggregate stats | D-26 color-coded stat cards grid on Track page |
| STAT-05 | Dashboard shows overall campaign progress percentage | D-25: (confirmed + rejected) / total selected |
</phase_requirements>

## Critical Finding: Temp Email Sending Services

### The Problem

D-01 specifies "fully automated sending via temp email" and D-06 requires researching free/open-source temp email services that can SEND. After thorough investigation:

**Every free disposable email service is receive-only.**

| Service | Can Create Account? | Can Receive? | Can SEND? | Free? | CORS? |
|---------|-------------------|-------------|-----------|-------|-------|
| mail.tm | Yes (API) | Yes | **No** | Yes | Yes |
| mail.gw | Yes (API) | Yes | **No** | Yes | Yes |
| Guerrilla Mail | Yes (API) | Yes | **No** (web compose only, not API) | Yes | No (cookie-based) |
| temp-mail.org | Yes (API) | Yes | **No** | Yes | Unknown |
| temp-mail.io | Yes (API) | Yes | **No** | Yes | Unknown |
| FreeCustom.Email | Yes | Yes | **No** | Yes | Unknown |
| MailSlurp | Yes (API) | Yes | **Paid only** (free blocks external) | Free tier exists | Yes |

**Confidence: HIGH** -- verified via official docs and FAQs for all services.

### The Solution: EmailJS + mail.tm Hybrid

Since no service exists that creates a temp address AND sends from it, the architecture must split responsibilities:

| Responsibility | Service | How |
|---------------|---------|-----|
| **Sending emails** | EmailJS (free 200/month) | Client-side SDK, sends from a configured email service |
| **Receiving responses** | mail.tm (Phase 6) | Creates temp inbox, polls for replies |
| **Reply-to address** | mail.tm temp address | Included in email body as contact address |

**How EmailJS works:**
1. User creates an EmailJS account (one-time, free)
2. User connects an email service (Gmail, Outlook, or custom SMTP)
3. User creates an email template in the EmailJS dashboard
4. App calls `emailjs.send()` with dynamic parameters (broker email, subject, body)
5. EmailJS relays the email through the connected service

**Trade-off with D-01:** The user decision says "send from temp email address." EmailJS sends from the user's connected email service, not from a temp address. However, the email body includes the mail.tm temp address as the reply-to contact, so broker responses go to the temp inbox (Phase 6). This is a necessary compromise because **no free client-side temp-email-sending service exists**.

### Alternative Architecture: Multiple Sending Tiers

Given the constraint, the planner should implement a tiered approach:

| Tier | Method | When | Limit |
|------|--------|------|-------|
| **Primary** | EmailJS automated | Default for all sends | 200/month free |
| **Fallback 1** | mailto: links | If EmailJS unavailable/exhausted | Unlimited but manual |
| **Fallback 2** | Clipboard copy | If template > ~2000 chars for mailto | Unlimited but manual |
| **Fallback 3** | Download .txt | For bulk failed emails | Unlimited |

### EmailJS Configuration Requirements

The app needs to guide users through EmailJS setup:
- **Public key** -- stored in campaign settings, not a secret
- **Service ID** -- identifies which email provider (Gmail, etc.)
- **Template ID** -- the GDPR template, configured in EmailJS dashboard

These can be entered in the Identity step or a new "Email Setup" section. The public key is safe to store client-side (EmailJS is designed for this).

**Important EmailJS limitations:**
- 200 emails/month on free tier (covers exactly one campaign of 169 brokers + retries)
- 2 email templates on free tier
- 50KB attachment limit (not relevant -- plain text emails)
- Rate limiting via throttle parameter in SDK

## Standard Stack

### Core (new dependencies for Phase 5)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 4.1.0 | Calendar month deadline calculation | Tree-shakeable, `addMonths()` handles end-of-month correctly (Jan 31 + 1mo = Feb 28). Already in project stack spec. |
| @emailjs/browser | 4.4.1 | Client-side email sending | Only viable free client-side email sending service. CDN-loadable, no build step required. |

### Existing (already in project)
| Library | Version | Purpose |
|---------|---------|---------|
| Preact | 10.29.0 | UI framework |
| @preact/signals | 2.9.0 | Reactive state (batch progress, modal state, notifications) |
| HTM | 3.1.1 | Tagged templates (no JSX build step) |
| browser-fs-access | 0.38.0 | Save/load campaign JSON |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EmailJS | SMTP.js | Credentials exposed in client JS, proxies through smtpjs.com, poor deliverability |
| EmailJS | MailSlurp | Free tier cannot send to external addresses; paid starts at $19/month |
| EmailJS | Resend/SendGrid/Mailgun | All require server-side proxy (CORS blocked by design), defeats no-server constraint |
| EmailJS | mailto: only | Not automated -- requires user to confirm each email manually |
| date-fns | Native Date math | `new Date().setMonth(m+1)` does NOT handle end-of-month correctly; Jan 31 + 1mo = Mar 3 |
| date-fns | dayjs | Deprecated recommendation per Virgo CLAUDE.md; date-fns is the standard |

**Installation:**
```bash
cd F:/_Github/Virgo/tools/erasure-kit
pnpm add date-fns@4.1.0
```

Note: EmailJS should be loaded via CDN in dev mode (`<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js">`) and optionally as npm dependency for build mode. This matches the project's two-mode architecture.

## Architecture Patterns

### Recommended File Structure (new/modified files)
```
src/
├── lib/
│   ├── campaign.js           # MODIFY: expand statuses schema, add status helpers
│   ├── email-sender.js       # NEW: EmailJS integration, batch sending loop
│   ├── deadline.js            # NEW: date-fns deadline calculation, overdue detection
│   ├── notifications.js       # NEW: toast + bell notification system
│   ├── template-engine.js     # EXISTING: unchanged
│   └── clipboard.js           # EXISTING: unchanged
├── components/
│   ├── BrokerModal.js         # NEW: centered modal replacing TemplateSidebar
│   ├── Toast.js               # NEW: toast notification component
│   ├── NotificationBell.js    # NEW: bell icon dropdown in header
│   ├── SendProgressBar.js     # NEW: batch progress indicator
│   ├── StatCard.js            # NEW: color-coded stat card for Track dashboard
│   ├── Header.js              # MODIFY: add bell icon, health check dot
│   ├── Stepper.js             # MODIFY: 4 steps -> 3 steps
│   └── TemplateSidebar.js     # DELETE: replaced by BrokerModal
├── pages/
│   ├── Brokers.js             # MODIFY: major -- add send bar, modal, per-broker send
│   ├── Track.js               # REPLACE: full campaign dashboard
│   ├── Send.js                # DELETE: merged into Brokers
│   ├── Identity.js            # MODIFY: add EmailJS config section, temp email creation
│   └── ...
└── app.js                     # MODIFY: remove 'send' route, update wizard steps
```

### Pattern 1: Batch Sending Loop with Signals
**What:** Async sequential sending with reactive progress updates
**When to use:** The "Send All" flow (D-02, D-03, D-04)

```javascript
// src/lib/email-sender.js
import { signal, computed } from '@preact/signals';

// Batch state -- module-level signals
export const batchState = signal({
  active: false,
  cancelled: false,
  total: 0,
  sent: 0,
  failed: [],
  current: null, // broker ID currently being sent
  log: [], // { brokerId, status: 'sent'|'failed'|'skipped', at: ISO, error? }
});

export const batchProgress = computed(() => {
  const s = batchState.value;
  if (s.total === 0) return 0;
  return Math.round(((s.sent + s.failed.length) / s.total) * 100);
});

/**
 * Send erasure requests to all selected brokers sequentially.
 * D-02: 2-3 second delay between sends.
 * D-04: Skip on error, retry failed up to 3 times.
 */
export async function sendBatch(brokerIds, sendFn) {
  batchState.value = {
    active: true, cancelled: false,
    total: brokerIds.length, sent: 0, failed: [], current: null, log: [],
  };

  for (const brokerId of brokerIds) {
    if (batchState.value.cancelled) break;

    batchState.value = { ...batchState.value, current: brokerId };

    let success = false;
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      try {
        await sendFn(brokerId);
        success = true;
        batchState.value = {
          ...batchState.value,
          sent: batchState.value.sent + 1,
          log: [...batchState.value.log, { brokerId, status: 'sent', at: new Date().toISOString() }],
        };
      } catch (err) {
        if (attempt < 2) await delay(3000); // retry delay
      }
    }

    if (!success) {
      batchState.value = {
        ...batchState.value,
        failed: [...batchState.value.failed, brokerId],
        log: [...batchState.value.log, { brokerId, status: 'failed', at: new Date().toISOString() }],
      };
    }

    await delay(2000 + Math.random() * 1000); // D-02: 2-3s delay
  }

  batchState.value = { ...batchState.value, active: false, current: null };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Pattern 2: Status Lifecycle with Immutable Updates
**What:** Per-broker status tracking with full history
**When to use:** Campaign status management (D-37, D-41)

```javascript
// Addition to src/lib/campaign.js
/**
 * Update a broker's status with history tracking.
 * D-41: { status, sentAt, deadline, history[] }
 */
export function updateBrokerStatus(brokerId, status, details = {}) {
  const statuses = { ...campaign.value.statuses };
  const existing = statuses[brokerId] || { history: [] };

  statuses[brokerId] = {
    ...existing,
    ...details,
    status,
    history: [
      ...existing.history,
      { status, at: new Date().toISOString(), ...details },
    ],
  };

  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    statuses,
  };
}
```

### Pattern 3: Centered Modal with Navigation
**What:** Modal that replaces sidebar, with broker-to-broker navigation
**When to use:** Broker detail view (D-16 through D-22)

```javascript
// src/components/BrokerModal.js
import { signal, computed } from '@preact/signals';

export const modalOpen = signal(false);
export const modalBrokerId = signal(null);

// Computed: find current broker index in filtered list for navigation
// The modal needs access to the current filtered broker list to support
// [<-] [Broker Name (3/169)] [->] navigation arrows (D-19)

export function openModal(brokerId) {
  modalBrokerId.value = brokerId;
  modalOpen.value = true;
}

export function closeModal() {
  modalOpen.value = false;
  modalBrokerId.value = null;
}
```

### Pattern 4: Toast Notification System
**What:** Bottom-right stacking toasts with auto-dismiss and click navigation
**When to use:** Send confirmations, errors, status updates (D-51 through D-53)

```javascript
// src/lib/notifications.js
import { signal, computed } from '@preact/signals';

export const notifications = signal([]);
export const unreadCount = computed(() =>
  notifications.value.filter(n => !n.read).length
);

export function addNotification(notification) {
  const id = crypto.randomUUID();
  const entry = { id, ...notification, read: false, at: new Date().toISOString() };
  notifications.value = [entry, ...notifications.value].slice(0, 50); // keep last 50
  return id;
}

export function markRead(id) {
  notifications.value = notifications.value.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
}
```

### Anti-Patterns to Avoid
- **Mutating signal values:** Always create new objects/arrays when updating signals. `batchState.value.sent++` will NOT trigger reactivity. Must use `batchState.value = { ...batchState.value, sent: s + 1 }`.
- **Storing full broker objects in statuses:** Store only broker IDs in `campaign.statuses`. Look up broker metadata from the brokers array when rendering.
- **Synchronous batch sending:** Even with delays, the batch must be cancellable. Use a `cancelled` flag checked between iterations, not Promise.race patterns.
- **Using setInterval for overdue detection:** Check deadlines on Track page load and when statuses change, not on a timer. The app may not be open when deadlines pass.
- **Hardcoding EmailJS credentials in source:** Store service ID, template ID, and public key in `campaign.settings` so they persist in the save file and are not committed to git.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar month arithmetic | Manual date math (`+30 days` or `setMonth`) | `date-fns/addMonths` | End-of-month edge cases (Jan 31 + 1mo should be Feb 28, not Mar 3). Native `setMonth` gets this wrong. |
| Email sending relay | Direct SMTP from browser | EmailJS SDK | Browsers cannot do raw SMTP. All "client-side SMTP" tools are proxies. EmailJS is the established, free option. |
| Clipboard copy | Custom textarea hack | Existing `clipboard.js` | Already handles secure context detection and legacy fallback. |
| File save/load | Manual File API | Existing `browser-fs-access` | Already handles cross-browser fallback (Chromium vs Firefox/Safari). |
| UUID generation | Custom ID function | `crypto.randomUUID()` | Browser native, no library needed, already used in project. |

## Common Pitfalls

### Pitfall 1: EmailJS Template Configuration Complexity
**What goes wrong:** Users don't want to create an EmailJS account and configure templates just to use a privacy tool.
**Why it happens:** EmailJS requires account setup, service connection, and template creation in their dashboard -- friction that contradicts the "zero setup" philosophy.
**How to avoid:** Provide step-by-step in-app setup wizard with screenshots. Pre-write the EmailJS template content in docs so users can copy-paste. Consider providing a "use mailto: instead" toggle for users who don't want EmailJS setup.
**Warning signs:** Users abandon the app at the EmailJS setup step.

### Pitfall 2: Signal Mutation in Batch Loops
**What goes wrong:** Batch progress doesn't update in real-time. UI freezes during sending.
**Why it happens:** Signal updates in a tight synchronous loop don't give Preact a chance to re-render. Or signal values are mutated instead of replaced.
**How to avoid:** Use `await delay()` between sends (which yields to the event loop for rendering). Always create new objects when updating signals. Test with `queueMicrotask` or `requestAnimationFrame` if updates still batch.
**Warning signs:** Progress bar jumps from 0% to 100% without intermediate states.

### Pitfall 3: date-fns addMonths End-of-Month Clamping
**What goes wrong:** Adding 1 month to Jan 31 gives Feb 28, then subtracting 1 month gives Jan 28 (not Jan 31). Round-tripping is not reversible.
**Why it happens:** date-fns clamps to the last valid day of the target month. This is correct for deadline calculation but can confuse comparison logic.
**How to avoid:** Store the original `sentAt` date separately from the calculated `deadline`. Never derive `sentAt` by subtracting from `deadline`. For overdue detection, compare `today > deadline`, not month differences.
**Warning signs:** Off-by-one errors in overdue detection at month boundaries.

### Pitfall 4: Stepper Renumbering Breaking Navigation
**What goes wrong:** Removing the Send step and renumbering Track from step 4 to step 3 breaks all existing route references and `completedSteps` state.
**Why it happens:** The Stepper component, router, and app.js all have hardcoded step arrays. `completedSteps` is a Set of step IDs, and `navigateTo('send')` calls exist.
**How to avoid:** Update all references atomically: Stepper STEPS array, app.js WIZARD_STEPS set, all `navigateTo()` calls, and `markStepComplete()` calls. Search for "send" in the entire codebase.
**Warning signs:** Clicking Brokers "Continue" button navigates to a blank page.

### Pitfall 5: Modal vs Inline Expand Click Conflict
**What goes wrong:** Clicking a broker row opens the modal AND toggles the expand, or vice versa.
**Why it happens:** D-17 specifies: click row = open modal, click chevron = expand inline, checkbox stops propagation. This requires precise event delegation with `stopPropagation()`.
**How to avoid:** Make the chevron button and checkbox explicitly stop propagation. The row click handler opens the modal. Test with actual clicks, not just unit tests.
**Warning signs:** Double-action on click (modal opens AND row expands simultaneously).

### Pitfall 6: EmailJS Free Tier Exhaustion Mid-Batch
**What goes wrong:** Batch sending stops at email 200 because the free tier quota is hit.
**Why it happens:** EmailJS returns a specific error (status 429 or similar) when the monthly quota is exhausted.
**How to avoid:** Check remaining quota before starting batch (if API allows). Handle quota exhaustion gracefully -- stop batch, mark remaining as "failed", offer mailto: fallback for remaining brokers. Show clear message: "EmailJS free tier limit reached (200/month). Use manual sending for remaining brokers."
**Warning signs:** Batch fails silently partway through with no user feedback.

### Pitfall 7: Campaign Version Migration
**What goes wrong:** Loading an old campaign JSON (version 2) that lacks the new `statuses` schema crashes the app.
**Why it happens:** Phase 5 expands `statuses` from `{}` to `{ [brokerId]: { status, sentAt, deadline, history[] } }`. Old saves don't have this structure.
**How to avoid:** Bump `CURRENT_VERSION` to 3. Update `migrateCampaign()` to handle v2 -> v3 migration (initialize missing fields). Existing empty `statuses: {}` is already compatible but the migration function should be explicit.
**Warning signs:** App crashes on "Load" with `Cannot read property 'history' of undefined`.

## Code Examples

### Deadline Calculation with date-fns

```javascript
// src/lib/deadline.js
import { addMonths, isAfter, startOfDay, differenceInDays } from 'date-fns';

/**
 * Calculate the GDPR calendar month deadline from a send date.
 * GDPR Art. 12(3): "one calendar month" -- uses date-fns addMonths
 * which correctly handles end-of-month (Jan 31 + 1mo = Feb 28).
 * D-38, D-39: overdue = day AFTER deadline.
 */
export function calculateDeadline(sentAt) {
  const sentDate = new Date(sentAt);
  return addMonths(sentDate, 1);
}

/**
 * Check if a broker is overdue.
 * D-39: overdue = day after deadline (if deadline is Apr 28, overdue on Apr 29).
 */
export function isOverdue(deadline) {
  const today = startOfDay(new Date());
  const deadlineDate = startOfDay(new Date(deadline));
  return isAfter(today, deadlineDate);
}

/**
 * Get deadline display info for UI.
 * D-28: "Apr 28 (23 days left)" with color coding.
 */
export function getDeadlineInfo(deadline) {
  const today = startOfDay(new Date());
  const deadlineDate = startOfDay(new Date(deadline));
  const daysLeft = differenceInDays(deadlineDate, today);

  if (daysLeft < 0) {
    return { label: `${Math.abs(daysLeft)} days overdue`, color: 'danger', overdue: true };
  } else if (daysLeft < 7) {
    return { label: `${daysLeft} days left`, color: 'danger', overdue: false };
  } else if (daysLeft < 14) {
    return { label: `${daysLeft} days left`, color: 'warning', overdue: false };
  } else {
    return { label: `${daysLeft} days left`, color: 'success', overdue: false };
  }
}
```

### EmailJS Integration

```javascript
// src/lib/email-sender.js (EmailJS sending function)

/**
 * Send a single email via EmailJS.
 * Requires EmailJS config in campaign.settings.
 */
export async function sendViaEmailJS(broker, template, config) {
  const { publicKey, serviceId, templateId } = config;

  // EmailJS send with dynamic template params
  // The template in EmailJS dashboard should have placeholders:
  // {{to_email}}, {{subject}}, {{body}}, {{reply_to}}
  const response = await emailjs.send(serviceId, templateId, {
    to_email: broker.email,
    subject: template.subject,
    body: template.body,
    reply_to: config.tempEmailAddress || '',
    from_name: template.identity?.fullName || 'ErasureKit User',
  }, { publicKey });

  return response;
}

/**
 * Fallback: generate mailto: link for manual sending.
 * Used when EmailJS is unavailable or quota exhausted.
 */
export function generateMailtoLink(broker, template) {
  const params = new URLSearchParams();
  params.set('subject', template.subject);
  params.set('body', template.body);
  const url = `mailto:${broker.email}?${params.toString()}`;

  // D-04 / SEND-04: check URL length limit
  if (url.length > 2000) {
    return { type: 'clipboard', url: null, reason: 'Template exceeds mailto: URL limit' };
  }
  return { type: 'mailto', url };
}
```

### Expanded Campaign Status Schema (v3)

```javascript
// Updated campaign schema for Phase 5
// campaign.statuses[brokerId] = {
//   status: 'selected' | 'awaiting' | 'acknowledged' | 'confirmed' | 'rejected' | 'escalated' | 'overdue',
//   sentAt: ISO string | null,
//   deadline: ISO string | null,
//   history: [
//     { status: 'selected', at: ISO },
//     { status: 'awaiting', at: ISO, details: 'Sent via EmailJS' },
//     { status: 'overdue', at: ISO, details: 'Deadline passed' },
//   ],
// }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| mailto: links (user's email client) | EmailJS automated sending | Phase 5 context (D-01) | No user confirmations, fully automated batch |
| 4-step wizard (Identity/Brokers/Send/Track) | 3-step wizard (Identity/Brokers/Track) | Phase 5 context (D-07) | Send page deleted, merged into Brokers |
| Right sidebar for template preview | Centered modal (max-w-3xl) | Phase 5 context (D-16) | More screen space, better mobile, navigation arrows |
| Naive +30 days deadline | `addMonths()` calendar month | Phase 5 context (D-38) | Legally accurate GDPR deadlines |
| date-fns v3.x | date-fns v4.1.0 | 2025 | First-class time zone support, TypeScript types |
| EmailJS v3.x | EmailJS v4.4.1 | 2025 | ESM support, improved CDN bundle |

## Open Questions

1. **EmailJS Setup Friction vs User Privacy Expectations**
   - What we know: EmailJS requires account creation and API key. This adds friction to a "zero setup" tool.
   - What's unclear: Will privacy-conscious GDPR users be comfortable with EmailJS as an intermediary?
   - Recommendation: Provide clear messaging that EmailJS is open-source SDK (client-side), the public key is not a secret, and EmailJS does not store email content. Offer mailto: as a no-account-needed alternative.

2. **D-01 "Send from temp email" vs Technical Reality**
   - What we know: No free service creates a temp address AND sends from it. EmailJS sends from the user's connected email service.
   - What's unclear: Will the user accept this architectural compromise?
   - Recommendation: The planner should flag this to the user during execution. The core user intent ("automated, no manual confirmations") IS satisfied by EmailJS. The "from temp email" aspect cannot be achieved without a paid service or self-hosted server. The temp email (mail.tm) still serves as the reply-to address in the email body.

3. **EmailJS Template vs Per-Broker Dynamic Content**
   - What we know: EmailJS templates use `{{variable}}` syntax. The app has 3 template variants (GDPR, UK-GDPR, CCPA) with per-broker customization.
   - What's unclear: Can one EmailJS template handle all variants, or does each need a separate template (limited to 2 on free tier)?
   - Recommendation: Use ONE EmailJS template with `{{{body}}}` (triple brackets for unescaped HTML/text) where the entire email body is passed as a dynamic parameter. The app generates the full body (as it already does in template-engine.js), and EmailJS just relays it. This uses only 1 of the 2 free templates.

4. **Temp Email Creation Timing (D-45 vs Phase 6)**
   - What we know: D-45 says temp email is created in Identity step. TEMP-01 through TEMP-07 are Phase 6 requirements.
   - What's unclear: Should Phase 5 implement mail.tm account creation, or just prepare the UI slot?
   - Recommendation: Phase 5 should implement the mail.tm account creation (POST /accounts, POST /token) since D-45 explicitly requires it in Identity step and D-13 disables sending until a temp email exists. Phase 6 then adds response monitoring (polling, classification). The creation is a prerequisite for sending.

5. **Auto-Escalation (D-42) Timing**
   - What we know: D-42 says "app automatically sends follow-up warning email" when deadline passes. But the app may not be open when deadlines pass.
   - What's unclear: When does the auto-escalation check run?
   - Recommendation: Check on Track page load (D-40). When overdue brokers are found without a prior escalation attempt, auto-send the warning email and record it in history. This is not real-time -- it happens when the user opens the app after deadlines pass. Document this limitation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build mode, pnpm | Yes | (system) | Dev mode works without Node |
| pnpm | Package install | Yes | (system) | npm |
| date-fns | Deadline calculation | Not yet installed | Will be 4.1.0 | None -- required |
| EmailJS CDN | Email sending (dev mode) | External CDN | 4.4.1 | mailto: fallback |
| mail.tm API | Temp email creation | External API | v1 | mail.gw as alternative |
| Vitest | Testing | Yes (devDep) | 4.1.2 | -- |

**Missing dependencies with no fallback:**
- date-fns must be installed (`pnpm add date-fns`)

**Missing dependencies with fallback:**
- EmailJS: falls back to mailto: links if unavailable
- mail.tm: falls back to mail.gw (same API structure)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.js` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEND-01 | EmailJS sendViaEmailJS calls emailjs.send with correct params | unit | `pnpm test -- --grep "sendViaEmailJS"` | Wave 0 |
| SEND-02 | sendBatch processes brokers sequentially with delay | unit | `pnpm test -- --grep "sendBatch"` | Wave 0 |
| SEND-03 | Status auto-transitions to 'awaiting' after send | unit | `pnpm test -- --grep "updateBrokerStatus"` | Wave 0 |
| SEND-04 | generateMailtoLink returns clipboard fallback when > 2000 chars | unit | `pnpm test -- --grep "generateMailtoLink"` | Wave 0 |
| STAT-01 | updateBrokerStatus creates correct lifecycle entries | unit | `pnpm test -- --grep "status lifecycle"` | Wave 0 |
| STAT-02 | calculateDeadline uses addMonths correctly (Jan 31 case) | unit | `pnpm test -- --grep "calculateDeadline"` | Wave 0 |
| STAT-03 | isOverdue returns true day after deadline | unit | `pnpm test -- --grep "isOverdue"` | Wave 0 |
| STAT-04 | Computed aggregate stats signal produces correct counts | unit | `pnpm test -- --grep "aggregate stats"` | Wave 0 |
| STAT-05 | Progress percentage = (confirmed+rejected)/total | unit | `pnpm test -- --grep "progress percentage"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/email-sender.test.js` -- covers SEND-01, SEND-02, SEND-04
- [ ] `src/lib/deadline.test.js` -- covers STAT-02, STAT-03
- [ ] `src/lib/notifications.test.js` -- covers notification add/read/count
- [ ] Campaign status helpers added to `src/lib/campaign.test.js` -- covers SEND-03, STAT-01, STAT-04, STAT-05

## Sources

### Primary (HIGH confidence)
- [mail.tm FAQ](https://mail.tm/en/faq/) -- confirmed receive-only, no send endpoint
- [mail.gw FAQ](https://mail.gw/en/faq/) -- confirmed receive-only: "Unfortunately, we do not provide this feature"
- [Guerrilla Mail API](https://www.guerrillamail.com/GuerrillaMailAPI.html) -- no send_email function in API documentation
- [EmailJS docs](https://www.emailjs.com/docs/sdk/send/) -- CDN installation, send() API, dynamic variables
- [EmailJS pricing](https://www.emailjs.com/pricing/) -- 200 emails/month free, 2 templates
- [date-fns npm](https://www.npmjs.com/package/date-fns) -- v4.1.0, addMonths end-of-month behavior
- [date-fns addMonths issue #3506](https://github.com/date-fns/date-fns/issues/3506) -- end-of-month clamping is by design
- [Resend CORS docs](https://resend.com/docs/knowledge-base/how-do-i-fix-cors-issues) -- explicitly does NOT support browser calls
- [MailSlurp free plan limits](https://www.mailslurp.com/support/free-plan-limitations/) -- free accounts cannot send to external addresses

### Secondary (MEDIUM confidence)
- [EmailJS GitHub SDK](https://github.com/emailjs-com/emailjs-sdk) -- v4.4.1, ESM support, CDN bundle
- [MailSlurp pricing](https://app.mailslurp.com/pricing/) -- paid plans from $19/month
- [mailto URL length limits](https://superruub.wordpress.com/2013/05/30/mailto-protocol-character-limit/) -- ~2000 chars practical limit

### Tertiary (LOW confidence)
- [FreeCustom.Email](https://www.freecustom.email/en) -- newer mail.tm alternative, receive-only but needs direct testing
- [SMTP.js](https://smtpjs.com/) -- proxies through smtpjs.com, security concerns, not recommended

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM -- EmailJS is the only viable option but introduces setup friction and a 200/month limit that may not satisfy the user's "zero setup" expectation
- Architecture: HIGH -- patterns follow existing codebase conventions (signals, immutable updates, module-level state)
- Pitfalls: HIGH -- identified from direct code reading and library documentation
- Temp email sending: HIGH -- exhaustively verified that no free service supports outbound sending

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (EmailJS pricing/features could change; temp email landscape evolves)
