---
phase: 2
slug: identity-input-and-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | None — Wave 0 installs |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | INFRA | unit | `pnpm test` | No — Wave 0 | ⬜ pending |
| 02-01-02 | 01 | 1 | IDEN-01 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-01-03 | 01 | 1 | IDEN-02 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-01-04 | 01 | 1 | IDEN-03 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-01-05 | 01 | 1 | PERS-04 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-02-01 | 02 | 1 | PERS-01 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-02-02 | 02 | 1 | PERS-02 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-02-03 | 02 | 1 | PERS-03 | unit | `pnpm test -- --run src/lib/campaign.test.js` | No — Wave 0 | ⬜ pending |
| 02-02-04 | 02 | 1 | IDEN-04 | manual-only | Verify no fetch/XHR in campaign.js | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.js` — Vitest config with jsdom environment, Preact + HTM support
- [ ] `src/lib/campaign.test.js` — test stubs for IDEN-01, IDEN-02, IDEN-03, PERS-01, PERS-02, PERS-03, PERS-04
- [ ] Mock for `browser-fs-access` in test environment (fileSave/fileOpen)
- [ ] Mock for `localStorage` (vitest jsdom provides this)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No network calls from campaign module | IDEN-04 | Architecture constraint — verify no fetch/XHR in source | Grep `src/lib/campaign.js` for `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`. Must find zero matches. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
