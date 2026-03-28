---
phase: 1
slug: app-shell-and-distribution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser verification (no test framework needed for Phase 1 — shell + build validation) |
| **Config file** | none — no test framework for Phase 1 |
| **Quick run command** | `pnpm build && test -f dist/Erasure-Kit/erasure-kit.html` |
| **Full suite command** | `pnpm build && test -f dist/Erasure-Kit/erasure-kit.html && test -f dist/Erasure-Kit/brokers.json && test -f dist/Erasure-Kit/README.md` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm build && test -f dist/Erasure-Kit/erasure-kit.html`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | DIST-02 | file check | `test -f src/index.html` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | DIST-03 | file check | `test -f src/brokers.json` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | DIST-01 | build | `pnpm build && test -f dist/Erasure-Kit/erasure-kit.html` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — project init with Preact + Vite dev deps
- [ ] `src/index.html` — entry HTML with CDN imports for dev mode
- [ ] `brokers.json` — stub broker data file

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App shell renders with stepper navigation | DIST-02 | Visual UI check | Open src/index.html in Chrome, verify stepper with 4 steps visible |
| Dark/light mode toggle works | CONTEXT D-06 | Visual UI check | Click theme toggle, verify colors change |
| Welcome screen shows on first load | CONTEXT D-12 | Visual UI check | Open app, verify welcome content and Get Started button |
| Production build opens from file:// | DIST-01 | Browser behavior | Double-click dist/Erasure-Kit/erasure-kit.html, verify app loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
