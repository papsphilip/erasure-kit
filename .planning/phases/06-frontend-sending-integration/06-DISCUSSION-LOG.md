# Phase 6: Frontend Sending Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 06-frontend-sending-integration
**Areas discussed:** Send flow UX, Error handling and retry, Key pair initialization, End Campaign flow, Welcome screen changes, Demo mode integration

---

## Send Flow UX

### Progress UI

| Option | Description | Selected |
|--------|-------------|----------|
| Modal with progress | Full-screen modal: progress bar, broker name, counts, abort | ✓ |
| Inline on Brokers page | Progress appears on the page itself | |
| You decide | Claude picks | |

**User's choice:** Modal with progress

### Confirmation Dialog

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always confirm | Show broker count, temp address, Send + Cancel | ✓ |
| No confirmation | Start immediately | |

**User's choice:** Yes, always confirm

### Post-Send

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-navigate to Track | Modal summary, then View Campaign to Track | ✓ |
| Stay on Brokers page | Modal closes, manual navigation | |

**User's choice:** Auto-navigate to Track page

---

## Error Handling and Retry

### Failed State

| Option | Description | Selected |
|--------|-------------|----------|
| New STATUS.FAILED with retry | Red status, error reason, per-broker + bulk retry | ✓ |
| Revert to selected, toast only | Silent revert with notification | |

**User's choice:** New STATUS.FAILED with retry button

### Rate Limit Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Pause and auto-resume | Modal shows countdown, resumes automatically | ✓ |
| Stop and notify | Sending stops, user must restart | |

**User's choice:** Pause and auto-resume

---

## Key Pair Initialization

### Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On campaign creation | Generate when Start New Campaign clicked | ✓ |
| On identity completion | Generate after identity form | |
| On first Send All | Lazy initialization | |

**User's choice:** On campaign creation
**Notes:** User specifically wants the temp address visible on the home/welcome screen to explain the workflow. Lazy init would be too late.

---

## End Campaign Flow

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| Track page | Bottom of dashboard, manual stop option | ✓ |
| Header menu | In hamburger menu | |
| Both | Primary on Track, also in menu | |

**User's choice:** Track page

### Cleanup Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Delete temp address only | Worker KV cleanup, local data preserved | ✓ |
| Delete everything | KV + local data wiped | |

**User's choice:** Delete temp address only

---

## Welcome Screen Changes

### Temp Address Display

| Option | Description | Selected |
|--------|-------------|----------|
| Address + brief explanation | Show address with trust-building message | ✓ |
| Just address | Display without context | |
| Full workflow explainer | Multi-step visual | |

**User's choice:** Address + brief explanation

### Returning Users

| Option | Description | Selected |
|--------|-------------|----------|
| Show in resume section | Resume section includes temp address | ✓ |
| New campaigns only | Returning users don't see it | |

**User's choice:** Show in resume section

---

## Demo Mode Integration

### Relay Simulation

| Option | Description | Selected |
|--------|-------------|----------|
| Simulate relay responses | Full relay flow with fake payloads and delays | ✓ |
| Keep existing demo path | Continue with console.log simulation | |

**User's choice:** Simulate relay responses

---

## Claude's Discretion

- Delay between relay sends
- Progress modal visual design
- STATUS.FAILED color mapping

## Deferred Ideas

None — discussion stayed within phase scope
