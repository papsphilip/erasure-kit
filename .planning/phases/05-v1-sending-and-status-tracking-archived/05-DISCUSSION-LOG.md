# Phase 5: Sending and Status Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30 (session 1), 2026-03-31 (session 2)
**Phase:** 05-sending-and-status-tracking
**Areas discussed:** Send page layout, Batch sending UX, Campaign dashboard, Status lifecycle, Temp email lifecycle, Send page transformation (Brokers+Send merge), Sidebar->Modal replacement, Notification system, Campaign restart

---

## Session 1 (2026-03-30): Send Page Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Action list layout | Vertical list with per-broker Send buttons | ✓ (later superseded) |
| Card grid | Cards instead of list | |

**Decisions captured:** D-01 through D-08 (send page layout), D-09 through D-12 (batch UX with mailto: confirmation flow)
**Notes:** These were captured before the architecture pivot to automated temp-email sending.

---

## Session 2 (2026-03-31): Architecture Pivot

**User clarification:** "the user has to fill out his info in the first step, then check out the brokers, add if any are missing and then click send and watch. emails are sent to all brokers with the correct appropriate templates. user can track progress and see replies when they come in. if replies are not coming in before the scheduled period the system auto escalates. we dont want the user doing any confirmations."

**User clarification:** "we said we want to create temporary emails for this... we create temporary email for the user so that they dont expose more data to the web for the brokers to fetch when we contact them. emails should be sent via code automatically. we want free opensource way to do this"

This superseded the entire mailto: + confirmation flow (D-09 through D-12).

---

## Campaign Dashboard

| Question | Options | Selected |
|----------|---------|----------|
| Where should dashboard live? | Track page / Top of Send / Both | Track page (step 4) ✓ |
| Progress visualization? | Bar + stats grid / Donut chart / Stats only | Progress bar + stats grid ✓ |
| Main content? | Full broker list / Status-grouped / Only flagged | Full broker status list ✓ |
| Filter/sort controls? | Filter + sort / Sort only / No controls | Filter by status + sort ✓ |
| Deadline display? | Days countdown / Calendar date / Both | Both — date + countdown ✓ |
| Overdue treatment? | Red + escalate btn / Red badge only / Pinned top | Red highlight + escalate button ✓ |
| History per broker? | No history / Expandable row / You decide | Expandable history row ✓ |
| Page width? | max-w-4xl / max-w-5xl / Full width | Same max-w-4xl ✓ |
| Manual status changes? | Dropdown per broker / Via expand / Wait for Phase 6 | No — wait for Phase 6 ✓ |
| Empty state? | Nudge to Send / Show pending / You decide | Nudge to Send page ✓ |
| Progress % basis? | Resolved/total / Sent/total / Two bars | Resolved / Total selected ✓ |
| Stat card style? | Color-coded / Monochrome + icons / You decide | Color-coded cards ✓ |
| Clickable stat cards? | Yes filter / No — use controls / You decide | No — filter controls only ✓ |
| Export feature? | No / CSV export / You decide | No — save/load covers it ✓ |
| Real-time updates? | Via signals / Refresh on mount / You decide | Real-time via shared signals ✓ |
| Completion celebration? | Success banner / No / You decide | Yes — subtle success banner ✓ |

---

## Status Lifecycle

| Question | Options | Selected |
|----------|---------|----------|
| Sent→awaiting transition? | Auto-transition / Two-step / Merge into one | Auto-transition: sent → awaiting ✓ |
| Deadline calculation? | date-fns addMonths / Simple +30 days / You decide | date-fns addMonths ✓ |
| When flagged overdue? | Day after deadline / 3 days grace / You decide | Day after deadline ✓ |
| Overdue detection timing? | Auto on page load / Background timer / Manual | Auto on page load ✓ |
| Status data model? | Object with history / Flat string / You decide | Object per broker with full history ✓ |
| Send log UI? | In expandable rows / Separate page / Console-only | In expandable history rows ✓ |
| Auto-escalation behavior? | Auto-send warning / Flag + one-click / Flag only | Auto-send escalation email ✓ |
| DPA complaint auto-filing? | Warnings only / Full auto / You decide | Warnings only — DPA needs approval ✓ |
| Auto-reply handling? | Classify as "acknowledged" / Ignore / You decide | Classify as "acknowledged" ✓ |

---

## Sending Architecture (revised)

| Question | Options | Selected |
|----------|---------|----------|
| Batch rate limiting? | (User specified) | Sequential with 2-3s delay ✓ |
| Error handling? | (User specified) | Skip + retry 3x, flag if still fails ✓ |
| Failed email fallback? | Copy button / Download .txt / Both | Both options ✓ |
| Send progress UI? | Bar + live log / Bar only / Silent | Progress bar + live log ✓ |
| Send delay? | 2-3 sec / 5 sec / Researcher decides | 2-3 seconds ✓ |

---

## Temp Email Lifecycle

| Question | Options | Selected |
|----------|---------|----------|
| When created? | On Send All click / In Identity step / On first launch | User creates in Identity step ✓ |
| Visibility? | Visible read-only / Hidden / Visible + copy | Visible but read-only ✓ |
| When deleted? | User clicks Delete / Auto on completion / Never | User clicks "Delete" when complete ✓ |
| Credentials in save file? | Yes / Session-only / Encrypted | Yes — included in campaign JSON ✓ |
| Service down handling? | (User specified) | Retry 3x with 3s delay, fallback to alternative services ✓ |
| Health check? | Status dot in header / Check on send only / None | Small status dot in header ✓ |

---

## Brokers + Send Page Merge

**User initiated:** "i think we need to merge brokers and send page"
**User specified:** "send all can be at the bottom and each broker object should have a send button as well. users can send all or send manually to any of the brokers."

| Question | Options | Selected |
|----------|---------|----------|
| Send progress location? | Inline on Brokers / Modal overlay / Auto-navigate to Track | Auto-navigate to Track page ✓ |
| Individual send navigation? | Stay on Brokers / Navigate to Track / You decide | Stay on Brokers page ✓ |
| Per-broker send button scope? | Selected only / All brokers / You decide | All brokers (user: "all brokers have an email send icon") ✓ |
| Sent icon behavior? | ✓ with re-send hover / Always show / Disable | ✓ with re-send on hover ✓ |
| Send All position? | Sticky bottom bar / Below table / Top | Sticky bottom bar ✓ |
| Bottom bar stats? | Selected + sent counts / Selected only / You decide | "169 selected · 42 sent — [Send Remaining (127)]" ✓ |
| Confirmation before Send All? | Simple dialog / No / You decide | Yes — simple confirmation dialog ✓ |
| Stepper labels? | Identity→Brokers→Track / Setup→Brokers&Send→Track / You decide | Identity → Brokers → Track ✓ |
| Guard without temp email? | Disabled + tooltip / Block at send / You decide | Disabled with tooltip ✓ |
| Cancel batch? | Yes on Track / No / You decide | Yes — cancel button on Track page ✓ |
| Sent broker visual? | Dimmed + ✓ / Grouped / No difference | Dimmed rows with ✓ ✓ |
| Template sidebar changes? | Keep as-is / Add send / You decide | Keep as-is (then superseded by modal) ✓ |

---

## Sidebar → Modal Replacement

**User initiated:** "lets remove the sidebar and user just clicks on the broker item and the modal opens. to expand info below the broker item we need an arrow icon"

| Question | Options | Selected |
|----------|---------|----------|
| Modal navigation scope? | All in filtered view / Selected only / All brokers | All brokers in current filtered view ✓ |
| Send button in modal? | Yes / No — preview only / You decide | Yes — send button in modal ✓ |
| Metadata in modal? | Both metadata + template / Template only / You decide | Both — metadata + template ✓ |
| Keep expandable row? | Yes / Remove | Keep expandable row ✓ |
| Click targets? | Row=modal, chevron=expand / Name=modal / You decide | Row click = modal, chevron = expand ✓ |
| Modal size? | max-w-3xl / max-w-5xl / Full screen | Large centered max-w-3xl ✓ |
| Nav arrow position? | Header flanking name / Outside modal / Footer | Modal header — left/right of name ✓ |
| Keyboard navigation? | Yes when textarea unfocused / No | No — click only ✓ |

---

## Notification System

| Question | Options | Selected |
|----------|---------|----------|
| Notification type? | In-app toasts / Browser push / Both | In-app toast notifications ✓ |
| Track tab badge? | Count badge / Dot only / No badge | Red badge with count ✓ |
| Clickable toasts? | Yes navigate / Informational only / You decide | Yes — click to navigate ✓ |
| Toast duration? | 5 sec + dismiss / Persist / You decide | 5 seconds with manual dismiss ✓ |
| Toast styles? | Color-coded / All same / You decide | Color-coded by type ✓ |
| Notification history? | Bell icon with 5 recent / No — Track is history / You decide | Bell icon top-right, 5 most recent ✓ |
| Bell badge? | Red dot + count / Dot only / You decide | Red dot with count ✓ |
| Bell click behavior? | Navigate to broker / View-only / You decide | Click navigates to broker ✓ |
| Keep-alive messaging? | No special handling / Hint / You decide | No special handling ✓ |
| Toast position? | Bottom-right / Top-right / Bottom-center | Bottom-right ✓ |

---

## Campaign Restart

| Question | Options | Selected |
|----------|---------|----------|
| Multi-campaign? | One at a time / Multiple simultaneous / You decide | One campaign at a time ✓ |
| Start new behavior? | Prompt to save / Auto-save / Just clear | Prompt to save, then clear ✓ |
| Re-run support? | Load + reset statuses / No special flow / You decide | Load old campaign, reset statuses ✓ |

---

## Claude's Discretion

- No areas explicitly deferred to Claude's discretion in this phase.

## Deferred Ideas

- EmailJS as optional fallback sender (if temp email research fails)
- Browser push notifications (opt-in toggle)
- Multiple simultaneous campaigns
- Auto-file DPA complaints (currently warnings only)
