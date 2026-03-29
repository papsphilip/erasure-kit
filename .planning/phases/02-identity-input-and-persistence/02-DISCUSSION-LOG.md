# Phase 2: Identity Input and Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 02-identity-input-and-persistence
**Areas discussed:** Identity form design, Campaign data model, Save/load UX, Privacy indicators

---

## Identity Form Design

### Form Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single card | One rounded-xl card with all fields stacked vertically | ✓ |
| Two sections | Required fields in one card, optional in separate card below | |
| Accordion sections | All fields in one card, optional fields in accordion | |

**User's choice:** Single card
**Notes:** User selected the recommended option matching the ASCII mockup with stacked fields

### Multi-Email Input

| Option | Description | Selected |
|--------|-------------|----------|
| List with add/remove | Each email is a row with input + [x] remove, "+ Add email" link | ✓ |
| Tag-style chips | Single input, emails become removable chips on Enter | |
| Comma-separated textarea | One textarea with comma-separated emails | |

**User's choice:** List with add/remove
**Notes:** Clear, discoverable pattern

### Form Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline real-time | Validate on blur, red border + helper text, Continue disabled until valid | ✓ |
| On submit only | No validation until Continue clicked | |
| You decide | Claude picks | |

**User's choice:** Inline real-time
**Notes:** Continue button disabled until name + at least 1 valid email

### Continue Button Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, go to Brokers | Navigate to Step 2 and mark Identity complete | ✓ |
| Just save, stay on page | Save data and show success, manual navigation | |
| You decide | Claude picks | |

**User's choice:** Yes, go to Brokers

### Optional Fields Disclosure

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible disclosure | Clickable row that expands phone + address in-place, collapsed by default | ✓ |
| Always visible | Show phone + address always, marked "(optional)" | |
| You decide | Claude picks | |

**User's choice:** Collapsible disclosure

### Helper Text

| Option | Description | Selected |
|--------|-------------|----------|
| Brief inline hints | Small muted text under fields explaining WHY needed | ✓ |
| Placeholder text only | Use input placeholders only | |
| No helper text | Field labels only | |

**User's choice:** Brief inline hints

### Email Limit

| Option | Description | Selected |
|--------|-------------|----------|
| Soft limit of 10 | Note after 10 but allow more | ✓ |
| No limit | Unlimited emails | |
| You decide | Claude picks | |

**User's choice:** Soft limit of 10

---

## Campaign Data Model

### JSON Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Flat with version key | Top-level sections: version, identity, brokers, etc. | ✓ |
| Nested by phase | Each phase's data in its own namespace | |
| You decide | Claude designs | |

**User's choice:** Flat with version key

### File Name

| Option | Description | Selected |
|--------|-------------|----------|
| Default with override | Default "erasure-kit-campaign.json", user can rename in picker | ✓ |
| Fixed name | Always same name, no config | |
| You decide | Claude picks | |

**User's choice:** Default with override

### localStorage/File Relationship

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage as draft cache | Auto-save on change, file save is explicit, file overwrites localStorage on load | ✓ |
| localStorage mirrors file | localStorage always matches last file save | |
| You decide | Claude designs | |

**User's choice:** localStorage as draft cache

### Future Phase Slots

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include empty slots | Full schema with null/empty values for Phase 3-8 fields | ✓ |
| No, only identity + persistence | Only write what Phase 2 owns | |
| You decide | Claude decides | |

**User's choice:** Yes, include empty slots

### Version Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-migrate forward | Auto-upgrade older files, refuse newer files | ✓ |
| Strict version match | Only load exact version match | |
| You decide | Claude designs | |

**User's choice:** Auto-migrate forward

### localStorage Key

| Option | Description | Selected |
|--------|-------------|----------|
| Single key: ek-campaign | One key stores entire campaign JSON | ✓ |
| Multiple keys by section | Split across ek-identity, ek-brokers, etc. | |
| You decide | Claude picks | |

**User's choice:** Single key: ek-campaign

---

## Save/Load UX

### Control Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Header action buttons | Save and Load icon buttons in header, always visible | ✓ |
| Hamburger menu items | Save/Load inside existing hamburger menu | |
| Welcome screen only | Only accessible from welcome screen | |
| You decide | Claude picks | |

**User's choice:** Header action buttons

### Auto-Save Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle status text | Small "Auto-saved" with checkmark in footer, fades after 2s | ✓ |
| No indicator | Silent auto-save | |
| You decide | Claude picks | |

**User's choice:** Subtle status text

### Resume Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dual buttons | Resume Campaign (primary) + Start New (secondary) with summary | ✓ |
| Smart auto-resume | Skip welcome, go straight to Identity with data pre-filled | |
| You decide | Claude picks | |

**User's choice:** Dual buttons

### Browser Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect and adapt | Chromium: native picker. Others: download/upload. Same button. | ✓ |
| Show capability warning | One-time notice on non-Chromium browsers | |
| You decide | Claude picks | |

**User's choice:** Auto-detect and adapt

### Overwrite Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent overwrite | If file handle exists, write silently | |
| Always confirm | Show file picker every time | ✓ |
| You decide | Claude picks | |

**User's choice:** Always confirm
**Notes:** User explicitly rejected silent overwrite — always show file picker on Save

### Load Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly error message | Clear message with "Try another file" / "Cancel" | ✓ |
| Attempt partial recovery | Parse what you can, fill defaults for broken fields | |
| You decide | Claude picks | |

**User's choice:** Friendly error message

---

## Privacy Indicators

### Privacy Reassurance

| Option | Description | Selected |
|--------|-------------|----------|
| Contextual micro-copy | Lock icon + "Your data never leaves this device" in form card | ✓ |
| Privacy shield banner | Colored banner at top of Identity page | |
| Footer-only privacy note | Only the existing footer statement | |
| You decide | Claude picks | |

**User's choice:** Contextual micro-copy

### Network Activity Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator needed | Phase 2 has zero network calls, save for Phase 6 | ✓ |
| Always show "offline" badge | Persistent green badge in header | |
| You decide | Claude decides | |

**User's choice:** No indicator needed
**Notes:** Correct — Phase 2 makes no network calls. Network indicator deferred to Phase 6.

---

## Claude's Discretion

- State management implementation (Preact Signals structure for campaign data)
- browser-fs-access integration details and API usage
- localStorage auto-save debounce timing
- Form field ordering within the card
- Address field format (single textarea vs structured fields)
- Phone input format (free text vs structured)
- Exact validation regex for email addresses
- CSS transitions for disclosure expand/collapse and auto-save indicator fade

## Deferred Ideas

None — discussion stayed within phase scope.
