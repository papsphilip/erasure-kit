---
phase: 5
slug: sending-and-status-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + jsdom |
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
| 05-01-01 | 01 | 1 | SEND-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | SEND-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | SEND-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | SEND-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | STAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | STAT-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | STAT-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-04 | 02 | 1 | STAT-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-05 | 02 | 1 | STAT-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/sending.test.js` — stubs for SEND-01 through SEND-04 (mailto URI generation, batch-send flow, clipboard fallback, send confirmation)
- [ ] `src/__tests__/status-tracking.test.js` — stubs for STAT-01 through STAT-05 (status lifecycle, transitions, dashboard aggregation, progress calculation)
- [ ] `src/__tests__/campaign-schema-v3.test.js` — stubs for schema migration v2→v3

*Existing vitest infrastructure (63 tests passing) covers phases 1-4. New test files needed for phase 5 requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| mailto: link opens email client | SEND-01 | Browser-level intent, cannot test in jsdom | Click send button → verify email client opens with correct recipient/subject/body |
| Clipboard copy fallback | SEND-03 | navigator.clipboard requires user gesture + secure context | Click copy button → paste into text editor → verify template content |
| Batch-send sequential flow | SEND-02 | Requires real mailto: handler interaction | Click "Send All" → confirm each broker in sequence → verify all marked as sent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
