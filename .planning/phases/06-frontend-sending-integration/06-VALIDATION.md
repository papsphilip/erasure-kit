---
phase: 6
slug: frontend-sending-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | RELAY-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | RELAY-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | STAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | STAT-04, STAT-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | RELAY-04 | manual | browser test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/relay-client.test.js` — stubs for RELAY-05 (relay API calls)
- [ ] `tests/email-sender.test.js` — update existing stubs for RELAY-04 (batch send via relay)
- [ ] `tests/status-tracker.test.js` — update existing stubs for STAT-01 (FAILED status)

*Existing test infrastructure (vitest 3.x) covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Progress modal blocks navigation during send | RELAY-04 | DOM overlay behavior | Click Send All, try to click Stepper navigation — should be blocked |
| Rate limit countdown displays and auto-resumes | RELAY-04 | Requires Worker rate limit response | Use demo mode (simulates rate limits) — verify countdown appears |
| End Campaign deletes temp address via Worker | RELAY-05 | Requires network call to Worker | Click End Campaign, verify toast notification, check campaign.settings.ended |
| Temp address shown on Welcome screen | RELAY-05 | Visual verification | Start new campaign, check Welcome screen shows @erasurekit.uk address |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
