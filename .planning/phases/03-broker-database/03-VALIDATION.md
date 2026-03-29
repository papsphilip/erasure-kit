---
phase: 3
slug: broker-database
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom environment) |
| **Config file** | vitest.config.js (exists from Phase 2) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | BRKR-01 | unit | `npx vitest run src/lib/brokers-loader.test.js -t "loads brokers"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | BRKR-02 | unit | `npx vitest run src/lib/brokers-loader.test.js -t "100+ entries"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | BRKR-03 | unit | `npx vitest run src/lib/brokers-state.test.js -t "schema validation"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | BRKR-04 | unit | `npx vitest run src/lib/brokers-state.test.js -t "filtering"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | BRKR-05 | unit | `npx vitest run src/lib/campaign.test.js -t "broker selection"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | BRKR-06 | unit | `npx vitest run src/lib/brokers-state.test.js -t "tempEmailAccepted"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/brokers-loader.test.js` — Test loading, parsing, fallback, 100+ count, schema
- [ ] `src/lib/brokers-state.test.js` — Test filtering, sorting, computed signals, tempEmailAccepted
- [ ] `src/lib/campaign.test.js` — Extend with broker selection helper tests (select, deselect, toggle, bulk, deselectAll)

*Vitest already installed from Phase 2.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sticky toolbar stays visible during scroll | BRKR-04 | CSS sticky behavior, layout-dependent | Open Brokers page, scroll through 100+ rows, verify toolbar pins to top |
| Expand/collapse row shows broker details | BRKR-03 | DOM interaction + visual layout | Click broker row, verify email/URL/framework/notes appear below row |
| Temp email warning icon renders with tooltip | BRKR-06 | Visual indicator + tooltip | Find broker with tempEmailAccepted=false, hover warning icon, verify tooltip |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
